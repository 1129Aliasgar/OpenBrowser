import { Terminal, FileCode, Workflow, Server, Chrome, BrainCircuit, Cpu, Hammer } from "lucide-react";

export default function CoreComponents() {
  const components = [
    {
      icon: <Terminal className="w-6 h-6" />,
      title: "OpenBrowser CLI",
      description: "The developer's entry point. Handles parsing user input, attachments, and flags.",
      responsibilities: ["Parse input arguments", "Initiate the session", "Calculate character limits"],
    },
    {
      icon: <FileCode className="w-6 h-6" />,
      title: "Context Generation Engine",
      description: "Reads local files specified by the user and intelligently bundles them into a structured context payload.",
      responsibilities: ["Read file contents", "Handle @path references", "Prevent context window overflow"],
    },
    {
      icon: <Workflow className="w-6 h-6" />,
      title: "Prompt Builder",
      description: "Combines the user prompt, file context, and strictly formatted system instructions to ensure the AI responds predictably.",
      responsibilities: ["Inject system templates", "Format file structures", "Enforce JSON output for operations"],
    },
    {
      icon: <Server className="w-6 h-6" />,
      title: "Bridge Server",
      description: "A high-performance Fastify local server that routes messages between the CLI and the browser via Server-Sent Events (SSE).",
      responsibilities: ["Maintain SSE connections", "Queue AI prompts", "Stream responses back to CLI"],
    },
    {
      icon: <Chrome className="w-6 h-6" />,
      title: "Browser Extension",
      description: "A Manifest V3 extension that listens to the Bridge Server and interacts with the AI provider's DOM.",
      responsibilities: ["Inject text into composers", "Click submit buttons", "Scrape AI responses in real-time"],
    },
    {
      icon: <BrainCircuit className="w-6 h-6" />,
      title: "Provider Layer",
      description: "The underlying AI chat interface (e.g., ChatGPT, Claude) running inside the browser tab.",
      responsibilities: ["Process the prompt", "Generate intelligent responses", "Output formatted JSON blocks"],
    },
    {
      icon: <Cpu className="w-6 h-6" />,
      title: "Parser",
      description: "Listens to the incoming text stream and extracts actionable JSON blocks, ignoring conversational filler.",
      responsibilities: ["Identify JSON fences", "Validate with Zod schemas", "Prepare operation payloads"],
    },
    {
      icon: <Hammer className="w-6 h-6" />,
      title: "Operations Engine",
      description: "Safely executes the parsed instructions on the local filesystem, displaying colored unified diffs to the user for approval.",
      responsibilities: ["Render diff previews", "Apply file modifications", "Log operation history"],
    },
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Core Components</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            OpenBrowser relies on eight specialized subsystems working in harmony to deliver a seamless local AI developer experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {components.map((comp, idx) => (
            <div
              key={idx}
              className="flex flex-col p-6 rounded-2xl bg-card border border-border hover:border-[#EE8B50]/50 transition-colors shadow-sm group"
            >
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#EE8B50]/10 text-[#EE8B50] group-hover:scale-110 transition-transform">
                {comp.icon}
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{comp.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed flex-grow mb-6">
                {comp.description}
              </p>
              <div>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                  Responsibilities
                </h4>
                <ul className="space-y-2">
                  {comp.responsibilities.map((resp, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] mt-1 shrink-0" />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
