import DocsSidebar from "@/components/docs-sidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto px-4 max-w-7xl flex gap-10">
      <DocsSidebar />
      <main className="flex-1 py-10 min-w-0 prose prose-slate dark:prose-invert max-w-4xl">
        {children}
      </main>
    </div>
  );
}
