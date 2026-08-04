import { Shield, Zap, Unplug, Puzzle, Key } from "lucide-react";

export default function ArchitecturalPrinciples() {
  const principles = [
    {
      icon: <Key className="w-5 h-5 text-[#38BDF8]" />,
      title: "No API Keys Required",
      description: "Leverage your existing browser subscriptions (ChatGPT Plus, Claude Pro). No per-token usage fees.",
    },
    {
      icon: <Shield className="w-5 h-5 text-emerald-400" />,
      title: "Local-First Execution",
      description: "All file operations, context bundling, and diff generation happen locally on your machine.",
    },
    {
      icon: <Zap className="w-5 h-5 text-[#EE8B50]" />,
      title: "Streaming by Default",
      description: "Tokens are streamed instantly to your terminal. No waiting for 60-second long generation cycles.",
    },
    {
      icon: <Unplug className="w-5 h-5 text-purple-400" />,
      title: "Provider Agnostic",
      description: "Switch seamlessly between ChatGPT, Claude, and Gemini without changing any local configuration.",
    },
    {
      icon: <Puzzle className="w-5 h-5 text-rose-400" />,
      title: "Modular Components",
      description: "The CLI, Bridge, and Extension are entirely decoupled, allowing community developers to easily swap or enhance layers.",
    },
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Architectural Principles</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            The core philosophies that guide the technical design of OpenBrowser.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {principles.map((principle, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-card border border-border hover:border-foreground/20 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-2 rounded-lg bg-muted border border-border">
                  {principle.icon}
                </div>
                <h3 className="font-bold text-foreground">{principle.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {principle.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
