"use client";

import { Folder, FileCode, Terminal, Globe, Chrome, Puzzle } from "lucide-react";
import { useState } from "react";

export default function RepoStructure() {
  const [activeNode, setActiveNode] = useState("cli");

  const structure = [
    {
      id: "cli",
      icon: <Terminal className="w-4 h-4 text-[#EE8B50]" />,
      name: "src/cli",
      description: "Contains the Commander.js CLI implementation, argument parsers, and interactive prompts.",
    },
    {
      id: "bridge",
      icon: <Globe className="w-4 h-4 text-[#38BDF8]" />,
      name: "src/bridge",
      description: "The Fastify server implementation that handles SSE connections and queuing.",
    },
    {
      id: "extension",
      icon: <Chrome className="w-4 h-4 text-emerald-400" />,
      name: "browser-extension/",
      description: "Manifest V3 Chrome extension source. Contains background scripts and content scripts for DOM manipulation.",
    },
    {
      id: "core",
      icon: <Puzzle className="w-4 h-4 text-purple-400" />,
      name: "src/core",
      description: "Core logic for file operations, context bundling, the Zod parser, and history logging.",
    },
    {
      id: "website",
      icon: <FileCode className="w-4 h-4 text-rose-400" />,
      name: "website/",
      description: "This Next.js 15 documentation website and landing page.",
    },
  ];

  return (
    <section className="py-24 bg-[#0a0a0a] border-t border-border">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Repository Structure</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            The OpenBrowser monorepo is cleanly organized into independent packages.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 max-w-4xl mx-auto">
          {/* Tree view */}
          <div className="flex-1 bg-card rounded-2xl border border-border p-6 font-mono text-sm shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <Folder className="w-4 h-4" />
              <span>openbrowser/</span>
            </div>
            <div className="pl-6 border-l border-border/50 space-y-2 relative">
              {structure.map((node) => (
                <button
                  key={node.id}
                  onClick={() => setActiveNode(node.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left ${
                    activeNode === node.id 
                      ? "bg-muted text-foreground font-semibold" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {node.icon}
                  <span>{node.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Details view */}
          <div className="flex-1">
            {structure.map((node) => (
              activeNode === node.id && (
                <div key={node.id} className="h-full flex flex-col justify-center p-8 rounded-2xl bg-[#111] border border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-card border border-border">
                      {node.icon}
                    </div>
                    <h3 className="font-bold text-lg text-foreground font-mono">{node.name}</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {node.description}
                  </p>
                </div>
              )
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
