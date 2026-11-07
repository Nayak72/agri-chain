"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const Sheet = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Root> & {
    children?: React.ReactNode;
    className?: string;
  }
>(({ className, children, ...props }, ref) => (
  <SheetPrimitive.Root {...props}>
    <SheetPrimitive.Trigger asChild>
      <Button variant="ghost" size="icon" aria-label="Open menu">
        <Menu className="w-5 h-5" />
      </Button>
    </SheetPrimitive.Trigger>
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-80 flex flex-col bg-white border-l border-border shadow-premium data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          className
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-serif font-semibold">Menu</h2>
            <SheetPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close menu">
                <X className="w-5 h-5" />
              </Button>
            </SheetPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </div>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  </SheetPrimitive.Root>
));
Sheet.displayName = "Sheet";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

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