"use client";

import { LazyMotion, domAnimation, m } from "framer-motion";
import { Terminal, Network, Chrome, Cpu, Database, ArrowRight } from "lucide-react";

export default function ArchitectureHero() {
  const cards = [
    { icon: <Terminal className="w-6 h-6" />, label: "CLI", color: "text-[#EE8B50]", bg: "bg-[#EE8B50]/10", border: "border-[#EE8B50]/30" },
    { icon: <Network className="w-6 h-6" />, label: "Bridge", color: "text-[#38BDF8]", bg: "bg-[#38BDF8]/10", border: "border-[#38BDF8]/30" },
    { icon: <Chrome className="w-6 h-6" />, label: "Extension", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30" },
    { icon: <Cpu className="w-6 h-6" />, label: "AI Provider", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/30" },
    { icon: <Database className="w-6 h-6" />, label: "Workspace", color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/30" },
  ];

  return (
    <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#EE8B50]/5 to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        <div className="text-center space-y-6 max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EE8B50]/10 text-[#EE8B50] border border-[#EE8B50]/20 text-xs font-semibold uppercase tracking-wider">
            <Cpu className="w-3.5 h-3.5" />
            <span>System Architecture</span>
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-foreground tracking-tight">
            How OpenBrowser <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EE8B50] to-[#FFB088]">Works</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
            Understand how OpenBrowser orchestrates browser AI, local automation, streaming responses, and intelligent file operations.
          </p>
        </div>

        <LazyMotion features={domAnimation}>
          <div className="relative flex flex-wrap justify-center gap-4 sm:gap-6 lg:gap-8 items-center max-w-5xl mx-auto">
            {cards.map((card, idx) => (
              <div key={card.label} className="flex items-center gap-4 sm:gap-6 lg:gap-8">
                <m.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.15 }}
                  className={`flex flex-col items-center justify-center p-6 rounded-2xl bg-card/50 backdrop-blur-sm border ${card.border} shadow-lg min-w-[120px] sm:min-w-[140px]`}
                >
                  <div className={`p-4 rounded-xl ${card.bg} ${card.color} mb-3`}>
                    {card.icon}
                  </div>
                  <span className="font-bold text-sm text-foreground">{card.label}</span>
                </m.div>

                {idx < cards.length - 1 && (
                  <m.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: idx * 0.15 + 0.2 }}
                    className="hidden lg:flex text-muted-foreground"
                  >
                    <ArrowRight className="w-6 h-6 opacity-50" />
                  </m.div>
                )}
              </div>
            ))}
          </div>
        </LazyMotion>
      </div>
    </section>
  );
}
