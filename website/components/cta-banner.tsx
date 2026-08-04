

import Link from "next/link";
import { Terminal, Sparkles, Github, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CTABanner() {
  return (
    <section className="py-20 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="relative rounded-3xl bg-card dark:bg-gradient-to-br dark:from-[#120D08] dark:via-[#141822] dark:to-[#0A0D14] border border-border dark:border-[#FF8C00]/30 p-8 sm:p-12 lg:p-16 text-center space-y-8 shadow-xl dark:shadow-2xl dark:glow-orange">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 dark:bg-[#FF8C00]/10 text-orange-600 dark:text-[#FF8C00] border border-orange-200 dark:border-[#FF8C00]/30 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Start Free Local AI Coding Today</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-card-foreground dark:text-white max-w-3xl mx-auto leading-tight">
            Stop Paying API Tolls for Your Own Local Code
          </h2>

          <p className="text-muted-foreground dark:text-slate-400 max-w-xl mx-auto text-base sm:text-lg">
            Connect ChatGPT, Claude, Gemini, or DeepSeek to your workspace in under 2 minutes. Free and open source under MIT License.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link href="/docs/getting-started" prefetch={true}>
              <Button size="lg" className="bg-gradient-to-r from-[#FF8C00] to-[#E65100] hover:from-[#FF9E2C] hover:to-[#FF6B00] text-white font-bold text-base px-8 h-12 shadow-[0_0_25px_rgba(255,140,0,0.35)] gap-2 border-none">
                <Terminal className="w-4 h-4" />
                <span>Read Installation Guide</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a
              href="https://github.com/1129Aliasgar/OpenBrowser"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" variant="outline" className="border-border dark:border-[#2A303F] bg-background dark:bg-transparent text-foreground dark:text-white hover:bg-muted dark:hover:bg-[#171B24] font-semibold text-base px-8 h-12 gap-2">
                <Github className="w-4 h-4" />
                <span>Star Repository</span>
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
