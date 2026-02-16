import Link from "next/link";

const TEMPLATES = [
  {
    id: "assistant",
    emoji: "🤖",
    name: "Personal Assistant",
    desc: "A helpful general-purpose assistant that remembers context and helps with daily tasks.",
  },
  {
    id: "english-tutor",
    emoji: "🗣️",
    name: "English Tutor",
    desc: "Practice English conversation daily with corrections and progress tracking.",
  },
  {
    id: "fitness-coach",
    emoji: "💪",
    name: "Fitness Coach",
    desc: "Daily workout reminders, nutrition tips, and accountability partner.",
  },
  {
    id: "study-buddy",
    emoji: "📚",
    name: "Study Buddy",
    desc: "Helps you learn any topic with spaced repetition and quizzes.",
  },
  {
    id: "journal",
    emoji: "📝",
    name: "Daily Journal",
    desc: "Guided journaling prompts every morning and evening reflections.",
  },
  {
    id: "custom",
    emoji: "✨",
    name: "Custom Agent",
    desc: "Describe what you want and we'll create it for you.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent" />
        <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🦀</span>
            <span className="text-xl font-bold">AnyClaw</span>
          </div>
          <div className="flex gap-4">
            <Link href="/login" className="btn-secondary text-sm">
              Log in
            </Link>
            <Link href="/create" className="btn-primary text-sm">
              Create Agent
            </Link>
          </div>
        </nav>

        <div className="relative mx-auto max-w-4xl px-6 pb-24 pt-20 text-center">
          <div className="mb-6 inline-block rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-sm text-cyan-400">
            Powered by OpenClaw
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
            Your AI Agent on WhatsApp.
            <br />
            <span className="text-cyan-400">3 clicks. Done.</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-zinc-400">
            Pick a template, give it a name, scan a QR code. Your personal AI
            agent starts working for you on WhatsApp — 24/7.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/create" className="btn-primary text-lg">
              Create Your Agent
            </Link>
            <Link href="#templates" className="btn-secondary text-lg">
              See Templates
            </Link>
          </div>
        </div>
      </header>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">How it works</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "Pick a template",
              desc: "Choose from pre-built agents or describe your own.",
              icon: "🎯",
            },
            {
              step: "2",
              title: "Customize",
              desc: "Name your agent, set its personality and rules.",
              icon: "⚙️",
            },
            {
              step: "3",
              title: "Scan & Go",
              desc: "Scan the QR code with WhatsApp. Your agent is live.",
              icon: "📱",
            },
          ].map((s) => (
            <div key={s.step} className="card text-center">
              <div className="mb-4 text-4xl">{s.icon}</div>
              <div className="mb-2 text-sm font-medium text-cyan-400">
                Step {s.step}
              </div>
              <h3 className="mb-2 text-xl font-semibold">{s.title}</h3>
              <p className="text-zinc-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Templates */}
      <section id="templates" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-4 text-center text-3xl font-bold">
          Agent Templates
        </h2>
        <p className="mb-12 text-center text-zinc-400">
          Start with a template or build from scratch
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => (
            <Link
              key={t.id}
              href={`/create?template=${t.id}`}
              className="card group cursor-pointer hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/5"
            >
              <div className="mb-3 text-3xl">{t.emoji}</div>
              <h3 className="mb-2 text-lg font-semibold group-hover:text-cyan-400 transition-colors">
                {t.name}
              </h3>
              <p className="text-sm text-zinc-400">{t.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12 text-center text-sm text-zinc-500">
        <p>
          AnyClaw — Built by{" "}
          <a
            href="https://github.com/nrubio1985"
            className="text-zinc-400 hover:text-white"
          >
            @nrubio1985
          </a>
        </p>
      </footer>
    </div>
  );
}
