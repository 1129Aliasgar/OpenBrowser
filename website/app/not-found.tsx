"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Terminal, Menu, X, ArrowLeft, ArrowUpRight, Github, Sparkles, AlertCircle } from "lucide-react";

export default function NotFound() {
  const textRef = useRef<HTMLDivElement>(null);
  const [scaleY, setScaleY] = useState<number>(1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Measure text element height and compute dynamic vertical scaling factor
  useEffect(() => {
    const calculateScale = () => {
      if (textRef.current) {
        const offsetHeight = textRef.current.offsetHeight;
        if (offsetHeight > 0) {
          const calculatedScale = (window.innerHeight / offsetHeight) * 1.4;
          setScaleY(calculatedScale);
        }
      }
    };

    calculateScale();
    window.addEventListener("resize", calculateScale);
    return () => window.removeEventListener("resize", calculateScale);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col justify-between relative select-none font-sans bg-background">
      {/* Background Dark Gradient */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: "linear-gradient(180deg, #0B0B0F 0%, #12131A 55%, #181A20 100%)",
        }}
      />

      {/* Background 404 Text & Glowing Oval Layer */}
      <div
        className="absolute inset-0 pointer-events-none opacity-80 z-0 flex items-center justify-center overflow-hidden"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 95%)",
          maskImage: "linear-gradient(to bottom, black 40%, transparent 95%)",
        }}
      >
        {/* Giant 404 Text */}
        <div
          ref={textRef}
          className="font-black leading-none tracking-tighter whitespace-nowrap transition-transform duration-300 ease-out"
          style={{
            color: "rgba(238, 139, 80, 0.08)",
            fontSize: "clamp(220px, 48vw, 850px)",
            transform: `scale(1.15, ${scaleY})`,
          }}
        >
          404
        </div>

        {/* Orange Glowing Oval Overlay */}
        <div
          className="absolute rounded-full pointer-events-none blur-3xl transition-transform duration-300"
          style={{
            backgroundColor: "#EE8B50",
            opacity: 0.12,
            height: "clamp(200px, 40vh, 600px)",
            width: "clamp(120px, 20vw, 400px)",
            transform: `scale(1.15, ${scaleY})`,
          }}
        />
      </div>

      {/* NAVIGATION BAR */}
      <nav className="relative z-20 flex justify-between items-center px-4 sm:px-6 md:px-12 py-4 sm:py-5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/assets/logo.svg"
            alt="OpenBrowser Logo"
            width={1536}
            height={420}
            className="h-[clamp(30px,2.5vw,42px)] w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            priority
          />
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-2">
          {["Features", "How It Works", "Documentation", "GitHub", "Blog"].map((item, idx) => {
            const hrefs: Record<string, string> = {
              Features: "/features",
              "How It Works": "/how-it-works",
              Documentation: "/docs/getting-started",
              GitHub: "https://github.com/1129Aliasgar/OpenBrowser",
              Blog: "/features",
            };
            const isExternal = item === "GitHub";

            return isExternal ? (
              <a
                key={idx}
                href={hrefs[item]}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full px-4 py-2 text-sm font-medium text-foreground border transition-all duration-300 hover:bg-[#EE8B50] hover:text-foreground hover:border-[#EE8B50]"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderColor: "rgba(255,255,255,0.08)",
                }}
              >
                {item}
              </a>
            ) : (
              <Link
                key={idx}
                href={hrefs[item]}
                prefetch={true}
                className="rounded-full px-4 py-2 text-sm font-medium text-foreground border transition-all duration-300 hover:bg-[#EE8B50] hover:text-foreground hover:border-[#EE8B50]"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderColor: "rgba(255,255,255,0.08)",
                }}
              >
                {item}
              </Link>
            );
          })}
        </div>

        {/* Menu Button (Pill) */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-foreground bg-[#EE8B50] hover:opacity-90 transition-opacity shadow-lg shadow-[#EE8B50]/20"
        >
          <Menu className="w-4 h-4" />
          <span>Menu</span>
        </button>
      </nav>

      {/* CENTER ANIMATED AI HARNESS GRAPHIC / DEMO */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        style={{ marginTop: "calc(-6vh - 40px)" }}
      >
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
          {/* Pulsing Concentric Glowing Rings */}
          <div className="absolute inset-0 rounded-full border border-[#EE8B50]/20 animate-ping opacity-20" />
          <div className="absolute w-48 h-48 rounded-full border border-[#EE8B50]/30 animate-pulse" />
          <div className="absolute w-36 h-36 rounded-full bg-radial from-[#EE8B50]/30 to-transparent blur-xl" />

          {/* Central Animated Floating AI Orb */}
          <div className="relative z-10 p-6 rounded-3xl bg-card/90 border border-border shadow-2xl backdrop-blur-xl flex flex-col items-center gap-3 animate-bounce" style={{ animationDuration: "4s" }}>
            <div className="w-12 h-12 rounded-2xl bg-[#EE8B50]/20 border border-[#EE8B50]/40 flex items-center justify-center text-[#EE8B50]">
              <AlertCircle className="w-6 h-6 animate-pulse" />
            </div>
            <div className="font-mono text-xs text-muted-foreground text-center">
              <span className="text-[#EE8B50]">$</span> openbrowser status
              <div className="text-[10px] text-muted-foreground mt-1">404: Path Not Found</div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM CONTENT */}
      <div className="relative z-20 pb-12 sm:pb-16 text-center px-4 max-w-2xl mx-auto space-y-4">
        <h1 className="text-foreground font-medium text-xl md:text-2xl tracking-tight">
          Looks like this page escaped the workspace.
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist, but your AI agent is still online.
        </p>

        <div className="pt-2">
          <Link href="/">
            <button className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-foreground bg-[#EE8B50] hover:bg-[#D9773F] transition-all transform hover:scale-[1.03] shadow-xl shadow-[#EE8B50]/25">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
          </Link>
        </div>
      </div>

      {/* MOBILE MENU DRAWER OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-md transition-opacity">
          <div
            className="w-full max-w-md h-full p-6 flex flex-col justify-between shadow-2xl space-y-6 overflow-y-auto"
            style={{
              background: "linear-gradient(135deg, #14161D, #1A1D26, #20242D)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Image
                  src="/assets/logo.svg"
                  alt="OpenBrowser Logo"
                  width={1536}
                  height={420}
                  className="h-[clamp(30px,2.5vw,42px)] w-auto object-contain"
                  priority
                />
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-foreground flex items-center justify-center transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex flex-col gap-3 my-auto">
              {[
                { name: "Features", href: "/features" },
                { name: "How It Works", href: "/how-it-works" },
                { name: "Documentation", href: "/docs/getting-started" },
                { name: "Blog", href: "/features" },
                { name: "GitHub", href: "https://github.com/1129Aliasgar/OpenBrowser" },
                { name: "FAQ", href: "/faq" },
              ].map((item, idx) => (
                <Link
                  key={idx}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-4 rounded-2xl bg-white/5 hover:bg-[#EE8B50] text-foreground font-medium text-base transition-all flex items-center justify-between group"
                >
                  <span>{item.name}</span>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="pt-4 border-t border-white/10">
              <a
                href="https://github.com/1129Aliasgar/OpenBrowser"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-full py-3.5 px-6 bg-[#EE8B50] hover:bg-[#D9773F] text-foreground font-semibold transition-transform transform hover:scale-[1.02] shadow-lg shadow-[#EE8B50]/30"
              >
                <span>View on GitHub</span>
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
