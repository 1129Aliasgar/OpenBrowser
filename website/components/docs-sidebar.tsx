"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const sidebarLinks = [
  {
    title: "Getting Started",
    links: [
      { href: "/docs/getting-started", title: "Installation" },
      { href: "/docs/getting-started/cli", title: "CLI Overview" },
    ],
  },
  {
    title: "Architecture",
    links: [
      { href: "/docs/architecture", title: "Bridge Server" },
      { href: "/docs/architecture/extension", title: "Chrome Extension" },
    ],
  },
];

export default function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto hidden md:block py-6 pr-6">
      <nav className="space-y-8">
        {sidebarLinks.map((group, i) => (
          <div key={i} className="space-y-3">
            <h4 className="font-semibold text-sm text-foreground tracking-tight">
              {group.title}
            </h4>
            <div className="flex flex-col space-y-1.5 border-l border-border ml-1">
              {group.links.map((link, j) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={j}
                    href={link.href}
                    className={cn(
                      "text-sm px-4 py-1 -ml-[1px] border-l-2 transition-colors",
                      isActive
                        ? "border-primary text-foreground font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                    )}
                  >
                    {link.title}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
