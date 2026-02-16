import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/schema";
import { createGateway } from "@/lib/gateway-manager";

/**
 * POST /api/gateways — Create a gateway for a user
 * Body: { userId }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const result = createGateway(userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ gateway: result.gateway }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/**
 * GET /api/gateways — List all gateways
 */
export async function GET() {
  try {
    const db = getDb();
    const gateways = db
      .prepare("SELECT * FROM gateways ORDER BY created_at DESC")
      .all();
    return NextResponse.json({ gateways });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
