"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = (variant: string, size: string) => {
  const base = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

  const variants: Record<string, string> = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-medium hover:-translate-y-0.5 active:scale-95",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-medium hover:-translate-y-0.5 active:scale-95",
    outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground hover:-translate-y-0.5 active:scale-95",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-soft hover:-translate-y-0.5 active:scale-95",
    ghost: "hover:bg-accent hover:text-accent-foreground hover:-translate-y-0.5 active:scale-95",
    link: "text-primary underline-offset-4 hover:underline",
    luxury: "bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium transition-all duration-300 hover:bg-primary/90 hover:shadow-premium hover:-translate-y-0.5 active:scale-95",
    gold: "bg-warning text-warning-foreground hover:bg-warning/90 hover:shadow-medium hover:-translate-y-0.5 active:scale-95",
  };

  const sizes: Record<string, string> = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    xl: "h-12 rounded-lg px-10 text-base",
    icon: "h-10 w-10",
    xs: "h-8 rounded-md px-2 text-xs",
  };

  return cn(base, variants[variant] || variants.default, sizes[size] || sizes.default);
};

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "luxury" | "gold";
    size?: "default" | "sm" | "lg" | "xl" | "icon" | "xs";
    asChild?: boolean;
    loading?: boolean;
  }
>(({ className, variant = "default", size = "default", asChild = false, loading = false, children, disabled, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants(variant, size), className)}
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
});
Button.displayName = "Button";

export { Button };