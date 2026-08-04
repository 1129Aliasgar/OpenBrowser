import { CheckCircle2, ArrowRight, Terminal, Globe, Cpu, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
const InteractiveTerminal = dynamic(() => import("@/components/interactive-terminal"));
import BridgeArchitecture from "@/components/bridge-architecture";
import CTABanner from "@/components/cta-banner";

export const metadata = {
  title: "How OpenBrowser Works — Step-by-Step AI Harness Workflow",
  description: "Learn how OpenBrowser routes prompts between your terminal, Fastify bridge server, Chrome extension, and browser AI chats.",
};

export default function HowItWorksPage() {
  const steps = [
    {
      num: "01",
      title: "Clone & Register Global CLI",
      desc: "Run `git clone https://github.com/1129Aliasgar/OpenBrowser.git`, run `pnpm install`, then execute `pnpm build && pnpm link --global` to make the `openbrowser` command globally available in your shell.",
    },
    {
      num: "02",
      title: "Load Unpacked Chrome Extension",
      desc: "Open `chrome://extensions`, enable Developer Mode, and click 'Load Unpacked'. Select the `browser-extension/` folder inside the OpenBrowser repo.",
    },
    {
      num: "03",
      title: "Open Your Preferred AI Chat Tab",
      desc: "Open ChatGPT, Claude, Gemini, DeepSeek, or Grok in Chrome and reload the tab. The OpenBrowser extension will automatically pair with your local Fastify server on `127.0.0.1:5000`.",
    },
    {
      num: "04",
      title: "Run Prompts From Your Project Terminal",
      desc: "Run `openbrowser ask \"How do I optimize SQL queries?\"` or `openbrowser agent \"Add input validation\"`. Prompts stream automatically to your browser AI tab and responses return straight to your CLI with diff previews.",
    },
  ];

  return (
    <div className="py-12 bg-background space-y-16">
      <div className="container mx-auto px-4 max-w-4xl text-center space-y-4 pt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF8C00]/10 text-[#FF8C00] border border-[#FF8C00]/20 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Workflow Guide</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-foreground">
          How OpenBrowser <span className="text-gradient-orange">Operates</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          A seamless bridge between your local terminal workspace and your browser AI chats in 4 straightforward steps.
        </p>
      </div>

      <div className="container mx-auto px-4 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((s, i) => (
            <div key={i} className="p-8 rounded-2xl bg-card border border-border space-y-4 relative">
              <div className="text-3xl font-black text-[#FF8C00] font-mono">{s.num}</div>
              <h3 className="text-xl font-bold text-foreground">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <BridgeArchitecture />
      <InteractiveTerminal />
      <CTABanner />
    </div>
  );
}
