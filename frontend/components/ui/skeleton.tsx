"use client";

import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

function SkeletonText({
  className,
  lines = 3,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { lines?: number }) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-muted rounded animate-pulse" style={{ width: i === lines - 1 ? "60%" : "100%" }} />
      ))}
    </div>
  );
}

function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card p-6 space-y-4", className)} {...props}>
      <Skeleton className="h-6 w-1/4" />
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

function SkeletonTableRow({ columns = 6, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { columns?: number }) {
  return (
    <div className={cn("grid gap-4", className)} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }} {...props}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-10" />
      ))}
    </div>
  );
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonTableRow };