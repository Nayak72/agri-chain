"use client";

import { Search, Bell, User, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function TopNav({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "fixed left-72 right-0 top-0 h-16 border-b border-border bg-white/70 backdrop-blur-md z-30",
        className
      )}
    >
      <div className="flex h-full w-full items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button className="hidden md:flex items-center gap-2 text-sm font-medium text-secondary-foreground hover:text-primary">
            <Menu className="w-4 h-4" />
            <span>Menu</span>
          </button>
          <div className="relative w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search shipments, batches, orders..."
              className="h-9 w-full pl-9 pr-4 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-forest-800/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative p-2 text-secondary-foreground hover:text-primary transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>
          </button>
          <div className="flex items-center gap-2 pl-4 border-l border-border/60">
            <div className="hidden md:flex flex-col text-right">
              <p className="text-sm font-medium text-foreground">John Farmer</p>
              <p className="text-xs text-muted-foreground">Farmer</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-forest-800 flex items-center justify-center text-white font-medium text-xs">
              JF
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}