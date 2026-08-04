"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export default function FAQAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "Can ChatGPT be used for coding?",
      a: "Yes. ChatGPT is widely used for coding help, but the browser UI is not built for editing a whole project repository. OpenBrowser lets you use ChatGPT for coding from your terminal: send prompts from your repo, get answers in the terminal, and in agent mode apply multi-file changes with unified diff previews — still using your ChatGPT browser subscription, not an API key.",
    },
    {
      q: "How to use ChatGPT for free coding?",
      a: "1. Open chatgpt.com in Chrome (free or Plus plan).\n2. Install the OpenBrowser Chrome extension and run `openbrowser` in your project folder.\n3. Run `openbrowser ask \"...\"` for Q&A or `openbrowser agent \"...\"` for multi-file edits.\nYou get a free AI coding workflow as long as your browser plan allows chat — no separate API subscription required.",
    },
    {
      q: "How to use Claude for free coding?",
      a: "Keep a claude.ai tab open in Chrome, load the OpenBrowser extension, and run `openbrowser ask` or `openbrowser agent` from your project folder. OpenBrowser automatically sends prompts and returns responses to your terminal so you can use Claude for free coding without needing an Anthropic API key.",
    },
    {
      q: "Do I need an API key or paid AI subscription?",
      a: "No API key is required. OpenBrowser does not call OpenAI, Anthropic, or Google APIs directly — it bridges your existing browser AI subscription (including free tiers). If you already use ChatGPT, Claude, or Gemini in the browser, you can use them as your AI agent for local development.",
    },
    {
      q: "Is OpenBrowser a free alternative to API-based coding agents?",
      a: "OpenBrowser is a free, open-source AI harness for developers who prefer browser AI over API billing. It delivers ask mode, agent mode with unified diffs, and project context — powered by the AI subscription you already have in the browser.",
    },
    {
      q: "What is an AI harness?",
      a: "In this project, an AI harness is the local bridge (CLI + Fastify server + Chrome extension) that wires browser chat to your workspace: queue prompts, inject them into the AI composer, capture replies, and apply file operations safely on your machine.",
    },
    {
      q: "What happens if a prompt exceeds the browser paste limit?",
      a: "When a prompt (including system instructions and @ context) exceeds 12,000 characters by default, OpenBrowser automatically saves the full text to `.openbrowser/prompts/<session>.txt` and the extension uploads it as `openbrowser-prompt.txt` instead of pasting into the composer.",
    },
    {
      q: "Is my source code private?",
      a: "Yes. OpenBrowser runs locally on `127.0.0.1`. No code is sent to any central OpenBrowser cloud server or telemetry network. You inspect and approve every file modification prior to disk execution.",
    },
  ];

  return (
    <section id="faq" className="py-20 bg-background border-t border-[#181D2A] relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF8C00]/10 text-[#FF8C00] border border-[#FF8C00]/20 text-xs font-semibold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground">
            Everything You Need to Know
          </h2>
          <p className="text-muted-foreground text-base">
            Clear answers about how OpenBrowser works with your browser AI tabs.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => {
            const isOpen = openIdx === i;
            return (
              <div
                key={i}
                className="rounded-xl bg-card border border-border overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-bold text-base sm:text-lg text-foreground hover:text-[#FF8C00] transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-[#FF8C00]" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 text-muted-foreground text-sm leading-relaxed whitespace-pre-line border-t border-border pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
