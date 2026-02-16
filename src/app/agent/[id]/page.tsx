"use client";

import { useEffect, useState } from "react";
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

export default function AgentPage() {
  const params = useParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [identity, setIdentity] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  const statusColors: Record<string, string> = {
    created: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    linking: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    paused: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    error: "bg-red-500/20 text-red-400 border-red-500/30",
  };

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
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">{agent.name}</h1>
              <p className="text-zinc-400 text-sm mt-1">
                Template: {agent.template_id} | Created:{" "}
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

          {agent.status === "created" && (
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-6 text-center">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-lg font-semibold mb-2">
                Ready to connect WhatsApp
              </h3>
              <p className="text-zinc-400 text-sm mb-4">
                Your agent is configured. Click below to get the QR code and link
                it to WhatsApp.
              </p>
              <button className="btn-primary">Generate QR Code</button>
              <p className="text-xs text-zinc-500 mt-3">
                This will start an OpenClaw session for your agent on our server.
              </p>
            </div>
          )}
        </div>

        {/* Identity preview */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Agent Identity (IDENTITY.md)</h2>
          <p className="text-xs text-zinc-500 mb-4">
            This is the system prompt that defines your agent&apos;s behavior
          </p>
          <pre className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 text-sm text-zinc-300 overflow-x-auto whitespace-pre-wrap font-mono">
            {identity}
          </pre>
        </div>
      </div>
    </div>
  );
}
