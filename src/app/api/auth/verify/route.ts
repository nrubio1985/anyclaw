import { NextRequest, NextResponse } from "next/server";
import { verifyOTP, createOrGetUser, createToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { phone, otp, name } = await req.json();

    if (!phone || !otp) {
      return NextResponse.json({ error: "Phone and OTP required" }, { status: 400 });
    }

    const normalized = phone.replace(/\D/g, "");

    if (!verifyOTP(normalized, otp)) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
    }

    const user = createOrGetUser(normalized, name);
    const token = createToken(user);

    const response = NextResponse.json({ user, token });

    // Set token as httpOnly cookie
    response.cookies.set("anyclaw_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
