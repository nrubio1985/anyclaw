"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Agent {
  id: string;
  name: string;
  template_id: string;
  status: string;
  personality: string;
  rules: string;
  created_at: string;
  config_json: string;
}

interface UsageData {
  daily: { date: string; messages_in: number; messages_out: number; tokens_used: number }[];
  totals: { total_messages_in: number; total_messages_out: number; total_tokens: number };
}

const statusColors: Record<string, string> = {
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
    // Fetch usage
    fetch(`/api/agents/${params.id}/usage`)
      .then((r) => r.json())
      .then(setUsage)
      .catch(() => {});
  }, [params.id, fetchAgent]);

  const handleProvision = async () => {
    setProvisioning(true);
    setProvisionError("");
    try {
      const res = await fetch(`/api/agents/${params.id}/provision`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Provisioning failed");
      fetchAgent(); // Refresh agent data
    } catch (e: unknown) {
      setProvisionError((e as Error).message);
    } finally {
      setProvisioning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-500">Loading agent...</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Agent not found</h1>
          <Link href="/" className="btn-primary">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🦀</span>
          <span className="text-xl font-bold">AnyClaw</span>
        </Link>
        <Link href="/dashboard" className="btn-secondary text-sm">
          Dashboard
        </Link>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Agent header */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">{agent.name}</h1>
              <p className="text-zinc-400 text-sm mt-1">
                Template: {agent.template_id} &middot; Created:{" "}
                {new Date(agent.created_at).toLocaleDateString()}
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                statusColors[agent.status] || statusColors.created
              }`}
            >
              {agent.status}
            </span>
          </div>

          {/* Connect CTA */}
          {agent.status === "created" && (
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-6 text-center">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-lg font-semibold mb-2">
                Ready to connect WhatsApp
              </h3>
              <p className="text-zinc-400 text-sm mb-4">
                Your agent is configured. Click below to provision it on OpenClaw
                and connect to WhatsApp.
              </p>
              <button
                onClick={handleProvision}
                disabled={provisioning}
                className="btn-primary disabled:opacity-40"
              >
                {provisioning ? "Provisioning..." : "🚀 Activate Agent"}
              </button>
              {provisionError && (
                <p className="text-xs text-red-400 mt-3">{provisionError}</p>
              )}
            </div>
          )}

          {agent.status === "linking" && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-6 text-center">
              <div className="text-4xl mb-4">⏳</div>
              <h3 className="text-lg font-semibold mb-2">
                Waiting for WhatsApp link
              </h3>
              <p className="text-zinc-400 text-sm">
                Agent provisioned on server. QR code pairing will be available shortly.
              </p>
            </div>
          )}

          {agent.status === "active" && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-6 text-center">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-lg font-semibold mb-2 text-green-400">
                Agent is live!
              </h3>
              <p className="text-zinc-400 text-sm">
                Your agent is running and responding to messages on WhatsApp.
              </p>
            </div>
          )}
        </div>

        {/* Usage Stats */}
        {usage && (
          <div className="card mb-6">
            <h2 className="text-xl font-bold mb-4">Usage</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 text-center">
                <div className="text-2xl font-bold text-cyan-400">
                  {usage.totals.total_messages_in + usage.totals.total_messages_out}
                </div>
                <div className="text-xs text-zinc-500 mt-1">Total Messages</div>
              </div>
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 text-center">
                <div className="text-2xl font-bold text-cyan-400">
                  {usage.totals.total_tokens > 1000
                    ? `${(usage.totals.total_tokens / 1000).toFixed(1)}k`
                    : usage.totals.total_tokens}
                </div>
                <div className="text-xs text-zinc-500 mt-1">Tokens Used</div>
              </div>
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 text-center">
                <div className="text-2xl font-bold text-cyan-400">
                  {usage.daily.length}
                </div>
                <div className="text-xs text-zinc-500 mt-1">Active Days</div>
              </div>
            </div>
            {usage.daily.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-zinc-400 mb-2">Recent Activity</h3>
                <div className="space-y-1">
                  {usage.daily.slice(0, 7).map((d) => (
                    <div key={d.date} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">{d.date}</span>
                      <span className="text-zinc-300">
                        {d.messages_in + d.messages_out} msgs &middot;{" "}
                        {d.tokens_used > 1000
                          ? `${(d.tokens_used / 1000).toFixed(1)}k`
                          : d.tokens_used}{" "}
                        tokens
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Identity preview */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Agent Identity</h2>
          <p className="text-xs text-zinc-500 mb-4">
            This is the system prompt that defines your agent&apos;s behavior (IDENTITY.md)
          </p>
          <pre className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 text-sm text-zinc-300 overflow-x-auto whitespace-pre-wrap font-mono">
            {identity}
          </pre>
        </div>
      </div>
    </div>
  );
}
