import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog | OpenBrowser",
  description: "Read the latest news, updates, and engineering deep dives from the OpenBrowser team.",
};

const posts = [
  {
    title: "Introducing OpenBrowser",
    description: "The AI coding agent that runs locally without API keys.",
    date: "July 24, 2026",
    readingTime: "3 min read",
    href: "/blog/introducing-openbrowser",
  },
];

export default function BlogPage() {
  return (
    <main className="flex-1 relative overflow-hidden bg-background pt-24 pb-16">
      <div className="container px-4 md:px-6 relative z-10 max-w-4xl mx-auto">
        <div className="flex flex-col items-start gap-4 mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">Blog</h1>
          <p className="text-xl text-muted-foreground">
            News, updates, and engineering deep dives from the OpenBrowser team.
          </p>
        </div>

        <div className="grid gap-8">
          {posts.map((post, i) => (
            <article key={i} className="group relative flex flex-col items-start justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/50">
              <div className="flex items-center gap-x-4 text-xs">
                <Image
                  src="/assets/favicon.svg"
                  alt="OpenBrowser Logo"
                  width={16}
                  height={16}
                  className="w-4 h-4"
                />
                <time dateTime={post.date} className="text-muted-foreground">
                  {post.date}
                </time>
                <span className="text-muted-foreground">&middot;</span>
                <span className="text-muted-foreground">{post.readingTime}</span>
              </div>
              <div className="group relative">
                <h3 className="mt-3 text-2xl font-semibold leading-6 text-foreground group-hover:text-primary">
                  <Link href={post.href}>
                    <span className="absolute inset-0" />
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-5 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {post.description}
                </p>
              </div>
              <div className="mt-6 flex items-center text-sm font-medium text-primary">
                Read article <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
