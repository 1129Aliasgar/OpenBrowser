"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Terminal, Github, Sparkles, Menu, X, ArrowUpRight } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);

    fetch("https://api.github.com/repos/1129Aliasgar/OpenBrowser")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.stargazers_count === "number") {
          setStars(data.stargazers_count);
        }
      })
      .catch(() => setStars(128));

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-background/90 backdrop-blur-md border-b border-border shadow-2xl"
          : "bg-transparent border-b border-border/40"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between max-w-7xl">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/assets/logo.svg"
            alt="OpenBrowser Logo"
            width={240}
            height={48}
            className="w-auto h-[28px] sm:h-[30px] md:h-[34px] lg:h-[38px] xl:h-[44px] group-hover:scale-[1.02] transition-transform"
            priority
          />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
          <Link href="/features" prefetch={true} className="hover:text-[#EE8B50] transition-colors">
            Features
          </Link>
          <Link href="/how-it-works" className="hover:text-[#EE8B50] transition-colors">
            How It Works
          </Link>
          <Link href="/architecture" className="hover:text-[#EE8B50] transition-colors">
            Architecture
          </Link>
          <Link href="/providers" className="hover:text-[#EE8B50] transition-colors flex items-center gap-1.5">
            AI Providers
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#EE8B50]/10 text-[#EE8B50] border border-[#EE8B50]/20 rounded-full font-mono">
              7 Active
            </span>
          </Link>
          <Link href="/docs/getting-started" prefetch={true} className="hover:text-[#EE8B50] transition-colors">
            Docs
          </Link>
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <a
            href="https://github.com/1129Aliasgar/OpenBrowser"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-full bg-card hover:bg-popover text-muted-foreground border border-border hover:border-[#EE8B50]/50 transition-all group"
          >
            <Github className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
            <span>GitHub</span>
            <span className="px-1.5 py-0.5 rounded-full bg-background text-[#EE8B50] font-mono text-[10px] border border-border">
              {stars !== null ? `★ ${stars}` : "★ 128"}
            </span>
          </a>

          <Link href="/docs/getting-started" prefetch={true}>
            <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full bg-[#EE8B50] hover:bg-[#D9773F] text-foreground shadow-[0_0_20px_rgba(238,139,80,0.3)] transition-all hover:scale-105">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Get Started</span>
            </button>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-lg bg-card border border-border"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-card border-b border-border px-4 pt-3 pb-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <span className="text-sm font-medium text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <div className="flex flex-col space-y-2 text-sm font-medium text-muted-foreground">
            <Link
              href="/features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-popover hover:text-[#EE8B50]"
            >
              Features
            </Link>
            <Link
              href="/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-popover hover:text-[#EE8B50]"
            >
              How It Works
            </Link>
            <Link
              href="/architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-popover hover:text-[#EE8B50]"
            >
              Architecture
            </Link>
            <Link
              href="/providers"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-popover hover:text-[#EE8B50] flex items-center justify-between"
            >
              <span>AI Providers</span>
              <span className="text-xs text-[#EE8B50] font-mono">7 Active</span>
            </Link>
            <Link
              href="/docs/getting-started"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-popover hover:text-[#EE8B50]"
            >
              Documentation
            </Link>
          </div>

          <div className="pt-2 border-t border-border flex flex-col gap-2">
            <a
              href="https://github.com/1129Aliasgar/OpenBrowser"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-popover text-foreground text-sm font-semibold border border-border"
            >
              <Github className="w-4 h-4 text-muted-foreground" />
              <span>GitHub Repository</span>
            </a>
            <Link href="/docs/getting-started" onClick={() => setMobileMenuOpen(false)}>
              <button className="w-full py-2.5 rounded-full bg-[#EE8B50] text-foreground font-semibold text-sm">
                Get Started Free
              </button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
