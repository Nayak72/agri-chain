"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, X } from "lucide-react";
import { visibleNavItems } from "@/lib/nav";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const items = visibleNavItems(user?.permissions ?? []);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-background/60 px-4 pt-[12vh] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Command menu">
      <Command className="glass-overlay w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl" value={query} onValueChange={setQuery}>
        <div className="flex items-center border-b border-border px-4">
          <Search className="mr-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Command.Input autoFocus placeholder="Jump to a page..." className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          <button type="button" onClick={() => onOpenChange(false)} aria-label="Close command menu" className="rounded p-1 text-muted-foreground hover:bg-foreground/10"><X className="h-4 w-4" /></button>
        </div>
        <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
          <Command.Empty className="p-6 text-center text-sm text-muted-foreground">No matching pages.</Command.Empty>
          <Command.Group heading="Navigate" className="px-2 pb-2 text-xs text-muted-foreground">
            {items.map((item) => (
              <Command.Item key={item.href} value={`${item.label} ${item.group}`} onSelect={() => { onOpenChange(false); router.push(item.href); }} className={cn("flex cursor-pointer items-center justify-between rounded-lg px-3 py-3 text-sm text-foreground outline-none", "data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary")}>
                <span>{item.label}</span><span className="text-xs text-muted-foreground">{item.group}</span>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
