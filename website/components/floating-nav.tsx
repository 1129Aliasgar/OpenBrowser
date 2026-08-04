"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Terminal, Sparkles, Github, ArrowUpRight } from "lucide-react";

export default function FloatingNav() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show floating bottom pill after scrolling down 200px
      setVisible(window.scrollY > 200);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in transition-all duration-300">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-card/90 border border-border shadow-2xl backdrop-blur-xl glow-orange-sm">
        {/* Brand Icon */}
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/assets/logo.svg"
            alt="OpenBrowser Logo"
            width={120}
            height={32}
            className="h-[clamp(24px,2vw,32px)] w-auto hidden sm:block group-hover:scale-105 transition-transform"
          />
          {/* For mobile, we can just show the favicon/logo mark if wanted, but since the full logo is requested, we'll display a smaller version or just rely on the hidden sm:block above if they want it responsive, but let's just make it visible everywhere as a 5 h-5 image instead of text */}
          <Image
            src="/assets/favicon.svg"
            alt="OpenBrowser Icon"
            width={24}
            height={24}
            className="h-5 w-5 sm:hidden group-hover:scale-105 transition-transform"
          />
        </Link>

        <div className="h-4 w-px bg-[#262A33]" />

        {/* Links */}
        <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
          <Link href="/features" className="hover:text-[#EE8B50] transition-colors hidden md:inline">
            Features
          </Link>
          <Link href="/how-it-works" className="hover:text-[#EE8B50] transition-colors hidden md:inline">
            How It Works
          </Link>
          <Link href="/docs/getting-started" className="hover:text-[#EE8B50] transition-colors">
            Docs
          </Link>
        </div>

        {/* CTA Button */}
        <Link href="/docs/getting-started">
          <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EE8B50] hover:bg-[#D9773F] text-foreground text-xs font-semibold shadow-md shadow-[#EE8B50]/20 transition-all hover:scale-105">
            <Sparkles className="w-3 h-3" />
            <span>Get Started</span>
          </button>
        </Link>
      </div>
    </div>
  );
}
