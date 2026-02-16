"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

const TEMPLATES = [
  { id: "assistant", emoji: "🤖", name: "Personal Assistant" },
  { id: "english-tutor", emoji: "🗣️", name: "English Tutor" },
  { id: "fitness-coach", emoji: "💪", name: "Fitness Coach" },
  { id: "study-buddy", emoji: "📚", name: "Study Buddy" },
  { id: "journal", emoji: "📝", name: "Daily Journal" },
  { id: "custom", emoji: "✨", name: "Custom Agent" },
];

/**
 * Formats a phone number as the user types.
 * Supports: +54 9 11 2156-3998, +1 555 123-4567, +52 55 1234-5678
 */
function formatPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  // Keep the + if present
  if (!digits.startsWith("+") && digits.length === 0) return "";
  const clean = digits.startsWith("+") ? digits : "+" + digits;

  // Argentina: +54 9 XX XXXX-XXXX
  if (clean.startsWith("+54")) {
    const d = clean.slice(3);
    if (d.length <= 1) return `+54 ${d}`;
    if (d.length <= 3) return `+54 ${d.slice(0, 1)} ${d.slice(1)}`;
    if (d.length <= 7) return `+54 ${d.slice(0, 1)} ${d.slice(1, 3)} ${d.slice(3)}`;
    return `+54 ${d.slice(0, 1)} ${d.slice(1, 3)} ${d.slice(3, 7)}-${d.slice(7, 11)}`;
  }

  // Mexico: +52 XX XXXX-XXXX
  if (clean.startsWith("+52")) {
    const d = clean.slice(3);
    if (d.length <= 2) return `+52 ${d}`;
    if (d.length <= 6) return `+52 ${d.slice(0, 2)} ${d.slice(2)}`;
    return `+52 ${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6, 10)}`;
  }

  // US/Canada: +1 XXX XXX-XXXX
  if (clean.startsWith("+1")) {
    const d = clean.slice(2);
    if (d.length <= 3) return `+1 ${d}`;
    if (d.length <= 6) return `+1 ${d.slice(0, 3)} ${d.slice(3)}`;
    return `+1 ${d.slice(0, 3)} ${d.slice(3, 6)}-${d.slice(6, 10)}`;
  }

  // Generic: +CC XXXX XXXX
  if (clean.length <= 4) return clean;
  if (clean.length <= 8) return `${clean.slice(0, clean.length > 3 ? (clean[2] === '4' || clean[2] === '5' ? 3 : 4) : 3)} ${clean.slice(clean.length > 3 ? (clean[2] === '4' || clean[2] === '5' ? 3 : 4) : 3)}`;
  return clean.slice(0, 4) + " " + clean.slice(4, 8) + "-" + clean.slice(8, 12);
}

/** Strips formatting, returns digits only with + prefix */
function cleanPhone(formatted: string): string {
  return formatted.replace(/[^\d+]/g, "");
}

function CreateWizardInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselected = searchParams.get("template") || "";

  const [step, setStep] = useState(preselected ? 2 : 1);
  const [form, setForm] = useState({
    template: preselected,
    agentName: "",
    userName: "",
    userPhone: "",
    personality: "",
    rules: "",
  });
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handlePhoneChange = (value: string) => {
    // If user is deleting, don't reformat
    if (value.length < phoneDisplay.length) {
      setPhoneDisplay(value);
      update("userPhone", cleanPhone(value));
      return;
    }
    const formatted = formatPhone(value);
    setPhoneDisplay(formatted);
    update("userPhone", cleanPhone(formatted));
  };

  const canProceed = () => {
    if (step === 1) return !!form.template;
    if (step === 2) return form.agentName.length >= 2 && form.userName.length >= 2;
    if (step === 3) return cleanPhone(form.userPhone).length >= 10;
    return false;
  };

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create agent");
      router.push(`/agent/${data.agent.id}`);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <nav className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
        <div className="nav-container">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-xl md:text-2xl">🦀</span>
            <span className="text-lg font-bold md:text-xl">AnyClaw</span>
          </Link>
          <span className="text-xs text-zinc-500 md:text-sm">Create Agent</span>
        </div>
      </nav>

      <div className="flex-1 mx-auto w-full max-w-lg md:max-w-2xl px-4 md:px-6 py-6 md:py-10">
        {/* Progress */}
        <div className="mb-6 md:mb-10 flex items-center justify-center gap-2 md:gap-3">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 md:gap-3">
              <div className={`flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full text-xs md:text-sm font-bold transition-all ${
                step >= s ? "bg-cyan-500 text-zinc-950" : "bg-zinc-800 text-zinc-500"
              }`}>{s}</div>
              {s < 3 && <div className={`h-0.5 w-8 md:w-16 lg:w-24 transition-all ${step > s ? "bg-cyan-500" : "bg-zinc-800"}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 className="mb-1 text-xl font-bold text-center md:text-2xl">Choose your agent</h2>
            <p className="mb-5 text-center text-sm text-zinc-400 md:text-base md:mb-8">What do you want your AI to do?</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              {TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => update("template", t.id)}
                  className={`card text-left active:scale-[0.97] !p-4 md:!p-5 cursor-pointer ${
                    form.template === t.id ? "!border-cyan-500 bg-cyan-500/5 shadow-lg shadow-cyan-500/10" : ""
                  }`}>
                  <div className="text-xl mb-1 md:text-2xl md:mb-2">{t.emoji}</div>
                  <div className="text-sm font-medium md:text-base">{t.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="md:max-w-md md:mx-auto">
            <h2 className="mb-1 text-xl font-bold text-center md:text-2xl">Customize</h2>
            <p className="mb-5 text-center text-sm text-zinc-400 md:text-base md:mb-8">Give it a name and personality</p>
            <div className="space-y-4 md:space-y-5">
              <div>
                <label className="label">Agent Name</label>
                <input type="text" placeholder="e.g. Luna, Max, Coach..." value={form.agentName}
                  onChange={(e) => update("agentName", e.target.value)} className="input" autoFocus />
              </div>
              <div>
                <label className="label">Your Name</label>
                <input type="text" placeholder="So your agent knows who you are" value={form.userName}
                  onChange={(e) => update("userName", e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Personality <span className="text-zinc-500 font-normal">(optional)</span></label>
                <textarea placeholder="e.g. Friendly and casual. Responds in Spanish."
                  value={form.personality} onChange={(e) => update("personality", e.target.value)}
                  rows={2} className="input resize-none" />
              </div>
              <div>
                <label className="label">Rules <span className="text-zinc-500 font-normal">(optional)</span></label>
                <textarea placeholder="e.g. Never talk about politics."
                  value={form.rules} onChange={(e) => update("rules", e.target.value)}
                  rows={2} className="input resize-none" />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="md:max-w-md md:mx-auto">
            <h2 className="mb-1 text-xl font-bold text-center md:text-2xl">Connect WhatsApp</h2>
            <p className="mb-5 text-center text-sm text-zinc-400 md:text-base md:mb-8">Your phone number for agent access</p>
            <div>
              <label className="label">WhatsApp Number</label>
              <input type="tel" placeholder="+54 9 11 2156-3998" value={phoneDisplay}
                onChange={(e) => handlePhoneChange(e.target.value)} className="input" autoFocus />
              <p className="mt-2 text-xs text-zinc-500 md:text-sm">
                Your agent will only respond to messages from this number.
              </p>
              {form.userPhone && cleanPhone(form.userPhone).length >= 10 && (
                <p className="mt-1.5 text-xs text-cyan-500/70 font-mono">
                  {cleanPhone(form.userPhone)}
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
        )}
      </div>

      {/* Sticky bottom on mobile, centered on desktop */}
      <div className="sticky bottom-0 border-t border-zinc-800/50 bg-zinc-950/90 backdrop-blur-xl px-4 py-4 md:py-5">
        <div className="mx-auto max-w-lg md:max-w-md flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="btn-secondary flex-1">Back</button>
          )}
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canProceed()}
              className="btn-primary flex-1 disabled:opacity-30 disabled:cursor-not-allowed">Continue</button>
          ) : (
            <button onClick={handleCreate} disabled={!canProceed() || loading}
              className="btn-primary flex-1 disabled:opacity-30 disabled:cursor-not-allowed">
              {loading ? "Creating..." : "🚀 Create Agent"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh flex items-center justify-center"><div className="text-zinc-500 text-sm">Loading...</div></div>}>
      <CreateWizardInner />
    </Suspense>
  );
}
