import { Terminal, Check, Copy, AlertTriangle, ArrowRight, BookOpen, Layers } from "lucide-react";
import { DocsPager } from "@/components/docs-pager";

export const metadata = {
  title: "Getting Started Documentation — OpenBrowser",
  description: "Complete guide to installing OpenBrowser, setting up the Chrome extension, configuring environment variables, and running ask/agent commands.",
};

export default function GettingStartedDocPage() {
  return (
    <div className="py-12 bg-background text-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl space-y-12">
        {/* Header */}
        <div className="border-b border-border pb-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF8C00]/10 text-[#FF8C00] border border-[#FF8C00]/20 text-xs font-semibold uppercase">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Official Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground">
            Getting Started with OpenBrowser
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Follow this guide to install OpenBrowser, load the Chrome extension, and connect your browser AI chats to your local terminal workspace.
          </p>
        </div>

        {/* Prerequisites */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#1F2636] flex items-center justify-center text-xs font-mono text-[#FF8C00]">1</span>
            Prerequisites
          </h2>
          <div className="p-6 rounded-2xl bg-card border border-border space-y-3">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF8C00]" />
                <strong>Node.js:</strong> Version 20 or later (<code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground text-xs">node -v</code>)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF8C00]" />
                <strong>pnpm:</strong> Version 11.x (<code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground text-xs">corepack enable &amp;&amp; corepack prepare pnpm@11.0.0 --activate</code>)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF8C00]" />
                <strong>Google Chrome:</strong> (or Chromium-based browser) for the extension
              </li>
            </ul>
          </div>
        </section>

        {/* Step-by-Step Installation */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#1F2636] flex items-center justify-center text-xs font-mono text-[#FF8C00]">2</span>
            Installation &amp; Setup
          </h2>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <h3 className="font-bold text-foreground text-base">Step A: Clone and install dependencies</h3>
              <div className="p-4 rounded-xl bg-card dark:bg-slate-950 font-mono text-xs text-foreground dark:text-slate-100 border border-border space-y-1">
                <div><span className="text-[#FF8C00]">$</span> git clone https://github.com/1129Aliasgar/OpenBrowser.git</div>
                <div><span className="text-[#FF8C00]">$</span> cd OpenBrowser</div>
                <div><span className="text-[#FF8C00]">$</span> pnpm install</div>
                <div><span className="text-[#FF8C00]">$</span> pnpm build</div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <h3 className="font-bold text-foreground text-base">Step B: Register openbrowser command globally</h3>
              <div className="p-4 rounded-xl bg-card dark:bg-slate-950 font-mono text-xs text-foreground dark:text-slate-100 border border-border space-y-1">
                <div><span className="text-[#FF8C00]">$</span> pnpm setup</div>
                <div className="text-muted-foreground"># Close and reopen your terminal window</div>
                <div><span className="text-[#FF8C00]">$</span> pnpm link --global</div>
                <div><span className="text-[#FF8C00]">$</span> openbrowser --help</div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <h3 className="font-bold text-foreground text-base">Step C: Load Chrome Extension</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Open <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground text-xs">chrome://extensions</code> in Chrome.</li>
                <li>Enable <strong>Developer mode</strong> in the top right corner.</li>
                <li>Click <strong>Load unpacked</strong>.</li>
                <li>Select the <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground text-xs">browser-extension/</code> folder inside the repository.</li>
                <li>Pin the extension icon to your toolbar.</li>
              </ol>
            </div>
          </div>
        </section>

        {/* CLI Usage Commands */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#1F2636] flex items-center justify-center text-xs font-mono text-[#FF8C00]">3</span>
            Running CLI Commands
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <span className="font-mono text-xs text-[#FF8C00] font-bold">Ask Mode (Q&amp;A)</span>
              <p className="text-xs text-muted-foreground">Ask questions and render answers directly in terminal.</p>
              <div className="p-3 bg-card dark:bg-slate-950 rounded-xl font-mono text-xs text-foreground dark:text-slate-100 border border-border">
                openbrowser ask &quot;Explain Express middleware&quot;
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
              <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold">Agent Mode (File Edits)</span>
              <p className="text-xs text-muted-foreground">Modify project files with colored diff previews.</p>
              <div className="p-3 bg-card dark:bg-slate-950 rounded-xl font-mono text-xs text-foreground dark:text-slate-100 border border-border">
                openbrowser agent &quot;Add input validation&quot;
              </div>
            </div>
          </div>
        </section>

        <DocsPager pathname="/docs/getting-started" />
      </div>
    </div>
  );
}
