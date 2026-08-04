import Link from "next/link";
import Image from "next/image";
import { Terminal, Sparkles, ArrowRight, Code, Layers, Bot, Globe } from "lucide-react";
import { HeroCopyButton } from "./hero-copy-button";

export default function Hero() {
  const marqueeItems = [
    { title: "CLI Ask & Agent Engine", code: "openbrowser agent \"Refactor API route\"", icon: Terminal, type: "CLI Demo" },
    { title: "ChatGPT & Claude Extension Bridge", code: "SSE stream active on :5000", icon: Globe, type: "Browser Bridge" },
    { title: "Unified Diff Inspector", code: "1 file changed, +14 insertions(-)", icon: Code, type: "Diff Preview" },
    { title: "Local Context Engine (@files)", code: "@src/server @src/types.ts", icon: Layers, type: "Context Scanner" },
    { title: "DeepSeek & Gemini Multi-Model", code: "Claiming job_94f8a2 on tab", icon: Bot, type: "AI Session" },
  ];

  return (
    <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 bg-background">
      {/* Subtle Glow Background Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-radial from-[#EE8B50]/20 via-[#EE8B50]/5 to-transparent blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl relative z-10 text-center space-y-8">
        {/* Top OpenBrowser Logo Mark */}
        <div className="flex justify-center transition-all duration-500 ease-in-out opacity-100 translate-y-0">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-card border border-border shadow-xl backdrop-blur-md">
            <div className="w-5 h-5 flex items-center justify-center">
              <Image src="/assets/favicon.svg" alt="OpenBrowser" width={20} height={20} className="w-full h-full object-contain" priority />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#EE8B50] font-mono">
              Open Source • Local First • No API Keys
            </span>
          </div>
        </div>

        {/* Main Heading */}
        <div className="space-y-4 max-w-4xl mx-auto transition-all duration-500 ease-in-out opacity-100 translate-y-0 delay-100">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1] font-display">
            Turn <span className="text-[#EE8B50] underline decoration-[#EE8B50]/30 underline-offset-8">Browser AI</span> into your{" "}
            <span className="text-gradient-orange">Local Coding Agent</span>.
          </h1>

          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-normal pt-2">
            Use your existing ChatGPT, Claude, Gemini, DeepSeek or Grok browser subscription directly from your terminal.{" "}
            <strong className="text-foreground font-medium">No API keys. No additional AI billing.</strong> Just connect your browser and start building.
          </p>
        </div>

        {/* Quick Copy Shell Command Bar */}
        <div className="max-w-xl mx-auto transition-all duration-500 ease-in-out opacity-100 translate-y-0 delay-200">
          <HeroCopyButton />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2 transition-all duration-500 ease-in-out opacity-100 translate-y-0 delay-300">
          <Link href="/docs/getting-started">
            <button className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#EE8B50] hover:bg-[#D9773F] text-foreground font-bold text-sm sm:text-base shadow-[0_0_25px_rgba(238,139,80,0.35)] transition-all transform hover:scale-[1.02]">
              <Sparkles className="w-4 h-4" />
              <span>Get Started</span>
            </button>
          </Link>
          <Link href="/docs/getting-started">
            <button className="flex items-center gap-2 px-7 py-3.5 rounded-full bg-transparent border border-white/10 hover:border-[#EE8B50] hover:bg-[#EE8B50]/10 text-foreground font-semibold text-sm sm:text-base transition-all">
              <span>View Documentation</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </Link>
        </div>
      </div>

      {/* SECTION 2: HERO SHOWCASE MARQUEE */}
      <div className="mt-16 pt-8 border-t border-border/50 overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div className="flex gap-6 animate-marquee-slow hover:[animation-play-state:paused]">
          {[...marqueeItems, ...marqueeItems].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="w-80 sm:w-96 p-5 rounded-2xl bg-card border border-border shrink-0 space-y-3 hover:border-[#EE8B50]/50 transition-colors shadow-lg"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-[#EE8B50] font-semibold">
                    <Icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-popover text-muted-foreground font-mono text-[10px] border border-border">
                    {item.type}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-background font-mono text-xs text-muted-foreground border border-border/80 flex items-center justify-between">
                  <span className="text-[#EE8B50] font-bold">$</span>
                  <span className="truncate ml-2">{item.code}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
