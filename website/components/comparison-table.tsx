

import { Check, X, Sparkles, HelpCircle } from "lucide-react";

export default function ComparisonTable() {
  const criteria = [
    { name: "Monthly API Cost", openbrowser: "$0 (Free)", apiAgents: "$20–$100+/mo", manual: "$0" },
    { name: "Requires API Keys", openbrowser: "No", apiAgents: "Yes (OpenAI / Anthropic)", manual: "No" },
    { name: "Uses Existing AI Subscription", openbrowser: "Yes (ChatGPT / Claude / Gemini)", apiAgents: "No", manual: "Yes" },
    { name: "Automated File Diffs & Apply", openbrowser: "Yes (Unified diffs)", apiAgents: "Yes", manual: "No (Manual copy-paste)" },
    { name: "Context Attachment (@file/@folder)", openbrowser: "Yes", apiAgents: "Yes", manual: "Manual copy-paste" },
    { name: "Local First Data Security", openbrowser: "100% Localhost (:5000)", apiAgents: "Varies (Cloud proxies)", manual: "Yes" },
    { name: "Supports 7+ AI Provider Tabs", openbrowser: "Yes", apiAgents: "Limited to API endpoints", manual: "Yes" },
    { name: "Auto Large Attachment (>12k char)", openbrowser: "Yes (.txt prompt file)", apiAgents: "Context token overflow", manual: "Manual file drop" },
  ];

  return (
    <section className="py-20 bg-background relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF8C00]/10 text-[#FF8C00] border border-[#FF8C00]/20 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Why OpenBrowser Wins</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground">
            OpenBrowser vs. Paid Agents vs. Manual Copying
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            Stop paying duplicate subscription fees for API access when you already pay for ChatGPT Plus or Claude Pro in the browser.
          </p>
        </div>

        {/* Table */}
        <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-xs sm:text-sm uppercase font-semibold text-muted-foreground">
                  <th className="p-4 sm:p-5 w-1/3">Feature / Capability</th>
                  <th className="p-4 sm:p-5 bg-orange-500/10 text-[#FF8C00] font-bold border-x border-orange-500/20 w-1/4">
                    OpenBrowser (Free)
                  </th>
                  <th className="p-4 sm:p-5 text-muted-foreground w-1/4">Paid API Agents</th>
                  <th className="p-4 sm:p-5 text-muted-foreground w-1/4">Manual Copy-Paste</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs sm:text-sm">
                {criteria.map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 sm:p-5 font-medium text-foreground">{item.name}</td>
                    <td className="p-4 sm:p-5 bg-orange-500/5 font-bold text-foreground border-x border-orange-500/10">
                      <span className="flex items-center gap-2 text-[#FF8C00]">
                        <Check className="w-4 h-4 text-[#FF8C00]" /> {item.openbrowser}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 text-muted-foreground">
                      {item.apiAgents.includes("No") ? (
                        <span className="flex items-center gap-1.5 text-muted-foreground"><X className="w-4 h-4 text-red-400" /> {item.apiAgents}</span>
                      ) : (
                        item.apiAgents
                      )}
                    </td>
                    <td className="p-4 sm:p-5 text-muted-foreground">
                      {item.manual.includes("No") ? (
                        <span className="flex items-center gap-1.5 text-muted-foreground"><X className="w-4 h-4 text-red-400" /> {item.manual}</span>
                      ) : (
                        item.manual
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
