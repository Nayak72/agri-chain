"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "elevated" | "glass" | "metric" | "highlight" | "interactive" | "chart";
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variants: Record<string, string> = {
    default: "rounded-xl border border-border/60 bg-card text-card-foreground shadow-soft transition-all duration-300 hover:shadow-medium hover:border-border/80",
    elevated: "rounded-xl border border-border/40 bg-card text-card-foreground shadow-medium transition-all duration-300",
    glass: "rounded-xl border border-white/50 bg-white/70 backdrop-blur-md text-card-foreground shadow-soft transition-all duration-300",
    metric: "rounded-xl border border-border/60 bg-card text-card-foreground shadow-soft p-6 transition-all duration-300 hover:shadow-medium hover:border-border/80",
    highlight: "rounded-xl border border-primary/20 bg-primary/5 text-card-foreground shadow-soft transition-all duration-300",
    interactive: "rounded-xl border border-border/60 bg-card text-card-foreground shadow-soft transition-all duration-300 hover:shadow-medium hover:border-border/80 cursor-pointer",
    chart: "rounded-xl border border-border/60 bg-card text-card-foreground shadow-soft p-6",
  };
  return (
    <div
      ref={ref}
      className={cn(variants[variant] || variants.default, className)}
      {...props}
    />
  );
});
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-xl font-serif font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };