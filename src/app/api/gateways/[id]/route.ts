import { NextRequest, NextResponse } from "next/server";
import { getGatewayStatus, removeGateway } from "@/lib/gateway-manager";
import { getDb } from "@/lib/db/schema";

/**
 * GET /api/gateways/:id — Get gateway info + live status
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const gateway = db
      .prepare("SELECT * FROM gateways WHERE id = ?")
      .get(id);

    if (!gateway) {
      return NextResponse.json({ error: "Gateway not found" }, { status: 404 });
    }

    // Get live status
    const status = getGatewayStatus(id);

    return NextResponse.json({
      gateway: {
        ...gateway,
        ...(status.success
          ? {
              status: status.status,
              phone: status.phone,
              serviceActive: status.serviceActive,
            }
          : {}),
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/**
 * DELETE /api/gateways/:id — Remove a gateway
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = removeGateway(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ message: "Gateway removed" });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
