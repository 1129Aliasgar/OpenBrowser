export default function ArchitectureIntro() {
  return (
    <section className="py-16 sm:py-24 bg-background border-t border-border/50">
      <div className="container mx-auto px-4 max-w-4xl text-center space-y-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
          Local-First AI Development Architecture
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
          OpenBrowser is built around a local-first architecture that enables developers to use browser-based AI assistants—such as ChatGPT, Claude, Gemini, Grok, DeepSeek, and Perplexity—as powerful coding agents without requiring API keys.
        </p>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
          Instead of communicating directly with provider APIs, OpenBrowser orchestrates a local workflow between the CLI, a local bridge server, the browser extension, and the AI provider running in your browser.
        </p>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
          Every request flows through a structured pipeline designed for streaming responses, file-aware context, and safe workspace operations.
        </p>
      </div>
    </section>
  );
}
