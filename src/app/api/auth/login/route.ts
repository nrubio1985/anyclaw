import { NextRequest, NextResponse } from "next/server";
import { generateOTP, storeOTP } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || phone.replace(/\D/g, "").length < 8) {
      return NextResponse.json({ error: "Valid phone number required" }, { status: 400 });
    }

    const otp = generateOTP();
    const normalized = phone.replace(/\D/g, "");
    storeOTP(normalized, otp);

    // In MVP: log OTP to console (in production, send via WhatsApp/SMS)
    console.log(`[AUTH] OTP for ${normalized}: ${otp}`);

    // TODO: Send OTP via WhatsApp using OpenClaw
    // openclaw message send --target +${normalized} --message "Your AnyClaw code: ${otp}"

    return NextResponse.json({
      message: "OTP sent",
      // Include OTP in dev mode for testing
      ...(process.env.NODE_ENV !== "production" && { otp }),
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
