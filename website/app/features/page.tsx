import { Metadata } from "next";
import FeaturesGrid from "@/components/features-grid";
import ComparisonTable from "@/components/comparison-table";
import CTABanner from "@/components/cta-banner";

export const metadata: Metadata = {
  title: "OpenBrowser Features — AI Coding Agent Without API Keys",
  description: "Explore OpenBrowser features: Ask Mode, Agent Mode, Unified Diffs, @file attachments, and auto prompt attachments.",
};

export default function FeaturesPage() {
  return (
    <div className="py-12 bg-background space-y-12">
      <div className="container mx-auto px-4 max-w-4xl text-center space-y-4 pt-6">
        <h1 className="text-4xl sm:text-6xl font-extrabold text-foreground">
          OpenBrowser <span className="text-gradient-orange">Capabilities</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Complete feature breakdown of the CLI harness, Fastify bridge server, and Chrome extension.
        </p>
      </div>

      <FeaturesGrid />
      <ComparisonTable />
      <CTABanner />
    </div>
  );
}
