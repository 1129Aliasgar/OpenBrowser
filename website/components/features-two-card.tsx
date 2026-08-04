import Link from "next/link";
import { Terminal, Globe, ArrowRight, Check, Code, Command, Download, Sparkles } from "lucide-react";

export default function FeaturesTwoCard() {
  return (
    <section className="py-20 bg-background border-t border-border relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground font-display">
            Two Core Engines. <span className="text-[#EE8B50]">One Seamless Workflow.</span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            OpenBrowser bridges your command line directly with active web browser tabs in real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card One: CLI */}
          <div
            className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both p-8 rounded-3xl bg-card border border-border hover:border-[#EE8B50]/40 transition-all shadow-xl flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EE8B50]/10 border border-[#EE8B50]/20 flex items-center justify-center text-[#EE8B50]">
                <Terminal className="w-6 h-6" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground font-display">Command Line Interface (CLI)</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Run AI directly from your terminal with local context scanning, file tree awareness, and automated diff application.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Core Commands</span>
                <div className="space-y-2 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-secondary border border-border flex items-center justify-between text-foreground">
                    <span className="text-[#EE8B50]">openbrowser ask &quot;How to optimize this function?&quot;</span>
                    <span className="text-muted-foreground text-[10px]">Q&amp;A</span>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary border border-border flex items-center justify-between text-foreground">
                    <span className="text-[#EE8B50]">openbrowser agent &quot;Build feature X&quot;</span>
                    <span className="text-muted-foreground text-[10px]">Autonomous</span>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary border border-border flex items-center justify-between text-foreground">
                    <span className="text-[#EE8B50]">openbrowser server</span>
                    <span className="text-muted-foreground text-[10px]">Local Bridge</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-3">
              <Link href="/docs/getting-started" className="w-full">
                <button className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#EE8B50] hover:bg-[#D9773F] text-foreground text-xs font-bold shadow-md transition-all">
                  <span>Explore CLI Commands</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>

          {/* Card Two: Browser Extension */}
          <div
            style={{ animationDelay: '100ms' }}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both p-8 rounded-3xl bg-card border border-border hover:border-[#EE8B50]/40 transition-all shadow-xl flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EE8B50]/10 border border-[#EE8B50]/20 flex items-center justify-center text-[#EE8B50]">
                <Globe className="w-6 h-6" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground font-display">Browser Extension</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Automatically inject prompts into ChatGPT, Claude, Gemini, DeepSeek, and Grok and capture responses instantly without API keys.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Supported Browser AI Subscriptions</span>
                <div className="grid grid-cols-2 gap-2 text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary border border-border">
                    <Check className="w-3.5 h-3.5 text-[#EE8B50]" />
                    <span>ChatGPT (Plus / Team / Free)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary border border-border">
                    <Check className="w-3.5 h-3.5 text-[#EE8B50]" />
                    <span>Claude (Pro / Free)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary border border-border">
                    <Check className="w-3.5 h-3.5 text-[#EE8B50]" />
                    <span>Gemini (Advanced)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary border border-border">
                    <Check className="w-3.5 h-3.5 text-[#EE8B50]" />
                    <span>DeepSeek &amp; Grok</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-3">
              <Link href="/docs/getting-started" className="flex-1">
                <button className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold border border-border transition-all">
                  <Download className="w-3.5 h-3.5 text-[#EE8B50]" />
                  <span>Extension Guide</span>
                </button>
              </Link>
              <Link href="/docs/getting-started" className="flex-1">
                <button className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#EE8B50] hover:bg-[#D9773F] text-foreground text-xs font-bold shadow-md transition-all">
                  <span>Installation</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
