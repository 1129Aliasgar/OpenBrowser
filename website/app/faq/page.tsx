import FAQAccordion from "@/components/faq-accordion";
import CTABanner from "@/components/cta-banner";

export const metadata = {
  title: "OpenBrowser FAQ — Frequently Asked Questions",
  description: "Get answers about OpenBrowser setup, ChatGPT coding, Claude coding, API keys, security, and browser extension troubleshooting.",
};

export default function FAQPage() {
  return (
    <div className="py-12 bg-background space-y-12">
      <FAQAccordion />
      <CTABanner />
    </div>
  );
}
