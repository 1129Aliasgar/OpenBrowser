import { Github, Shield, Heart, Sparkles, Cpu, Terminal, Globe, ArrowRight, CheckCircle2 } from "lucide-react";

export default function OpenSourceSection() {
  return (
    <section className="py-20 bg-background border-t border-border relative overflow-hidden">
      {/* Glow Backdrop */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-radial from-[#EE8B50]/15 to-transparent blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl space-y-12 relative z-10">
        {/* Quote Block */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EE8B50]/10 text-[#EE8B50] border border-[#EE8B50]/20 text-xs font-semibold uppercase tracking-wider font-mono"
          >
            <Github className="w-3.5 h-3.5" />
            <span>Open Source Philosophy</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-tight font-display">
            &ldquo;The fastest way to turn your <span className="text-[#EE8B50]">Browser AI</span> into a real coding agent.&rdquo;
          </h2>

          <p className="text-muted-foreground text-base sm:text-lg">
            Built for developers who prefer browser AI over expensive API billing.
          </p>
        </div>

        {/* Badges Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="p-4 rounded-2xl bg-card border border-border text-center space-y-1">
            <div className="text-lg font-bold text-foreground font-display">100% Free</div>
            <div className="text-xs text-muted-foreground">MIT License</div>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border text-center space-y-1">
            <div className="text-lg font-bold text-[#EE8B50] font-display">Zero API Keys</div>
            <div className="text-xs text-muted-foreground">Browser AI Bridge</div>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border text-center space-y-1">
            <div className="text-lg font-bold text-emerald-400 font-display">Local First</div>
            <div className="text-xs text-muted-foreground">Strictly 127.0.0.1</div>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border text-center space-y-1">
            <div className="text-lg font-bold text-indigo-400 font-display">Community</div>
            <div className="text-xs text-muted-foreground">GitHub Driven</div>
          </div>
        </div>

        {/* Architecture Illustration Box */}
        <div
          className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-2xl relative overflow-hidden space-y-6"
        >
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#EE8B50]" />
              <h3 className="font-bold text-lg text-foreground font-display">Local Architecture Flow</h3>
            </div>
            <span className="text-xs font-mono text-muted-foreground bg-popover px-3 py-1 rounded-full border border-border">
              http://127.0.0.1:5000
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="p-5 rounded-2xl bg-popover border border-border space-y-2">
              <div className="text-xs font-mono text-[#EE8B50] font-bold uppercase">Step 01 • Local CLI</div>
              <h4 className="text-base font-bold text-foreground">Terminal Prompt &amp; Context</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Reads @files, parses instructions, builds local job payload, and sends to local Fastify bridge.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-popover border border-border space-y-2">
              <div className="text-xs font-mono text-emerald-400 font-bold uppercase">Step 02 • Extension &amp; SSE</div>
              <h4 className="text-base font-bold text-foreground">Browser Auto-Injection</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Claims job over Server-Sent Events stream and inserts text directly into active ChatGPT or Claude tab.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-popover border border-border space-y-2">
              <div className="text-xs font-mono text-indigo-400 font-bold uppercase">Step 03 • Diff Apply</div>
              <h4 className="text-base font-bold text-foreground">Terminal Diff Review</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Captures response stream, formats JSON file operations, displays color diff, and awaits approval.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
