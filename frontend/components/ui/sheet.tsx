"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const Sheet = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof ScrollArea> & {
    children?: React.ReactNode;
    className?: string;
  }
>(({ className, children, ...props }, ref) => (
  <ScrollArea className={cn("fixed right-0 top-0 z-50 h-full w-full overflow-hidden bg-white/90 backdrop-blur-md shadow-medium transition-transform duration-300 ease-in-out", className)} {...props} ref={ref}>
    <div className="flex h-full flex-col">{children}</div>
  </ScrollArea>
));
Sheet.displayName = "Sheet";

const SheetTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button>
>(({ className, children, ...props }, ref) => (
  <Button ref={ref} className={cn("inline-flex items-center rounded-md gap-1.5 pl-2 pr-2", className)} {...props} asChild>
    {children}
  </Button>
));
SheetTrigger.displayName = "SheetTrigger";

const SheetContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode; className?: string }
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("flex h-full w-80 flex-col", className)} {...props}>
    {children}
  </div>
));
SheetContent.displayName = "SheetContent";

const SheetHeader = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
  <div className={cn("flex flex-col space-y-1.5 p-4", className)} {...props}>
    <div className="flex items-center justify-between">
      {React.Children.map(children, (child) => {
        if (
          React.isValidElement(child) &&
          (child.type as any).displayName === "SheetTitle"
        ) {
          return React.cloneElement(child as React.ReactElement, {
            className: cn("text-lg font-serif font-semibold", (child.props as any).className),
          });
        }
        if (
          React.isValidElement(child) &&
          (child.type as any).displayName === "SheetDescription"
        ) {
          return React.cloneElement(child as React.ReactElement, {
            className: cn("text-sm text-muted-foreground", (child.props as any).className),
          });
        }
        return child;
      })}
    </div>
  </div>
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("border-t border-border/50 bg-white/50 p-4", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn("text-lg font-serif font-semibold", className)} {...props} />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
SheetDescription.displayName = "SheetDescription";

const SheetSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex shrink-0 items-center gap-1.5 border-border/50 px-4 py-1.5 text-xs font-medium", className)} {...props} />
));
SheetSeparator.displayName = "SheetSeparator";

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription, SheetSeparator };

import { Button } from "@/components/ui/button";