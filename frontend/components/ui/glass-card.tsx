import * as React from "react";
import { cn } from "@/lib/utils";

export function GlassCard({ level = 1, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { level?: 1 | 2 | 3 }) {
  const levelClass = level === 1 ? "glass" : level === 2 ? "glass-raised" : "glass-overlay";
  return <div className={cn(levelClass, "text-card-foreground", className)} {...props} />;
}
