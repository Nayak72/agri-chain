"use client";

import * as React from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/providers/AuthProvider";
import { LayoutProvider } from "@/providers/LayoutProvider";
import { ThemeProvider } from "next-themes";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LayoutProvider>
            {children}
            <Toaster position="top-right" richColors />
          </LayoutProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
