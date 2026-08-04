import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 bg-background pt-24 pb-16">
      <div className="container px-4 md:px-6 max-w-3xl mx-auto">
        <Link href="/blog" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back to Blog
        </Link>
        <article className="prose prose-slate dark:prose-invert max-w-none">
          {children}
        </article>
      </div>
    </main>
  );
}
