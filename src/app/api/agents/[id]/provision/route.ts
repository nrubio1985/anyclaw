import { NextRequest, NextResponse } from "next/server";
import { getDb, Agent } from "@/lib/db/schema";
import { provisionAgent } from "@/lib/openclaw";
import { renderTemplate, TEMPLATES } from "@/lib/templates";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as Agent | undefined;
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.status === "active") {
      return NextResponse.json({ error: "Agent already active" }, { status: 400 });
    }

    // Parse stored config
    const config = JSON.parse(agent.config_json);

    // Render identity
    const identityMd = renderTemplate(agent.template_id, {
      name: config.agentName || agent.name,
      user_name: config.userName || "User",
      personality: config.personality || "",
      rules: config.rules || "",
    });

    // Provision on OpenClaw
    const result = provisionAgent({
      agentId: `anyclaw-${agent.id}`,
      name: agent.name,
      identityMd,
    });

    if (!result.success) {
      db.prepare("UPDATE agents SET status = 'error', updated_at = datetime('now') WHERE id = ?").run(id);
      return NextResponse.json(
        { error: result.error, status: "error" },
        { status: 500 }
      );
    }

    // Update agent status
    db.prepare(
      "UPDATE agents SET status = 'linking', updated_at = datetime('now') WHERE id = ?"
    ).run(id);

    const updated = db.prepare("SELECT * FROM agents WHERE id = ?").get(id);

    return NextResponse.json({
      agent: updated,
      workspace: result.workspacePath,
      message: "Agent provisioned. Waiting for WhatsApp link.",
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Provision error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
