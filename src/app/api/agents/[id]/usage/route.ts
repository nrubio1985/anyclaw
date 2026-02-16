import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    // Get agent
    const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(id);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get usage for last 30 days
    const usage = db.prepare(`
      SELECT date, messages_in, messages_out, tokens_used
      FROM agent_usage
      WHERE agent_id = ?
      AND date >= date('now', '-30 days')
      ORDER BY date DESC
    `).all(id);

    // Get totals
    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(messages_in), 0) as total_messages_in,
        COALESCE(SUM(messages_out), 0) as total_messages_out,
        COALESCE(SUM(tokens_used), 0) as total_tokens
      FROM agent_usage
      WHERE agent_id = ?
    `).get(id) as { total_messages_in: number; total_messages_out: number; total_tokens: number };

    return NextResponse.json({
      agentId: id,
      daily: usage,
      totals,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Called by OpenClaw webhook to record usage
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { messages_in = 0, messages_out = 0, tokens_used = 0 } = body;

    const db = getDb();
    const today = new Date().toISOString().split("T")[0];

    db.prepare(`
      INSERT INTO agent_usage (agent_id, date, messages_in, messages_out, tokens_used)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(agent_id, date)
      DO UPDATE SET
        messages_in = messages_in + excluded.messages_in,
        messages_out = messages_out + excluded.messages_out,
        tokens_used = tokens_used + excluded.tokens_used
    `).run(id, today, messages_in, messages_out, tokens_used);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
