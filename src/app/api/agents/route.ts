import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/schema";
import { renderTemplate, TEMPLATES } from "@/lib/templates";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { template, agentName, userName, userPhone, personality, rules } = body;

    // Validate
    if (!template || !TEMPLATES[template]) {
      return NextResponse.json({ error: "Invalid template" }, { status: 400 });
    }
    if (!agentName || agentName.length < 2) {
      return NextResponse.json({ error: "Agent name required" }, { status: 400 });
    }
    if (!userName || userName.length < 2) {
      return NextResponse.json({ error: "Your name is required" }, { status: 400 });
    }
    if (!userPhone || userPhone.length < 8) {
      return NextResponse.json({ error: "Valid phone number required" }, { status: 400 });
    }

    const db = getDb();

    // Normalize phone
    const phone = userPhone.replace(/\D/g, "");

    // Upsert user
    const userId = nanoid(12);
    db.prepare(`
      INSERT INTO users (id, phone, name) VALUES (?, ?, ?)
      ON CONFLICT(phone) DO UPDATE SET name = excluded.name, last_seen = datetime('now')
    `).run(userId, phone, userName);

    // Get actual user id (might be existing)
    const user = db.prepare("SELECT id FROM users WHERE phone = ?").get(phone) as { id: string };

    // Render identity from template
    const identityMd = renderTemplate(template, {
      name: agentName,
      user_name: userName,
      personality: personality || "",
      rules: rules || "",
    });

    // Create agent
    const agentId = nanoid(12);
    const config = {
      identity: identityMd,
      template: template,
      templateConfig: TEMPLATES[template],
      agentName,
      userName,
      personality,
      rules,
    };

    db.prepare(`
      INSERT INTO agents (id, user_id, name, template_id, personality, rules, config_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(agentId, user.id, agentName, template, personality || "", rules || "", JSON.stringify(config));

    const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(agentId);

    return NextResponse.json({ agent, identityMd }, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Create agent error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = getDb();
    const agents = db.prepare("SELECT * FROM agents ORDER BY created_at DESC").all();
    return NextResponse.json({ agents });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
