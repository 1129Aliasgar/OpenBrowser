import { Terminal, Cpu, Globe, Bot, ArrowRight, ShieldCheck, Zap, RefreshCw, CheckCircle } from "lucide-react";

export default function BridgeArchitecture() {
  const nodes = [
    {
      id: 1,
      title: "Local Terminal (CLI)",
      icon: Terminal,
      badge: "openbrowser CLI",
      desc: "Executes `ask` or `agent` commands, collects workspace context (@file / @folder), and validates JSON diffs.",
      details: ["pnpm setup & link --global", "Zod operation validation", "Unified diff preview", "History logger (.openbrowser)"],
      color: "bg-card border-border dark:border-[#FF8C00]/40 dark:bg-[#14100B]",
      accent: "text-orange-600 dark:text-[#FF8C00]",
    },
    {
      id: 2,
      title: "Fastify Bridge Server",
      icon: Cpu,
      badge: "http://127.0.0.1:5000",
      desc: "Lightweight local HTTP & SSE bridge server. Coordinates session prompt queues and streams response chunks.",
      details: ["SSE event stream dispatch", "Bearer token auth optional", "Prompt .txt file attachment (>12k)", "Zero external cloud telemetry"],
      color: "bg-card border-border dark:border-[#38BDF8]/40 dark:bg-[#0A141D]",
      accent: "text-sky-600 dark:text-[#38BDF8]",
    },
    {
      id: 3,
      title: "Chrome Extension (MV3)",
      icon: Globe,
      badge: "OpenBrowser Extension",
      desc: "Background service worker listening to SSE events. Automatically claims jobs, injects prompts, and posts AI output back.",
      details: ["Manifest V3 background worker", "Auto-claims job via /claim", "Prompt attachment uploader", "DOM mutation responder"],
      color: "bg-card border-border dark:border-[#10B981]/40 dark:bg-[#091712]",
      accent: "text-emerald-600 dark:text-[#10B981]",
    },
    {
      id: 4,
      title: "Browser AI Session",
      icon: Bot,
      badge: "ChatGPT / Claude / Gemini",
      desc: "Your active browser AI tab. Runs queries using your existing browser subscription plan with zero API key billing.",
      details: ["ChatGPT Free & Plus", "Claude Pro & Free", "Gemini Advanced", "DeepSeek, Grok, Perplexity"],
      color: "bg-card border-border dark:border-[#A855F7]/40 dark:bg-[#130E1B]",
      accent: "text-purple-600 dark:text-[#A855F7]",
    },
  ];

  return (
    <section className="py-20 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl space-y-12">
        {/* Title Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20 text-xs font-semibold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            <span>Local Bridge Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground">
            How OpenBrowser Connects Your Workspace
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            No cloud middleman. No stored credentials. Complete data privacy running strictly on <code className="text-emerald-600 dark:text-emerald-400 font-mono">127.0.0.1</code>.
          </p>
        </div>

        {/* 4 Node Flow Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative group/diagram">
          {nodes.map((node, index) => {
            const Icon = node.icon;
            return (
              <div
                key={node.id}
                className={`group/node p-6 rounded-2xl border transition-all duration-300 relative ${node.color} opacity-95 hover:scale-[1.02] hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-black hover:opacity-100 hover:z-10`}
              >
                {/* Step Number Pill */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm bg-muted/50 dark:bg-background border border-border ${node.accent}`}>
                    0{node.id}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted/50 dark:bg-background/80 text-foreground border border-border">
                    {node.badge}
                  </span>
                </div>

                {/* Node Title & Icon */}
                <div className="flex items-center gap-3 mb-3">
                  <Icon className={`w-6 h-6 ${node.accent}`} />
                  <h3 className="text-lg font-bold text-card-foreground">{node.title}</h3>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  {node.desc}
                </p>

                {/* Bullet details */}
                <ul className="space-y-1.5 pt-3 border-t border-border dark:border-slate-800/60">
                  {node.details.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                      <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${node.accent}`} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Privacy & Security Guarantee Banner */}
        <div className="p-6 rounded-2xl bg-card border border-border flex flex-col md:flex-row items-center justify-between gap-6 max-w-4xl mx-auto shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-card-foreground">Local-First Security Model</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                OpenBrowser never transmits your project source code to any third-party telemetry server. All bridge traffic is strictly bound to your local localhost loopback interface. You maintain 100% control over file approvals.
              </p>
            </div>
          </div>
          <a
            href="https://github.com/1129Aliasgar/OpenBrowser/blob/main/SECURITY.md"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-4 py-2 text-xs font-semibold rounded-lg bg-accent dark:bg-[#171B24] hover:bg-accent/80 dark:hover:bg-[#1F2636] text-foreground border border-border dark:border-[#2A303F] transition-all"
          >
            Read Security Policy
          </a>
        </div>
      </div>
    </section>
  );
}
