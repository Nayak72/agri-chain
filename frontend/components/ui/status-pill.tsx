import { cn } from "@/lib/utils";
import { statusMap } from "@/lib/status-map";

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const definition = statusMap[status] ?? { label: status.replaceAll("_", " ").toLowerCase(), tone: "neutral" as const };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", {
      "border-success/30 bg-success/10 text-success": definition.tone === "success",
      "border-warning/30 bg-warning/10 text-warning": definition.tone === "warning",
      "border-destructive/30 bg-destructive/10 text-destructive": definition.tone === "danger",
      "border-info/30 bg-info/10 text-info": definition.tone === "info",
      "border-border bg-muted text-muted-foreground": definition.tone === "neutral",
    }, className)}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {definition.label}
    </span>
  );
}
