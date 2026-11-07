"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusPill } from "@/components/ui/status-pill";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const statuses = ["IN_TRANSIT", "DELIVERED", "PENDING", "WARNING", "CRITICAL", "CANCELLED"];

export default function DesignPage() {
  const [enabled, setEnabled] = useState(true);
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Design system</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Verdant Aurora</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Reusable glass primitives, tokens, statuses, focus states and motion-safe controls.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((level) => (
          <GlassCard key={level} level={level as 1 | 2 | 3} className="p-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Glass level {level}</p>
            <p className="mt-6 font-display text-2xl font-bold">Frosted surface</p>
            <p className="mt-2 text-sm text-muted-foreground">Maintains readable contrast over the ambient canvas.</p>
          </GlassCard>
        ))}
      </section>

      <Card>
        <CardHeader><CardTitle>Controls and states</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">{statuses.map((status) => <StatusPill key={status} status={status} />)}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input placeholder="Focus to inspect the ring" aria-label="Design system input" />
            <div className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-foreground/5 px-3">
              <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Toggle design system state" />
              <span className="text-sm">Telemetry {enabled ? "enabled" : "paused"}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button>Primary action</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
