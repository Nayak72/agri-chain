"use client";

import * as React from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/providers/AuthProvider";
import { LayoutProvider } from "@/providers/LayoutProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutProvider>
        {children}
        <Toaster position="top-right" richColors />
      </LayoutProvider>
    </AuthProvider>
  );
}
