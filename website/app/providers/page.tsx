import ProvidersGrid from "@/components/providers-grid";
import CTABanner from "@/components/cta-banner";

export const metadata = {
  title: "Supported AI Providers — ChatGPT, Claude, Gemini, DeepSeek, Grok",
  description: "Check supported browser AI providers in OpenBrowser: ChatGPT, Claude, Gemini, DeepSeek, Perplexity, Grok, and GLM.",
};

export default function ProvidersPage() {
  return (
    <div className="py-12 bg-background space-y-12">
      <div className="container mx-auto px-4 max-w-4xl text-center space-y-4 pt-6">
        <h1 className="text-4xl sm:text-6xl font-extrabold text-foreground">
          Supported <span className="text-gradient-orange">AI Providers</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          OpenBrowser connects with all major browser-based AI chats so you can use your existing accounts without API key costs.
        </p>
      </div>

      <ProvidersGrid />
      <CTABanner />
    </div>
  );
}
