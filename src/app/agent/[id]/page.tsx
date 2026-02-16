"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Agent {
  id: string; name: string; template_id: string; status: string;
  personality: string; rules: string; created_at: string; config_json: string;
}

interface UsageData {
  daily: { date: string; messages_in: number; messages_out: number; tokens_used: number }[];
  totals: { total_messages_in: number; total_messages_out: number; total_tokens: number };
}

const statusStyle: Record<string, string> = {
  created: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  linking: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  paused: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function AgentPage() {
  const params = useParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [identity, setIdentity] = useState("");
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState("");
  const [showIdentity, setShowIdentity] = useState(false);

  const fetchAgent = useCallback(() => {
    fetch(`/api/agents/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setAgent(data.agent);
        if (data.agent?.config_json) {
          const config = JSON.parse(data.agent.config_json);
          setIdentity(config.identity || "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    fetchAgent();
    fetch(`/api/agents/${params.id}/usage`).then((r) => r.json()).then(setUsage).catch(() => {});
  }, [params.id, fetchAgent]);

  const handleProvision = async () => {
    setProvisioning(true);
    setProvisionError("");
    try {
      const res = await fetch(`/api/agents/${params.id}/provision`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Provisioning failed");
      fetchAgent();
    } catch (e: unknown) {
      setProvisionError((e as Error).message);
    } finally {
      setProvisioning(false);
    }
  };

  if (loading) return <div className="min-h-dvh flex items-center justify-center"><div className="text-zinc-500 text-sm">Loading...</div></div>;
  if (!agent) return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-xl font-bold mb-3 md:text-2xl">Agent not found</h1>
        <Link href="/" className="btn-primary">Go home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh flex flex-col">
      <nav className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
        <div className="nav-container">
          <Link href="/dashboard" className="flex items-center gap-1.5">
            <span className="text-xl md:text-2xl">🦀</span>
            <span className="text-lg font-bold md:text-xl">AnyClaw</span>
          </Link>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium md:px-3 md:text-xs ${
            statusStyle[agent.status] || statusStyle.created
          }`}>{agent.status}</span>
        </div>
      </nav>

      <div className="flex-1 container-responsive py-6 md:py-10 space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{agent.name}</h1>
          <p className="text-xs text-zinc-500 mt-1 md:text-sm md:mt-2">
            {agent.template_id} &middot; {new Date(agent.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Status CTA */}
        {agent.status === "created" && (
          <div className="card text-center !py-8 md:!py-12 md:max-w-lg md:mx-auto">
            <div className="text-3xl mb-3 md:text-4xl md:mb-4">📱</div>
            <h3 className="text-base font-semibold mb-1 md:text-lg">Ready to connect</h3>
            <p className="text-zinc-400 text-xs mb-4 md:text-sm md:mb-6">Provision your agent on OpenClaw and connect WhatsApp.</p>
            <button onClick={handleProvision} disabled={provisioning}
              className="btn-primary disabled:opacity-30">
              {provisioning ? "Provisioning..." : "🚀 Activate Agent"}
            </button>
            {provisionError && <p className="text-xs text-red-400 mt-2 md:text-sm">{provisionError}</p>}
          </div>
        )}

        {agent.status === "linking" && (
          <div className="card text-center !py-8 md:!py-12 md:max-w-lg md:mx-auto">
            <div className="text-3xl mb-3 md:text-4xl md:mb-4">⏳</div>
            <h3 className="text-base font-semibold mb-1 md:text-lg">Waiting for WhatsApp</h3>
            <p className="text-zinc-400 text-xs md:text-sm">Agent provisioned. QR pairing coming soon.</p>
          </div>
        )}

        {agent.status === "active" && (
          <div className="card text-center !py-6 !border-green-500/20 md:!py-10 md:max-w-lg md:mx-auto">
            <div className="text-3xl mb-2 md:text-4xl md:mb-3">✅</div>
            <h3 className="text-base font-semibold text-green-400 md:text-lg">Agent is live!</h3>
          </div>
        )}

        {/* Usage + Identity — stacked on mobile, side-by-side on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Usage */}
          {usage && (
            <div className="card">
              <h2 className="text-sm font-bold mb-3 md:text-base md:mb-4">Usage</h2>
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                {[
                  { val: usage.totals.total_messages_in + usage.totals.total_messages_out, label: "Messages" },
                  { val: usage.totals.total_tokens > 1000 ? `${(usage.totals.total_tokens / 1000).toFixed(1)}k` : usage.totals.total_tokens, label: "Tokens" },
                  { val: usage.daily.length, label: "Days" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-center md:p-4">
                    <div className="text-lg font-bold text-cyan-400 md:text-xl">{s.val}</div>
                    <div className="text-[10px] text-zinc-500 md:text-xs">{s.label}</div>
                  </div>
                ))}
              </div>
              {usage.daily.length > 0 && (
                <div className="mt-3 space-y-1 md:mt-4 md:space-y-2">
                  {usage.daily.slice(0, 7).map((d) => (
                    <div key={d.date} className="flex items-center justify-between text-xs md:text-sm">
                      <span className="text-zinc-500">{d.date}</span>
                      <span className="text-zinc-400">{d.messages_in + d.messages_out} msgs</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Identity (collapsible on mobile, expanded on desktop) */}
          <div className="card">
            <button onClick={() => setShowIdentity(!showIdentity)}
              className="w-full flex items-center justify-between md:cursor-default">
              <h2 className="text-sm font-bold md:text-base">Agent Identity</h2>
              <span className="text-zinc-500 text-xs md:hidden">{showIdentity ? "Hide" : "Show"}</span>
            </button>
            {/* Always show on md+, toggle on mobile */}
            <pre className={`mt-3 rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-xs text-zinc-300 overflow-x-auto whitespace-pre-wrap font-mono max-h-80 overflow-y-auto md:block md:max-h-96 md:p-4 md:text-sm ${
              showIdentity ? "block" : "hidden md:block"
            }`}>
              {identity}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
