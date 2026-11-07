"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Truck, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/batches", label: "Batches", icon: Package },
  { href: "/shipments", label: "Shipments", icon: Truck },
  { href: "/settings", label: "More", icon: MoreHorizontal },
];

export function MobileNav() {
  const pathname = usePathname();
  return <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border glass-raised pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Mobile navigation">
    {tabs.map(({ href, label, icon: Icon }) => {
      const active = pathname === href || pathname.startsWith(`${href}/`);
      return <Link key={href} href={href} className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground", active && "text-primary")} aria-current={active ? "page" : undefined}><Icon className="h-5 w-5" aria-hidden="true" /><span>{label}</span></Link>;
    })}
  </nav>;
}
