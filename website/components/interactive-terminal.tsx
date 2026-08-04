"use client";

import { useState } from "react";
import { Terminal, Play, RotateCcw, Check, X, FileCode, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

export default function InteractiveTerminal() {
  const [activeTab, setActiveTab] = useState<"ask" | "agent">("agent");
  const [step, setStep] = useState<number>(0); // 0: Idle, 1: Sending prompt, 2: Streaming AI, 3: Diff Review, 4: Applied
  const [userPrompt, setUserPrompt] = useState(
    activeTab === "agent"
      ? "Add input validation for bridge token in src/server/index.ts"
      : "Explain how SSE events stream responses from Chrome Extension to Fastify"
  );

  const runSimulation = () => {
    setStep(1);
    setTimeout(() => {
      setStep(2);
      setTimeout(() => {
        setStep(3);
      }, 1200);
    }, 1000);
  };

  const handleApply = () => {
    setStep(4);
  };

  const handleReset = () => {
    setStep(0);
  };

  return (
    <section className="py-16 bg-background border-y border-border relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl space-y-8">
        {/* Section Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF8C00]/10 text-[#FF8C00] border border-[#FF8C00]/20 text-xs font-semibold uppercase tracking-wider">
            <Terminal className="w-3.5 h-3.5" />
            <span>Interactive Workspace Playground</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            Experience OpenBrowser in Action
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
            Simulate how prompts travel from your local terminal to your browser AI session and apply structured diffs directly to your project.
          </p>
        </div>

        {/* Terminal Container */}
        <div className="rounded-2xl bg-card dark:bg-[var(--terminal-bg)] border border-border dark:border-[var(--terminal-border)] shadow-xl dark:shadow-2xl overflow-hidden glow-orange-sm">
          {/* Top Bar / Mode Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-muted dark:bg-[var(--terminal-border)] border-b border-border dark:border-[var(--terminal-border)]">
            {/* Window Dots */}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-xs text-muted-foreground dark:text-[var(--terminal-muted)] font-semibold hidden sm:inline">
                openbrowser-cli • Fastify Bridge :5000
              </span>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-1 bg-background dark:bg-[var(--terminal-bg)] p-1 rounded-lg border border-border dark:border-[var(--terminal-border)]">
              <button
                onClick={() => {
                  setActiveTab("agent");
                  setUserPrompt("Add input validation for bridge token in src/server/index.ts");
                  setStep(0);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "agent"
                    ? "bg-[#FF8C00] text-white shadow"
                    : "text-muted-foreground dark:text-[var(--terminal-muted)] hover:text-foreground dark:hover:text-[var(--terminal-text)]"
                }`}
              >
                Agent Mode (Diffs)
              </button>
              <button
                onClick={() => {
                  setActiveTab("ask");
                  setUserPrompt("Explain how SSE events stream responses from Chrome Extension to Fastify");
                  setStep(0);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "ask"
                    ? "bg-[#FF8C00] text-white shadow"
                    : "text-muted-foreground dark:text-[var(--terminal-muted)] hover:text-foreground dark:hover:text-[var(--terminal-text)]"
                }`}
              >
                Ask Mode (Q&A)
              </button>
            </div>
          </div>

          {/* Terminal Body */}
          <div className="p-5 sm:p-6 font-mono text-xs sm:text-sm text-card-foreground dark:text-[var(--terminal-text)] space-y-4 min-h-[380px] bg-card dark:bg-[var(--terminal-bg)]">
            {/* Command Prompt Input Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-xl bg-muted dark:bg-[var(--code-bg)] border border-border dark:border-[var(--terminal-border)]">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-orange-600 dark:text-[var(--terminal-orange)] font-bold">$</span>
                <span className="text-muted-foreground dark:text-[var(--terminal-muted)] font-semibold">openbrowser {activeTab}</span>
                <input
                  type="text"
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  disabled={step > 0}
                  className="bg-transparent text-card-foreground dark:text-[var(--terminal-text)] focus:outline-none flex-1 font-mono text-xs sm:text-sm"
                  placeholder="Enter prompt..."
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {step === 0 ? (
                  <button
                    onClick={runSimulation}
                    className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-[var(--terminal-orange)] hover:bg-[#E67E00] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Command</span>
                  </button>
                ) : (
                  <button
                    onClick={handleReset}
                    className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-secondary dark:bg-[#1E2433] hover:bg-secondary/80 dark:hover:bg-[#2B3448] text-secondary-foreground dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Step 1: Sending Prompt & SSE Dispatch */}
            {step >= 1 && (
              <div className="space-y-2 pt-2 text-foreground dark:text-slate-300 border-l-2 border-[#FF8C00] pl-3">
                <div className="text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-ping" />
                  [Bridge] HTTP 200 POST /session/prompt (Job ID: job_94f8a2)
                </div>
                <div className="text-muted-foreground dark:text-slate-400 text-xs">
                  [Extension] Claimed job_94f8a2 $\rightarrow$ Dispatching prompt to ChatGPT composer tab...
                </div>
              </div>
            )}

            {/* Step 2: Streaming AI Response */}
            {step >= 2 && (
              <div className="space-y-2 text-foreground dark:text-slate-300 border-l-2 border-indigo-500 pl-3">
                <div className="text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
                  [Browser AI] Streaming response via SSE /browser/chunk...
                </div>
              </div>
            )}

            {/* Step 3: Agent Mode Diff View or Ask Mode Markdown View */}
            {step >= 3 && activeTab === "agent" && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground dark:text-[var(--terminal-muted)] border-b border-border dark:border-[var(--terminal-border)] pb-2">
                  <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
                    <FileCode className="w-4 h-4" /> Proposed Change: src/server/index.ts (CREATE_FILE)
                  </span>
                  <span className="text-muted-foreground dark:text-[var(--terminal-muted)]">Unified Diff</span>
                </div>

                <div className="bg-muted dark:bg-[var(--code-bg)] p-4 rounded-xl border border-border dark:border-[var(--terminal-border)] space-y-1 font-mono text-xs overflow-x-auto">
                  <div className="text-muted-foreground dark:text-[var(--terminal-muted)]">@@ -42,6 +42,12 @@ export async function createBridgeServer() &#123;</div>
                  <div className="text-muted-foreground dark:text-slate-400">   const app = Fastify();</div>
                  <div className="text-muted-foreground dark:text-slate-400">   app.register(fastifyCors);</div>
                  <div className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-1 border-l-2 border-emerald-500 flex gap-2">
                    <span>+</span>
                    <span>  if (process.env.BRIDGE_TOKEN &amp;&amp; req.headers[&apos;authorization&apos;] !== `Bearer ${process.env.BRIDGE_TOKEN}`) &#123;</span>
                  </div>
                  <div className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-1 border-l-2 border-emerald-500 flex gap-2">
                    <span>+</span>
                    <span>    return reply.status(401).send(&#123; error: &apos;Unauthorized bridge token&apos; &#125;);</span>
                  </div>
                  <div className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-1 border-l-2 border-emerald-500 flex gap-2">
                    <span>+</span>
                    <span>  &#125;</span>
                  </div>
                  <div className="text-muted-foreground dark:text-slate-400">   app.get(&apos;/health&apos;, async () =&gt; (&#123; status: &apos;ok&apos; &#125;));</div>
                </div>

                {step === 3 && (
                  <div className="p-3 bg-accent dark:bg-[#151924] rounded-xl border border-border dark:border-[#252C3D] flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-foreground dark:text-slate-300 font-medium">
                      Apply 1 file operation to workspace? [y/N]
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleApply}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm &amp; Apply (y)</span>
                      </button>
                      <button
                        onClick={handleReset}
                        className="px-3 py-1.5 rounded-lg bg-secondary dark:bg-[#222838] hover:bg-secondary/80 dark:hover:bg-[#2D354A] text-secondary-foreground dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject (N)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3 for Ask Mode: Text Response */}
            {step >= 3 && activeTab === "ask" && (
              <div className="p-4 rounded-xl bg-muted dark:bg-[var(--code-bg)] border border-border dark:border-[var(--terminal-border)] space-y-2 text-foreground dark:text-slate-300 text-xs leading-relaxed">
                <div className="text-emerald-600 dark:text-emerald-400 font-bold mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Response received from Claude 3.5 Sonnet:
                </div>
                <p>
                  1. The <strong>Fastify Bridge Server</strong> exposes <code className="text-[#FF8C00]">GET /browser/events</code> using Server-Sent Events (SSE).
                </p>
                <p>
                  2. The <strong>Chrome Extension</strong> subscribes to this stream, listens for incoming prompt jobs, and claims them via <code className="text-[#FF8C00]">POST /browser/claim</code>.
                </p>
                <p>
                  3. After injecting into the composer and completing the chat turn, it streams text back via <code className="text-[#FF8C00]">POST /browser/chunk</code> to your CLI terminal.
                </p>
              </div>
            )}

            {/* Step 4: Confirmed & Applied State */}
            {step === 4 && (
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/40 rounded-xl text-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Operation applied successfully! Logged in .openbrowser/history.json</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
