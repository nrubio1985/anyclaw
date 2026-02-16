"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

const TEMPLATES = [
  { id: "assistant", emoji: "🤖", name: "Personal Assistant" },
  { id: "english-tutor", emoji: "🗣️", name: "English Tutor" },
  { id: "fitness-coach", emoji: "💪", name: "Fitness Coach" },
  { id: "study-buddy", emoji: "📚", name: "Study Buddy" },
  { id: "journal", emoji: "📝", name: "Daily Journal" },
  { id: "custom", emoji: "✨", name: "Custom Agent" },
];

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const canProceed = () => {
    if (step === 1) return !!form.template;
    if (step === 2) return form.agentName.length >= 2 && form.userName.length >= 2;
    if (step === 3) return form.userPhone.length >= 8;
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
      const err = e as Error;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xl">
        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                  step >= s
                    ? "bg-cyan-500 text-zinc-950"
                    : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`h-0.5 w-12 transition-all ${
                    step > s ? "bg-cyan-500" : "bg-zinc-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Template */}
        {step === 1 && (
          <div>
            <h2 className="mb-2 text-2xl font-bold text-center">
              Choose your agent type
            </h2>
            <p className="mb-8 text-center text-zinc-400">
              What do you want your AI to do?
            </p>
            <div className="grid grid-cols-2 gap-4">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => update("template", t.id)}
                  className={`card text-left transition-all ${
                    form.template === t.id
                      ? "border-cyan-500 bg-cyan-500/5 shadow-lg shadow-cyan-500/10"
                      : ""
                  }`}
                >
                  <div className="text-2xl mb-2">{t.emoji}</div>
                  <div className="font-medium">{t.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Customize */}
        {step === 2 && (
          <div>
            <h2 className="mb-2 text-2xl font-bold text-center">
              Customize your agent
            </h2>
            <p className="mb-8 text-center text-zinc-400">
              Give it a name and personality
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Agent Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Luna, Max, Coach..."
                  value={form.agentName}
                  onChange={(e) => update("agentName", e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Your Name
                </label>
                <input
                  type="text"
                  placeholder="So your agent knows who you are"
                  value={form.userName}
                  onChange={(e) => update("userName", e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Personality{" "}
                  <span className="text-zinc-500">(optional)</span>
                </label>
                <textarea
                  placeholder="e.g. Friendly and casual, uses humor. Responds in Spanish."
                  value={form.personality}
                  onChange={(e) => update("personality", e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Custom Rules{" "}
                  <span className="text-zinc-500">(optional)</span>
                </label>
                <textarea
                  placeholder="e.g. Never talk about politics. Always suggest healthy options."
                  value={form.rules}
                  onChange={(e) => update("rules", e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Connect */}
        {step === 3 && (
          <div>
            <h2 className="mb-2 text-2xl font-bold text-center">
              Connect WhatsApp
            </h2>
            <p className="mb-8 text-center text-zinc-400">
              Your phone number for agent access
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                WhatsApp Phone Number
              </label>
              <input
                type="tel"
                placeholder="+54 9 11 2156-3998"
                value={form.userPhone}
                onChange={(e) => update("userPhone", e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <p className="mt-2 text-xs text-zinc-500">
                We&apos;ll send you a QR code to link your WhatsApp in the next step.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex gap-4">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="btn-secondary flex-1"
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={!canProceed() || loading}
              className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-zinc-500">Loading...</div>
        </div>
      }
    >
      <CreateWizardInner />
    </Suspense>
  );
}
