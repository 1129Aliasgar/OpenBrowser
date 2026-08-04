"use client";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Laptop, Check } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Avoid hydration mismatch by waiting for client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-full border border-transparent bg-transparent" />
    );
  }

  const toggleDropdown = () => setIsOpen((prev) => !prev);

  const renderIcon = () => {
    if (resolvedTheme === "dark") return <Moon className="w-4 h-4 text-muted-foreground" />;
    if (resolvedTheme === "light") return <Sun className="w-4 h-4 text-muted-foreground" />;
    return <Laptop className="w-4 h-4 text-muted-foreground" />;
  };

  const getTooltipText = () => {
    if (theme === "system") return "System Theme";
    if (theme === "dark") return "Dark Mode";
    return "Light Mode";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        title={getTooltipText()}
        className="flex items-center justify-center w-10 h-10 rounded-full border border-border 
                   bg-black/5 dark:bg-white/[0.04]
                   hover:scale-105 hover:border-brand/50 hover:shadow-[0_0_15px_rgba(238,139,80,0.3)]
                   transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-background"
        aria-label="Toggle theme"
        aria-expanded={isOpen}
      >
        {renderIcon()}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 rounded-xl border border-border bg-popover shadow-lg overflow-hidden z-50">
          <div className="p-1 flex flex-col gap-0.5">
            <button
              onClick={() => { setTheme("system"); setIsOpen(false); }}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors
                ${theme === "system" ? "bg-background text-foreground" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
            >
              <Laptop className="w-4 h-4" />
              <span>System</span>
              {theme === "system" && <Check className="w-3.5 h-3.5 ml-auto text-brand" />}
            </button>
            <button
              onClick={() => { setTheme("dark"); setIsOpen(false); }}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors
                ${theme === "dark" ? "bg-background text-foreground" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
            >
              <Moon className="w-4 h-4" />
              <span>Dark</span>
              {theme === "dark" && <Check className="w-3.5 h-3.5 ml-auto text-brand" />}
            </button>
            <button
              onClick={() => { setTheme("light"); setIsOpen(false); }}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors
                ${theme === "light" ? "bg-background text-foreground" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
            >
              <Sun className="w-4 h-4" />
              <span>Light</span>
              {theme === "light" && <Check className="w-3.5 h-3.5 ml-auto text-brand" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
