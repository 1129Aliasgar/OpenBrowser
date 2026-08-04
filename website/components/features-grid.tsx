

import { Terminal, FileCode, Layers, Paperclip, FileDiff, History, Shield, Zap, CheckCircle2 } from "lucide-react";

export default function FeaturesGrid() {
  const features = [
    {
      title: "Ask Mode (Q&A)",
      desc: "Ask technical questions, request explanations, or debug errors. Markdown responses render directly inside your local terminal with syntax highlighting.",
      icon: Terminal,
      color: "bg-card border-border dark:border-[#FF8C00]/30 dark:bg-[#120D08] hover:shadow-sm dark:hover:shadow-2xl",
      accent: "text-orange-600 dark:text-[#FF8C00]",
      badge: "openbrowser ask",
    },
    {
      title: "Agent Mode (Structured Diffs)",
      desc: "Generates multi-file code modifications across your project workspace using Zod-validated JSON operations schema.",
      icon: FileCode,
      color: "bg-card border-border dark:border-indigo-500/30 dark:bg-[#0B0D18] hover:shadow-sm dark:hover:shadow-2xl",
      accent: "text-indigo-600 dark:text-indigo-400",
      badge: "openbrowser agent",
    },
    {
      title: "@File & @Folder Attachments",
      desc: "Attach specific codebase context using `@path/to/file` or `@src/components` with tab-completion support directly in the interactive prompt menu.",
      icon: Paperclip,
      color: "bg-card border-border dark:border-emerald-500/30 dark:bg-[#08120D] hover:shadow-sm dark:hover:shadow-2xl",
      accent: "text-emerald-600 dark:text-emerald-400",
      badge: "Context Scanner",
    },
    {
      title: "Auto Long Prompt Attachments",
      desc: "Prompts exceeding 12,000 characters automatically convert into `.openbrowser/prompts/<session>.txt` attachments, bypassing paste limit barriers.",
      icon: Layers,
      color: "bg-card border-border hover:shadow-sm dark:hover:shadow-2xl",
      accent: "text-primary",
      badge: "12,000+ Char Auto-Attach",
    },
    {
      title: "Unified Color Diff Preview",
      desc: "Inspect every addition in green and deletion in red before approving file execution. Zero accidental overwrites.",
      icon: FileDiff,
      color: "bg-card border-border dark:border-amber-500/30 dark:bg-[#121008] hover:shadow-sm dark:hover:shadow-2xl",
      accent: "text-amber-600 dark:text-amber-400",
      badge: "Unified Diff Engine",
    },
    {
      title: "Audit & Undo History",
      desc: "All applied operations log under `.openbrowser/history.json` with timestamped snapshots for complete peace of mind.",
      icon: History,
      color: "bg-card border-border dark:border-purple-500/30 dark:bg-[#100A18] hover:shadow-sm dark:hover:shadow-2xl",
      accent: "text-purple-600 dark:text-purple-400",
      badge: "Local Audit Log",
    },
  ];

  return (
    <section className="py-20 bg-background border-t border-[#181D2A] relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF8C00]/10 text-[#FF8C00] border border-[#FF8C00]/20 text-xs font-semibold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            <span>Developer Tooling Feature Set</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground">
            Built for Serious Software Engineers
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            Everything you need in a modern AI coding agent without giving up control or paying subscription tolls.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className={`p-6 sm:p-7 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:border-opacity-80 space-y-4 ${f.color}`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl bg-accent dark:bg-background border border-border flex items-center justify-center ${f.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-accent dark:bg-background text-muted-foreground border border-border">
                    {f.badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-card-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
