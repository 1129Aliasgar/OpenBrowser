import Link from "next/link";
import { User, Terminal, Cpu, Globe, Bot, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

export default function HowItWorksFlow() {
  const flowSteps = [
    { label: "Developer", icon: User, desc: "Runs CLI prompt" },
    { label: "CLI", icon: Terminal, desc: "Reads context & files" },
    { label: "Bridge", icon: Cpu, desc: "Fastify server queue" },
    { label: "Extension", icon: Globe, desc: "Chrome SSE connection" },
    { label: "Browser AI", icon: Bot, desc: "ChatGPT / Claude / Gemini" },
    { label: "Terminal", icon: Terminal, desc: "Displays diff & applies" },
  ];

  return (
    <section className="py-24 bg-background border-t border-border relative overflow-hidden">
      {/* Radial Glow Backdrop */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-radial from-[#EE8B50]/20 via-[#EE8B50]/5 to-transparent blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl text-center space-y-12 relative z-10">
        <div className="space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EE8B50]/10 text-[#EE8B50] border border-[#EE8B50]/20 text-xs font-mono font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Architecture Breakdown</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground font-display">
            How <span className="text-[#EE8B50]">OpenBrowser</span> Works
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Connecting your command line to your browser in six automated steps.
          </p>
        </div>

        {/* Flow Cards Step Diagram */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {flowSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                style={{ animationDelay: `${idx * 100}ms` }}
                className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both p-4 rounded-2xl bg-card border border-border hover:border-[#EE8B50]/50 transition-all flex flex-col items-center text-center space-y-2 group shadow-lg"
              >
                <div className="w-10 h-10 rounded-xl bg-popover border border-border group-hover:bg-[#EE8B50] group-hover:text-foreground flex items-center justify-center text-[#EE8B50] transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-xs font-mono text-muted-foreground uppercase">Step 0{idx + 1}</div>
                <div className="font-bold text-foreground text-sm font-display">{step.label}</div>
                <div className="text-[11px] text-muted-foreground leading-tight">{step.desc}</div>
              </div>
            );
          })}
        </div>

        {/* Flow Arrow Summary Banner */}
        <div className="p-6 rounded-3xl bg-card border border-border max-w-3xl mx-auto text-xs sm:text-sm font-mono text-muted-foreground flex flex-wrap items-center justify-center gap-2">
          <span className="text-foreground font-bold">Developer</span>
          <ArrowRight className="w-4 h-4 text-[#EE8B50]" />
          <span className="text-[#EE8B50] font-bold">CLI</span>
          <ArrowRight className="w-4 h-4 text-[#EE8B50]" />
          <span className="text-foreground font-bold">Bridge</span>
          <ArrowRight className="w-4 h-4 text-[#EE8B50]" />
          <span className="text-[#EE8B50] font-bold">Extension</span>
          <ArrowRight className="w-4 h-4 text-[#EE8B50]" />
          <span className="text-foreground font-bold">Browser AI</span>
          <ArrowRight className="w-4 h-4 text-[#EE8B50]" />
          <span className="text-emerald-400 font-bold">Terminal Diff</span>
        </div>

        {/* CTA Button */}
        <div>
          <Link href="/docs/getting-started">
            <button className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#EE8B50] hover:bg-[#D9773F] text-foreground font-bold text-sm sm:text-base shadow-[0_0_25px_rgba(238,139,80,0.35)] transition-all hover:scale-105">
              <span>Read the Documentation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
