"use client";

import { Button } from "@/components/ui/button";

export default function GlobalRouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="flex min-h-screen items-center justify-center p-6"><div className="glass-raised max-w-md space-y-4 rounded-2xl p-8 text-center"><h1 className="font-display text-2xl font-bold">Something went wrong</h1><p className="text-sm text-muted-foreground">The page could not finish loading. Try again or return to your workspace.</p><Button onClick={reset}>Try again</Button></div></main>;
}
