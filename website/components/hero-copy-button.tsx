"use client";

import { useState } from "react";
import { Terminal, Copy, Check } from "lucide-react";

export function HeroCopyButton() {
  const [copied, setCopied] = useState(false);
  const commandText = "git clone https://github.com/1129Aliasgar/OpenBrowser.git && cd OpenBrowser && pnpm install";

  const handleCopy = () => {
    navigator.clipboard.writeText(commandText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative flex items-center justify-between gap-3 p-2 sm:p-2.5 rounded-2xl bg-card border border-border shadow-2xl hover:border-[#EE8B50]/40 transition-all">
      <div className="flex items-center gap-2.5 overflow-x-auto pl-3 text-xs sm:text-sm font-mono text-foreground whitespace-nowrap scrollbar-none">
        <Terminal className="w-4 h-4 text-[#EE8B50] shrink-0" />
        <span className="text-muted-foreground">$</span>
        <span>{commandText}</span>
      </div>
      <button
        onClick={handleCopy}
        className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-popover hover:bg-[#262A33] text-foreground border border-border hover:text-[#EE8B50] transition-all"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400">Copied</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>Copy</span>
          </>
        )}
      </button>
    </div>
  );
}
