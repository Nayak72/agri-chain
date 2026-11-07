"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    children?: React.ReactNode;
    className?: string;
    type?: "always" | "auto" | "scroll" | "hide";
  }
>(({ className, children, type = "always", ...props }, ref) => (
  <div
    ref={ref}
    style={{ scrollbarWidth: type === "hide" ? "none" : undefined, msOverflowStyle: type === "hide" ? "none" : undefined }}
    className={cn("overflow-x-auto overflow-y-auto scrollbar-hide scrollbar", className)}
    {...props}
  >
    {type === "hide" && (
      <div className="relative inset-0 z-10 overflow-x-auto overflow-y-auto p-[1px] -mx-[1px] -my-[1px]">
        <div className="min-w-[1px] min-h-[1px]">{children}</div>
      </div>
    )}
    {type !== "hide" && children}
  </div>
));
ScrollArea.displayName = "ScrollArea";

const ScrollBar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => (
  <div ref={ref} {...props} />
));
ScrollBar.displayName = "ScrollBar";

export { ScrollArea, ScrollBar };