import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

const flatLinks = [
  { href: "/docs/getting-started", title: "Installation" },
  { href: "/docs/getting-started/cli", title: "CLI Overview" },
  { href: "/docs/architecture", title: "Bridge Server" },
  { href: "/docs/architecture/extension", title: "Chrome Extension" },
];

export function DocsPager({ pathname }: { pathname: string }) {
  const currentIndex = flatLinks.findIndex((l) => l.href === pathname);
  
  if (currentIndex === -1) return null;

  const prev = currentIndex > 0 ? flatLinks[currentIndex - 1] : null;
  const next = currentIndex < flatLinks.length - 1 ? flatLinks[currentIndex + 1] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8 mt-12 border-t border-border">
      {prev ? (
        <Link
          href={prev.href}
          className="group flex flex-col w-full sm:w-1/2 p-4 rounded-xl border border-border hover:border-primary/50 transition-colors"
        >
          <span className="text-xs text-muted-foreground mb-1 flex items-center">
            <ArrowLeft className="w-3 h-3 mr-1" />
            Previous
          </span>
          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div className="w-full sm:w-1/2" />
      )}
      {next && (
        <Link
          href={next.href}
          className="group flex flex-col w-full sm:w-1/2 p-4 rounded-xl border border-border hover:border-primary/50 transition-colors items-end text-right"
        >
          <span className="text-xs text-muted-foreground mb-1 flex items-center justify-end">
            Next
            <ArrowRight className="w-3 h-3 ml-1" />
          </span>
          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {next.title}
          </span>
        </Link>
      )}
    </div>
  );
}
