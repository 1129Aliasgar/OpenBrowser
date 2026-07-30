import { Cpu, Terminal, Globe, Lock, Code, Layers } from "lucide-react";
import CTABanner from "@/components/cta-banner";
import BridgeArchitecture from "@/components/bridge-architecture";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "OpenBrowser Architecture — Fastify, SSE & Chrome Extension Specs",
  description: "Technical architecture deep dive into OpenBrowser's Fastify bridge server, Server-Sent Events, MV3 Chrome extension, and local operation executor.",
};

export default function ArchitecturePage() {
  return (
    <div className="py-12 bg-background space-y-16">
      <div className="container mx-auto px-4 max-w-4xl text-center space-y-4 pt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20 text-xs font-semibold uppercase tracking-wider">
          <Cpu className="w-3.5 h-3.5" />
          <span>System Design Specs</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-foreground">
          System <span className="text-gradient-orange">Architecture</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          An open, transparent look at how OpenBrowser processes jobs, attaches context, and validates file operations locally.
        </p>
      </div>

      <BridgeArchitecture />

      <div className="container mx-auto px-4 max-w-5xl space-y-8">
        <h2 className="text-2xl font-bold text-foreground text-center">Core Subsystems</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-card border border-border space-y-3">
            <Terminal className="w-8 h-8 text-[#FF8C00]" />
            <h3 className="font-bold text-lg text-foreground">1. CLI &amp; Prompt Input</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Built with Commander and Enquirer. Parses `@path` attachments, calculates character limits, and formats prompt instructions using system templates in `src/prompts/system.ts`.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border space-y-3">
            <Cpu className="w-8 h-8 text-[#38BDF8]" />
            <h3 className="font-bold text-lg text-foreground">2. Fastify Bridge Engine</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              High-performance Fastify server listening on port 5000. Utilizes real-time Server-Sent Events (`/browser/events`) to stream jobs directly to the extension.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border space-y-3">
            <Globe className="w-8 h-8 text-emerald-400" />
            <h3 className="font-bold text-lg text-foreground">3. Operation Executor</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Validates JSON responses against Zod schemas. Generates colored diff previews and applies approved changes to disk while logging history to `.openbrowser/history.json`.
            </p>
          </div>
        </div>
      </div>

      <CTABanner />
    </div>
  );
}
