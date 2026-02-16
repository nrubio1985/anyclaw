"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState("");

  const handleSendOTP = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.otp) setDevOtp(data.otp);
      setStep("otp");
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.token) localStorage.setItem("anyclaw_token", data.token);
      router.push("/dashboard");
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <nav className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-center px-4 py-3">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-xl">🦀</span>
            <span className="text-lg font-bold">AnyClaw</span>
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold">{step === "phone" ? "Log in" : "Enter code"}</h1>
            <p className="text-zinc-400 text-sm mt-1">
              {step === "phone" ? "Enter your WhatsApp number" : `Code sent to ${phone}`}
            </p>
          </div>

          {step === "phone" ? (
            <div className="space-y-4">
              <div>
                <label className="label">Phone Number</label>
                <input type="tel" placeholder="+54 9 11 2156-3998" value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                  className="input" autoFocus />
              </div>
              <div>
                <label className="label">Name <span className="text-zinc-500 font-normal">(new accounts)</span></label>
                <input type="text" placeholder="Nahuel" value={name}
                  onChange={(e) => setName(e.target.value)} className="input" />
              </div>
              <button onClick={handleSendOTP} disabled={phone.length < 8 || loading}
                className="btn-primary w-full disabled:opacity-30">
                {loading ? "Sending..." : "Send Code"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {devOtp && (
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-xs text-yellow-400 text-center">
                  Dev mode — OTP: <span className="font-mono font-bold text-sm">{devOtp}</span>
                </div>
              )}
              <div>
                <label className="label">Verification Code</label>
                <input type="text" inputMode="numeric" placeholder="123456" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  maxLength={6} className="input text-center text-xl font-mono tracking-[0.3em]" autoFocus />
              </div>
              <button onClick={handleVerify} disabled={otp.length !== 6 || loading}
                className="btn-primary w-full disabled:opacity-30">
                {loading ? "Verifying..." : "Verify & Login"}
              </button>
              <button onClick={() => { setStep("phone"); setOtp(""); setDevOtp(""); }}
                className="btn-secondary w-full">Change number</button>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-400 text-center">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}
