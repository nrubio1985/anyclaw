import { NextRequest, NextResponse } from "next/server";
import { getQrCode } from "@/lib/gateway-manager";

/**
 * GET /api/gateways/:id/qr — Get QR code for WhatsApp pairing
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = getQrCode(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      qr: result.qr || null,
      status: result.status,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
