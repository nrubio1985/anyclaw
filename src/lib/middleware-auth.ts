import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export function withAuth(
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    // Check cookie first, then Authorization header
    const cookieToken = req.cookies.get("anyclaw_token")?.value;
    const headerToken = req.headers.get("authorization")?.replace("Bearer ", "");
    const token = cookieToken || headerToken;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return handler(req, payload.userId);
  };
}
