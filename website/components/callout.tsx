import { AlertTriangle, Info, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalloutProps {
  type?: "default" | "warning" | "idea";
  title?: string;
  children: React.ReactNode;
}

export function Callout({
  children,
  type = "default",
  title,
}: CalloutProps) {
  const isWarning = type === "warning";
  const isIdea = type === "idea";

  return (
    <div
      className={cn(
        "my-6 flex items-start gap-4 rounded-xl border p-4",
        isWarning
          ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-900 dark:text-yellow-200"
          : isIdea
          ? "border-blue-500/20 bg-blue-500/10 text-blue-900 dark:text-blue-200"
          : "border-border bg-muted/50"
      )}
    >
      <div className="mt-0.5">
        {isWarning ? (
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
        ) : isIdea ? (
          <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-500" />
        ) : (
          <Info className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="w-full">
        {title && <div className="font-semibold mb-1">{title}</div>}
        <div className="text-sm prose-p:my-0 prose-p:leading-relaxed text-inherit">
          {children}
        </div>
      </div>
    </div>
  );
}
