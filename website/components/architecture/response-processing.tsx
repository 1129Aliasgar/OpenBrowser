"use client";

import { Cpu, TerminalSquare, FileCode2, ArrowDown } from "lucide-react";

export default function ResponseProcessing() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Response Processing</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            How OpenBrowser converts unstructured AI chat into structured, safe filesystem operations.
          </p>
        </div>

        <div className="relative">
          {/* Vertical connecting line */}
          <div className="absolute left-[39px] sm:left-1/2 top-0 bottom-0 w-px bg-border/50 -translate-x-1/2" />
          
          <div className="space-y-12">
            {/* Step 1: Raw Stream */}
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-12">
              <div className="hidden sm:flex flex-1 justify-end">
                <div className="text-right">
                  <h3 className="font-bold text-foreground text-lg">Raw Token Stream</h3>
                  <p className="text-sm text-muted-foreground">Conversational text mixed with JSON.</p>
                </div>
              </div>
              <div className="relative z-10 w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center shrink-0">
                <TerminalSquare className="w-8 h-8 text-[#38BDF8]" />
              </div>
              <div className="flex-1">
                <div className="sm:hidden mb-2">
                  <h3 className="font-bold text-foreground text-lg">Raw Token Stream</h3>
                  <p className="text-sm text-muted-foreground">Conversational text mixed with JSON.</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-xl border border-border text-xs font-mono text-muted-foreground">
                  <span className="opacity-50">&quot;Here is the code you requested:\n```json\n&quot;</span>
                  <span className="text-foreground">{"{"}</span><br/>
                  <span className="text-foreground">  &quot;tool&quot;: &quot;write_file&quot;,</span><br/>
                  <span className="text-foreground">  &quot;content&quot;: &quot;...&quot;</span><br/>
                  <span className="text-foreground">{"}"}</span><br/>
                  <span className="opacity-50">&quot;```\nLet me know if you need anything else.&quot;</span>
                </div>
              </div>
            </div>

            {/* Step 2: Parser */}
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-12">
              <div className="hidden sm:flex flex-1 justify-end">
                <div className="text-right">
                  <h3 className="font-bold text-foreground text-lg">Parser & Validator</h3>
                  <p className="text-sm text-muted-foreground">Extracts and validates JSON using Zod.</p>
                </div>
              </div>
              <div className="relative z-10 w-20 h-20 rounded-2xl bg-card border border-[#EE8B50]/30 shadow-[0_0_15px_rgba(238,139,80,0.1)] flex items-center justify-center shrink-0">
                <Cpu className="w-8 h-8 text-[#EE8B50]" />
                <ArrowDown className="absolute -top-10 w-5 h-5 text-muted-foreground/30" />
              </div>
              <div className="flex-1">
                <div className="sm:hidden mb-2">
                  <h3 className="font-bold text-foreground text-lg">Parser & Validator</h3>
                  <p className="text-sm text-muted-foreground">Extracts and validates JSON using Zod.</p>
                </div>
                <div className="bg-card p-4 rounded-xl border border-[#EE8B50]/20 text-xs font-mono">
                  <span className="text-emerald-400">✓ Parsed JSON block</span><br/>
                  <span className="text-emerald-400">✓ Validated against schema</span><br/>
                  <span className="text-muted-foreground">→ Discarded 42 conversational tokens</span>
                </div>
              </div>
            </div>

            {/* Step 3: Operations Engine */}
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-12">
              <div className="hidden sm:flex flex-1 justify-end">
                <div className="text-right">
                  <h3 className="font-bold text-foreground text-lg">Operations Engine</h3>
                  <p className="text-sm text-muted-foreground">Prepares diffs and executes changes safely.</p>
                </div>
              </div>
              <div className="relative z-10 w-20 h-20 rounded-2xl bg-card border border-emerald-400/30 shadow-[0_0_15px_rgba(52,211,153,0.1)] flex items-center justify-center shrink-0">
                <FileCode2 className="w-8 h-8 text-emerald-400" />
                <ArrowDown className="absolute -top-10 w-5 h-5 text-muted-foreground/30" />
              </div>
              <div className="flex-1">
                <div className="sm:hidden mb-2">
                  <h3 className="font-bold text-foreground text-lg">Operations Engine</h3>
                  <p className="text-sm text-muted-foreground">Prepares diffs and executes changes safely.</p>
                </div>
                <div className="bg-card p-4 rounded-xl border border-border text-xs">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/50">
                    <span className="font-mono text-muted-foreground">src/app.ts</span>
                    <span className="text-emerald-400 font-semibold text-[10px] uppercase">Ready to Apply</span>
                  </div>
                  <div className="font-mono space-y-1">
                    <div className="text-rose-400 bg-rose-400/10 px-1 rounded">- const old = true;</div>
                    <div className="text-emerald-400 bg-emerald-400/10 px-1 rounded">+ const active = true;</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
