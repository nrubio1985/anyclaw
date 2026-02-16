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

const templateEmoji: Record<string, string> = {
  assistant: "🤖",
  "english-tutor": "🗣️",
  "fitness-coach": "💪",
  "study-buddy": "📚",
  journal: "📝",
  custom: "✨",
};

const statusColors: Record<string, string> = {
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
      .then((data) => {
        setAgents(data.agents || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🦀</span>
          <span className="text-xl font-bold">AnyClaw</span>
        </Link>
        <Link href="/create" className="btn-primary text-sm">
          + New Agent
        </Link>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Your Agents</h1>

        {loading ? (
          <div className="text-zinc-500">Loading...</div>
        ) : agents.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">🦀</div>
            <h2 className="text-xl font-semibold mb-2">No agents yet</h2>
            <p className="text-zinc-400 mb-6">
              Create your first AI agent in 3 clicks
            </p>
            <Link href="/create" className="btn-primary">
              Create Agent
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/agent/${agent.id}`}
                className="card group hover:border-cyan-500/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">
                    {templateEmoji[agent.template_id] || "🤖"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      statusColors[agent.status] || statusColors.created
                    }`}
                  >
                    {agent.status}
                  </span>
                </div>
                <h3 className="text-lg font-semibold group-hover:text-cyan-400 transition-colors">
                  {agent.name}
                </h3>
                <p className="text-sm text-zinc-500 mt-1">
                  {agent.template_id} &middot;{" "}
                  {new Date(agent.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
