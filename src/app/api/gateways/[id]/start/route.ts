import { NextRequest, NextResponse } from "next/server";
import { installAndStartGateway } from "@/lib/gateway-manager";

/**
 * POST /api/gateways/:id/start — Install systemd service and start gateway
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = installAndStartGateway(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ message: result.output, status: "pairing" });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
