"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  padding?: "none" | "sm" | "md" | "lg";
}

const maxWidthClasses = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
  xl: "max-w-[1600px]",
  full: "max-w-full",
};

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-6 lg:p-8",
  lg: "p-8 lg:p-10",
};

export function PageContainer({
  children,
  className,
  maxWidth = "lg",
  padding = "md",
}: PageContainerProps) {
  return (
    <main className={cn(
      "flex-1 overflow-y-auto bg-background",
      "ml-[252px] transition-all duration-300",
      maxWidthClasses[maxWidth],
      paddingClasses[padding],
      "mx-auto w-full",
      className
    )} style={{ marginLeft: "var(--sidebar-width, 252px)" }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </main>
  );
}

export default PageContainer;