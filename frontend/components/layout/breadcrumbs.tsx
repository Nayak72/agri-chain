"use client";

import Link from "next/link";
import * as React from "react";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  farms: "Farms",
  produce: "Produce Catalogue",
  batches: "Harvest Batches",
  warehouses: "Warehouses",
  inventory: "Inventory",
  "purchase-orders": "Purchase Orders",
  "freight-bookings": "Freight Bookings",
  transporters: "Transporters",
  fleet: "Fleet Management",
  drivers: "Drivers",
  shipments: "Shipments",
  "cold-chain": "Cold Chain",
  deliveries: "Deliveries",
  analytics: "Analytics",
  ledger: "Ledger Explorer",
  settings: "Settings",
  users: "User Management",
};

export function Breadcrumbs({ items }: { items?: BreadcrumbItem[] }) {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";

  const autoItems = React.useMemo(() => {
    if (items) return items;

    const segments = pathname.split("/").filter(Boolean);
    const dashboardIndex = segments.findIndex((s) => s === "dashboard");

    if (dashboardIndex === -1) return [];

    const relevantSegments = segments.slice(dashboardIndex + 1);
    if (relevantSegments.length === 0) return [{ label: "Dashboard", href: "/dashboard" }];

    return relevantSegments.map((segment, index) => {
      const href = `/dashboard/${relevantSegments.slice(0, index + 1).join("/")}`;
      const label = routeLabels[segment] || segment.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      return { label, href: index === relevantSegments.length - 1 ? undefined : href };
    });
  }, [pathname, items]);

  const breadcrumbs = items || autoItems;

  if (breadcrumbs.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
      <Link href="/dashboard" className="flex items-center gap-1 hover:text-primary transition-colors" title="Dashboard">
        <Home className="w-3 h-3" aria-hidden="true" />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>
      {breadcrumbs.map((item, index) => (
        <React.Fragment key={item.label}>
          <ChevronRight className="w-3 h-3 mx-1 text-border" aria-hidden="true" />
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-primary transition-colors font-medium"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export default Breadcrumbs;