import Link from "next/link";

const TEMPLATES = [
  { id: "assistant", emoji: "🤖", name: "Personal Assistant", desc: "Helps with daily tasks and remembers context." },
  { id: "english-tutor", emoji: "🗣️", name: "English Tutor", desc: "Practice conversations with corrections." },
  { id: "fitness-coach", emoji: "💪", name: "Fitness Coach", desc: "Workouts, nutrition, accountability." },
  { id: "study-buddy", emoji: "📚", name: "Study Buddy", desc: "Learn any topic with quizzes." },
  { id: "journal", emoji: "📝", name: "Daily Journal", desc: "Guided prompts and reflections." },
  { id: "custom", emoji: "✨", name: "Custom Agent", desc: "Describe what you want." },
];

export default function Home() {
  return (
    <div className="min-h-dvh flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
        <div className="nav-container">
          <div className="flex items-center gap-1.5">
            <span className="text-xl md:text-2xl">🦀</span>
            <span className="text-lg font-bold md:text-xl">AnyClaw</span>
          </div>
          <div className="flex gap-2">
            <Link href="/login" className="btn-secondary !px-3 !py-2 !text-xs md:!px-4 md:!py-2.5 md:!text-sm">Log in</Link>
            <Link href="/create" className="btn-primary !px-3 !py-2 !text-xs md:!px-4 md:!py-2.5 md:!text-sm">Create</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/8 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-lg md:max-w-2xl lg:max-w-4xl px-4 md:px-6 lg:px-8 pb-10 pt-8 md:pt-16 md:pb-14 lg:pt-20 lg:pb-16 text-center">
          <div className="mb-4 inline-block rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-400 md:text-sm md:px-4">
            Powered by OpenClaw
          </div>
          <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl md:mb-6">
            Your AI Agent
            <br />
            on WhatsApp.
            <br />
            <span className="text-cyan-400">3 clicks. Done.</span>
          </h1>
          <p className="mx-auto mb-6 max-w-sm text-sm text-zinc-400 leading-relaxed md:max-w-lg md:text-base md:mb-8 lg:text-lg">
            Pick a template, give it a name, scan a QR code. Your personal AI agent starts working for you — 24/7.
          </p>
          <Link href="/create" className="btn-primary inline-block md:!px-8 md:!py-4 md:!text-base">Create Your Agent</Link>
        </div>
      </header>

      {/* How it works */}
      <section className="container-responsive py-8 md:py-12 lg:py-16">
        <h2 className="mb-5 text-center text-lg font-bold md:text-2xl md:mb-8">How it works</h2>
        <div className="flex gap-3 md:gap-5 lg:gap-6">
          {[
            { step: "1", title: "Pick", icon: "🎯", desc: "Choose a template" },
            { step: "2", title: "Customize", icon: "⚙️", desc: "Name & personality" },
            { step: "3", title: "Scan & Go", icon: "📱", desc: "QR → WhatsApp live" },
          ].map((s) => (
            <div key={s.step} className="card flex-1 text-center !p-3 md:!p-6 lg:!p-8">
              <div className="text-2xl mb-1 md:text-4xl md:mb-3">{s.icon}</div>
              <div className="text-xs font-medium text-cyan-400 mb-0.5 md:text-sm md:mb-1">Step {s.step}</div>
              <div className="text-sm font-semibold md:text-lg">{s.title}</div>
              <p className="text-xs text-zinc-500 mt-0.5 md:text-sm md:mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Templates */}
      <section id="templates" className="container-responsive py-8 md:py-12 lg:py-16 flex-1">
        <h2 className="mb-1 text-center text-lg font-bold md:text-2xl">Agent Templates</h2>
        <p className="mb-5 text-center text-xs text-zinc-500 md:text-sm md:mb-8">Start with a template or build from scratch</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:gap-5">
          {TEMPLATES.map((t) => (
            <Link key={t.id} href={`/create?template=${t.id}`}
              className="card group active:scale-[0.98] !p-4 md:!p-6">
              <div className="text-2xl mb-1.5 md:text-3xl md:mb-2">{t.emoji}</div>
              <h3 className="text-sm font-semibold group-hover:text-cyan-400 transition-colors md:text-base">{t.name}</h3>
              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed md:text-sm md:mt-1">{t.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-600 md:py-8 md:text-sm">
        <a href="https://github.com/nrubio1985/anyclaw" className="text-zinc-500 hover:text-white transition-colors">AnyClaw on GitHub</a>
      </footer>
    </div>
  );
}
