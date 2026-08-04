import { Terminal, Cpu, Globe, Code, Layers, FileCheck, RefreshCw, Zap } from "lucide-react";

export default function ProductFeatureShowcase() {
  const features = [
    {
      id: "cli",
      title: "01 • Local CLI Engine",
      heading: "Interactive Terminal Workspace",
      description: "Ask questions, launch autonomous edit agents, or run the local bridge server directly from your bash or zsh shell.",
      highlights: ["@file local context injection", "Colorized git unified diffs", "Interactive step approval prompt"],
      badge: "Command Line",
      icon: Terminal,
      preview: (
        <div className="p-4 rounded-2xl bg-background border border-border font-mono text-xs text-foreground space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-border text-[11px] text-muted-foreground">
            <span>Terminal — openbrowser agent</span>
            <span className="text-emerald-400">● Connected :5000</span>
          </div>
          <p className="text-muted-foreground">$ openbrowser agent &quot;Add rate limiting middleware&quot;</p>
          <p className="text-[#EE8B50]">✔ Loaded context: src/server.ts (142 lines)</p>
          <p className="text-muted-foreground">⠋ Sending request to ChatGPT tab over SSE bridge...</p>
          <div className="p-2.5 rounded-lg bg-secondary border border-border text-emerald-400 text-[11px] space-y-1">
            <p>{`+ app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));`}</p>
            <p className="text-muted-foreground">Applied diff to src/server.ts [28+ 3-]</p>
          </div>
        </div>
      ),
    },
    {
      id: "bridge",
      title: "02 • Local Bridge Server",
      heading: "High-Performance Fastify Server",
      description: "Coordinates job queues, stores history, and maintains local Server-Sent Events (SSE) connections with extension clients.",
      highlights: ["Strictly localhost (127.0.0.1)", "Zero external network dependency", "Instant SSE job streaming"],
      badge: "Bridge Server",
      icon: Cpu,
      preview: (
        <div className="p-4 rounded-2xl bg-background border border-border font-mono text-xs text-foreground space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-border text-[11px] text-muted-foreground">
            <span>Bridge Status — 127.0.0.1:5000</span>
            <span className="text-[#EE8B50]">Active Session</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded bg-secondary border border-border">
              <span className="text-muted-foreground">GET /events</span>
              <p className="text-emerald-400 font-bold">SSE 200 OK</p>
            </div>
            <div className="p-2 rounded bg-secondary border border-border">
              <span className="text-muted-foreground">POST /jobs</span>
              <p className="text-foreground font-bold">Claimed by Chrome</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-1">Listening for CLI agent requests...</p>
        </div>
      ),
    },
    {
      id: "extension",
      title: "03 • Browser Extension",
      heading: "Automated Tab Injector",
      description: "Runs seamlessly inside Chrome, Firefox, or Brave. Injects prompts, captures AI text streaming, and passes structured file diffs back.",
      highlights: ["ChatGPT, Claude, Gemini, DeepSeek, Grok", "DOM observer response capturing", "Automatic tab state restoration"],
      badge: "Browser Extension",
      icon: Globe,
      preview: (
        <div className="p-4 rounded-2xl bg-background border border-border font-mono text-xs text-foreground space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-border text-[11px] text-muted-foreground">
            <span>OpenBrowser Chrome Extension</span>
            <span className="px-1.5 py-0.5 rounded bg-[#EE8B50]/20 text-[#EE8B50] font-bold">Injecting</span>
          </div>
          <div className="p-2.5 rounded-lg bg-secondary border border-border text-xs space-y-1">
            <span className="text-muted-foreground font-semibold">Active AI Model:</span>
            <p className="text-foreground">ChatGPT Plus (GPT-4o) • Tab ID #402</p>
            <p className="text-[#EE8B50] text-[11px]">Writing response to CLI bridge...</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="py-20 bg-background border-t border-border relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl space-y-16">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground font-display">
            Deep Dive Into <span className="text-[#EE8B50]">OpenBrowser</span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Architected specifically for developers who demand full control, total privacy, and no subscription fees.
          </p>
        </div>

        <div className="space-y-12">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                style={{ animationDelay: `${idx * 100}ms` }}
                className={`animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both p-8 rounded-3xl bg-card border border-border shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center ${
                  idx % 2 === 1 ? "lg:flex-row-reverse" : ""
                }`}
              >
                <div className="lg:col-span-6 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EE8B50]/10 text-[#EE8B50] border border-[#EE8B50]/20 text-xs font-mono font-bold">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{feature.badge}</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground font-display">
                    {feature.heading}
                  </h3>

                  <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                    {feature.description}
                  </p>

                  <ul className="space-y-2 pt-2 text-xs sm:text-sm text-muted-foreground">
                    {feature.highlights.map((h, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#EE8B50]" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="lg:col-span-6">
                  {feature.preview}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
