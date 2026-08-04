import Link from "next/link";
import Image from "next/image";
import { Terminal, Github, Heart, Sparkles, ArrowUpRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background text-muted-foreground text-sm py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl space-y-12">
        {/* Main Footer Row */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 pb-12 border-b border-border">
          {/* Left: Brand & Get Started */}
          <div className="space-y-4 max-w-sm">
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image
                src="/assets/logo.svg"
                alt="OpenBrowser Logo"
                width={150}
                height={38}
                className="h-[clamp(32px,2.5vw,38px)] w-auto group-hover:scale-[1.02] transition-transform"
              />
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              OpenBrowser is an open-source local AI coding agent that connects your browser AI subscriptions directly to your terminal.
            </p>
            <div>
              <Link href="/docs/getting-started">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#EE8B50] hover:bg-[#D9773F] text-foreground font-bold text-xs shadow-[0_0_15px_rgba(238,139,80,0.3)] transition-all">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Get Started Free</span>
                </button>
              </Link>
            </div>
          </div>

          {/* Right Links Navigation */}
          <div className="flex flex-wrap gap-8 sm:gap-12 text-xs font-medium">
            <div className="space-y-3">
              <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] font-mono text-[#EE8B50]">Resources</h4>
              <ul className="space-y-2">
                <li><Link href="/docs/getting-started" className="hover:text-[#EE8B50] transition-colors">Documentation</Link></li>
                <li><a href="https://github.com/1129Aliasgar/OpenBrowser" target="_blank" rel="noopener noreferrer" className="hover:text-[#EE8B50] transition-colors">GitHub</a></li>
                <li><Link href="/blog" className="hover:text-[#EE8B50] transition-colors">Blog</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] font-mono text-[#EE8B50]">Open Source</h4>
              <ul className="space-y-2">
                <li><a href="https://github.com/1129Aliasgar/OpenBrowser/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="hover:text-[#EE8B50] transition-colors">Contributing</a></li>
                <li><a href="https://github.com/1129Aliasgar/OpenBrowser/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:text-[#EE8B50] transition-colors">License (MIT)</a></li>
                <li><a href="https://github.com/1129Aliasgar/OpenBrowser/blob/main/SECURITY.md" target="_blank" rel="noopener noreferrer" className="hover:text-[#EE8B50] transition-colors">Security</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] font-mono text-[#EE8B50]">Supported Models</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>ChatGPT (OpenAI)</li>
                <li>Claude (Anthropic)</li>
                <li>Gemini (Google)</li>
                <li>DeepSeek &amp; Grok</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 9: COPYRIGHT */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-bold text-foreground font-display">
            <span>OpenBrowser</span>
            <span className="text-[#262A33]">|</span>
            <span className="text-muted-foreground font-mono text-[11px] font-normal">Local-First AI Coding Harness</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="px-2.5 py-0.5 rounded-full bg-card border border-border text-muted-foreground font-mono text-[11px]">
              MIT License
            </span>
            <span className="text-muted-foreground">Made for Developers</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
