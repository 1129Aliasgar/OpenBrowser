

import { Check, ExternalLink, Bot, Sparkles, MessageSquare, Zap } from "lucide-react";

export default function ProvidersGrid() {
  const providers = [
    {
      name: "ChatGPT",
      url: "https://chatgpt.com",
      status: "Active",
      tier: "Free & Plus Plans",
      features: ["Text Response", "Code Blocks", "File Attachments (.txt)", "GPT-4o"],
      color: "from-emerald-500/20 to-emerald-950/40 border-emerald-500/30",
      accent: "text-emerald-400",
      badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
      name: "Claude",
      url: "https://claude.ai",
      status: "Active",
      tier: "Free & Pro Plans",
      features: ["Claude 3.5 Sonnet", "Large Context Window", "Markdown Code Diffs", "Artifacts Compatible"],
      color: "from-amber-500/20 to-amber-950/40 border-amber-500/30",
      accent: "text-amber-400",
      badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    {
      name: "Gemini",
      url: "https://gemini.google.com",
      status: "Active",
      tier: "Free & Advanced",
      features: ["Gemini 1.5 Pro", "Ultra-fast Streaming", "1M+ Context Support", "File Attachment Uploads"],
      color: "bg-card border-border",
      accent: "text-primary",
      badgeBg: "bg-primary/10 text-primary border-primary/20",
    },
    {
      name: "DeepSeek",
      url: "https://chat.deepseek.com",
      status: "Active",
      tier: "Free Account",
      features: ["DeepSeek V3 & R1", "Reasoning & Code Logic", "JSON Schema Mode", "Zero Subscription Required"],
      color: "from-indigo-500/20 to-indigo-950/40 border-indigo-500/30",
      accent: "text-indigo-400",
      badgeBg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    },
    {
      name: "Perplexity",
      url: "https://www.perplexity.ai",
      status: "Active",
      tier: "Free & Pro",
      features: ["Live Web Search Integration", "Code Refactoring", "Quick Q&A Ask Mode"],
      color: "from-teal-500/20 to-teal-950/40 border-teal-500/30",
      accent: "text-teal-400",
      badgeBg: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    },
    {
      name: "Grok",
      url: "https://grok.com",
      status: "Active",
      tier: "Premium / X AI",
      features: ["Grok 2 / Grok 3", "Real-time Reasoning", "Fast Code Generation"],
      color: "from-rose-500/20 to-rose-950/40 border-rose-500/30",
      accent: "text-rose-400",
      badgeBg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    },
    {
      name: "GLM (Chat Z)",
      url: "https://chat.z.ai",
      status: "Active",
      tier: "Free Plan",
      features: ["GLM-4 Model", "Multi-language Support", "Agent Mode Diffs"],
      color: "from-purple-500/20 to-purple-950/40 border-purple-500/30",
      accent: "text-purple-400",
      badgeBg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    },
  ];

  return (
    <section className="py-20 bg-background relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl space-y-12">
        {/* Title */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF8C00]/10 text-[#FF8C00] border border-[#FF8C00]/20 text-xs font-semibold uppercase tracking-wider">
            <Bot className="w-3.5 h-3.5" />
            <span>Browser AI Compatibility</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground">
            Use Any Browser AI Assistant
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            Keep a tab open in Chrome. OpenBrowser auto-detects active sessions and routes prompts through your preferred AI model.
          </p>
        </div>

        {/* Provider Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((p, i) => (
            <div
              key={i}
              className={`p-6 rounded-2xl bg-gradient-to-b ${p.color} border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl space-y-4`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center font-bold text-base text-foreground">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{p.name}</h3>
                    <span className="text-xs text-muted-foreground">{p.tier}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border ${p.badgeBg}`}>
                  {p.status}
                </span>
              </div>

              {/* Feature Tags */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supported Features</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {p.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <Check className={`w-3.5 h-3.5 ${p.accent}`} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Link */}
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors pt-2"
              >
                <span>Open {p.name} Tab</span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
