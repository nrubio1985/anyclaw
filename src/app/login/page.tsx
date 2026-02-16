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
      if (data.otp) setDevOtp(data.otp); // Dev mode
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
      // Store token in localStorage as backup
      if (data.token) localStorage.setItem("anyclaw_token", data.token);
      router.push("/dashboard");
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span className="text-3xl">🦀</span>
            <span className="text-2xl font-bold">AnyClaw</span>
          </Link>
          <h1 className="text-2xl font-bold">
            {step === "phone" ? "Log in" : "Enter code"}
          </h1>
          <p className="text-zinc-400 mt-2">
            {step === "phone"
              ? "Enter your WhatsApp number"
              : `We sent a code to ${phone}`}
          </p>
        </div>

        {step === "phone" ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+54 9 11 2156-3998"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                Your Name <span className="text-zinc-500">(for new accounts)</span>
              </label>
              <input
                type="text"
                placeholder="Nahuel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <button
              onClick={handleSendOTP}
              disabled={phone.length < 8 || loading}
              className="btn-primary w-full disabled:opacity-40"
            >
              {loading ? "Sending..." : "Send Code"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {devOtp && (
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
                Dev mode — OTP: <span className="font-mono font-bold">{devOtp}</span>
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                Verification Code
              </label>
              <input
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                maxLength={6}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-2xl font-mono tracking-widest text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <button
              onClick={handleVerify}
              disabled={otp.length !== 6 || loading}
              className="btn-primary w-full disabled:opacity-40"
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
            <button
              onClick={() => { setStep("phone"); setOtp(""); setDevOtp(""); }}
              className="btn-secondary w-full"
            >
              Change number
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
