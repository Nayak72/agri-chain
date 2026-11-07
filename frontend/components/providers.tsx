"use client";

import * as React from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <React.Fragment>
      {children}
      <Toaster position="top-right" richColors />
    </React.Fragment>
  );
}