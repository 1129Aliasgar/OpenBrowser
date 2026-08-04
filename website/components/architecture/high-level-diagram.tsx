"use client";

import { LazyMotion, domAnimation, m } from "framer-motion";
import { User, Terminal, FileCode, Workflow, Server, Chrome, Puzzle, BrainCircuit, Activity, Cpu, Hammer, FolderSync, ArrowDown } from "lucide-react";

export default function HighLevelDiagram() {
  const steps = [
    { icon: <User className="w-5 h-5" />, label: "Developer" },
    { icon: <Terminal className="w-5 h-5" />, label: "CLI" },
    { icon: <FileCode className="w-5 h-5" />, label: "Context Engine" },
    { icon: <Workflow className="w-5 h-5" />, label: "Prompt Builder" },
    { icon: <Server className="w-5 h-5" />, label: "Bridge Server" },
    { icon: <Chrome className="w-5 h-5" />, label: "Browser Extension" },
    { icon: <Puzzle className="w-5 h-5" />, label: "Content Script" },
    { icon: <BrainCircuit className="w-5 h-5" />, label: "AI Provider" },
    { icon: <Activity className="w-5 h-5" />, label: "Streaming Response" },
    { icon: <Cpu className="w-5 h-5" />, label: "Parser" },
    { icon: <Hammer className="w-5 h-5" />, label: "Operations Engine" },
    { icon: <FolderSync className="w-5 h-5" />, label: "Project Files" },
  ];

  return (
    <section className="py-20 bg-[#0a0a0a] border-t border-border">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">High Level Architecture</h2>
          <p className="text-muted-foreground">The end-to-end flow of an OpenBrowser request.</p>
        </div>

        <LazyMotion features={domAnimation}>
          <div className="flex flex-col items-center gap-2 max-w-lg mx-auto">
            {steps.map((step, idx) => (
              <div key={idx} className="flex flex-col items-center w-full">
                <m.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  className="w-full flex items-center justify-center gap-4 p-4 rounded-xl bg-card border border-border shadow-md hover:border-[#EE8B50] hover:shadow-[#EE8B50]/20 transition-all cursor-default"
                >
                  <div className="text-[#EE8B50] bg-[#EE8B50]/10 p-2 rounded-lg">
                    {step.icon}
                  </div>
                  <span className="font-semibold text-foreground text-lg">{step.label}</span>
                </m.div>
                
                {idx < steps.length - 1 && (
                  <m.div
                    initial={{ opacity: 0, height: 0 }}
                    whileInView={{ opacity: 1, height: "auto" }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="py-2"
                  >
                    <ArrowDown className="w-6 h-6 text-muted-foreground/50 animate-bounce" />
                  </m.div>
                )}
              </div>
            ))}
          </div>
        </LazyMotion>
      </div>
    </section>
  );
}
