"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Agent {
  id: string;
  name: string;
  template_id: string;
  status: string;
  created_at: string;
}

const emoji: Record<string, string> = {
  assistant: "🤖", "english-tutor": "🗣️", "fitness-coach": "💪",
  "study-buddy": "📚", journal: "📝", custom: "✨",
};

const statusStyle: Record<string, string> = {
  created: "bg-yellow-500/20 text-yellow-400",
  linking: "bg-blue-500/20 text-blue-400",
  active: "bg-green-500/20 text-green-400",
  paused: "bg-zinc-500/20 text-zinc-400",
  error: "bg-red-500/20 text-red-400",
};

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => { setAgents(data.agents || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-dvh flex flex-col">
      <nav className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-xl">🦀</span>
            <span className="text-lg font-bold">AnyClaw</span>
          </Link>
          <Link href="/create" className="btn-primary !px-3 !py-2 !text-xs">+ New</Link>
        </div>
      </nav>

      <div className="flex-1 mx-auto w-full max-w-lg px-4 py-6">
        <h1 className="text-xl font-bold mb-5">Your Agents</h1>

        {loading ? (
          <div className="text-zinc-500 text-sm text-center py-12">Loading...</div>
        ) : agents.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">🦀</div>
            <h2 className="text-lg font-semibold mb-1">No agents yet</h2>
            <p className="text-zinc-400 text-sm mb-5">Create your first AI agent in 3 clicks</p>
            <Link href="/create" className="btn-primary">Create Agent</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <Link key={agent.id} href={`/agent/${agent.id}`}
                className="card flex items-center gap-4 active:scale-[0.98]">
                <div className="text-2xl flex-shrink-0">{emoji[agent.template_id] || "🤖"}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate">{agent.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {agent.template_id} &middot; {new Date(agent.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0 ${
                  statusStyle[agent.status] || statusStyle.created
                }`}>{agent.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
