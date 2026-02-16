import { NextRequest, NextResponse } from "next/server";
import { getDb, Agent } from "@/lib/db/schema";
import { createAgentWorkspace } from "@/lib/openclaw";
import { renderTemplate, TEMPLATES } from "@/lib/templates";
import {
  getOrCreateGateway,
  installAndStartGateway,
  registerAgentInGateway,
} from "@/lib/gateway-manager";

/**
 * POST /api/agents/:id/provision
 *
 * Multi-gateway provisioning flow:
 * 1. Get or create a gateway for the user
 * 2. Start the gateway if not running
 * 3. Create agent workspace on disk
 * 4. Register agent in the user's gateway
 * 5. Update agent status to 'linking'
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const agent = db
      .prepare("SELECT * FROM agents WHERE id = ?")
      .get(id) as Agent | undefined;
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.status === "active") {
      return NextResponse.json(
        { error: "Agent already active" },
        { status: 400 }
      );
    }

    // Parse stored config
    const config = JSON.parse(agent.config_json);

    // Get user info for phone
    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(agent.user_id) as { id: string; phone: string; name: string } | undefined;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 1. Get or create gateway for user
    const gwResult = getOrCreateGateway(user.id);
    if (!gwResult.success || !gwResult.gateway) {
      db.prepare(
        "UPDATE agents SET status = 'error', updated_at = datetime('now') WHERE id = ?"
      ).run(id);
      return NextResponse.json(
        { error: `Gateway creation failed: ${gwResult.error}` },
        { status: 500 }
      );
    }

    const gateway = gwResult.gateway;

    // 2. Start gateway if not running
    if (gateway.status === "created") {
      const startResult = installAndStartGateway(gateway.id);
      if (!startResult.success) {
        db.prepare(
          "UPDATE agents SET status = 'error', updated_at = datetime('now') WHERE id = ?"
        ).run(id);
        return NextResponse.json(
          { error: `Gateway start failed: ${startResult.error}` },
          { status: 500 }
        );
      }
    }

    // 3. Render identity and create workspace
    const identityMd = renderTemplate(agent.template_id, {
      name: config.agentName || agent.name,
      user_name: config.userName || "User",
      personality: config.personality || "",
      rules: config.rules || "",
    });

    const openclawAgentId = `anyclaw-${agent.id}`;
    const workspacePath = createAgentWorkspace({
      agentId: openclawAgentId,
      name: agent.name,
      identityMd,
    });

    // 4. Register agent in the user's gateway
    const regResult = registerAgentInGateway(
      gateway.id,
      openclawAgentId,
      workspacePath,
      user.phone
    );

    if (!regResult.success) {
      db.prepare(
        "UPDATE agents SET status = 'error', updated_at = datetime('now') WHERE id = ?"
      ).run(id);
      return NextResponse.json(
        { error: regResult.error },
        { status: 500 }
      );
    }

    // 5. Update agent status
    db.prepare(
      "UPDATE agents SET status = 'linking', whatsapp_session = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(gateway.id, id);

    // Refresh
    const updated = db.prepare("SELECT * FROM agents WHERE id = ?").get(id);
    const updatedGw = db
      .prepare("SELECT * FROM gateways WHERE id = ?")
      .get(gateway.id);

    return NextResponse.json({
      agent: updated,
      gateway: updatedGw,
      workspace: workspacePath,
      message:
        "Agent provisioned. Gateway started. Pair WhatsApp by scanning the QR code.",
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Provision error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
