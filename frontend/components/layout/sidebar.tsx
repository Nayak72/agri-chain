"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Truck,
  Package,
  Warehouse,
  BarChart3,
  MapPin,
  ShieldCheck,
  Thermometer,
  Users as UsersIcon,
  UserCog,
  LogOut,
  MoreVertical,
  Menu,
  Activity,
  ClipboardList,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Farms", href: "/farms", icon: MapPin },
  { name: "Produce", href: "/produce", icon: Package },
  { name: "Batches", href: "/batches", icon: ClipboardList },
  { name: "Warehouses", href: "/warehouses", icon: Warehouse },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList },
  { name: "Freight Bookings", href: "/freight-bookings", icon: Truck },
  { name: "Transporters", href: "/transporters", icon: Users },
  { name: "Fleet", href: "/fleet", icon: Truck },
  { name: "Drivers", href: "/drivers", icon: UsersIcon },
  { name: "Shipments", href: "/shipments", icon: Activity },
  { name: "Cold Chain", href: "/cold-chain", icon: Thermometer },
  { name: "Deliveries", href: "/deliveries", icon: MapPin },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Ledger", href: "/ledger", icon: ShieldCheck },
  { name: "Settings", href: "/settings", icon: UserCog },
];

export default function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen border-r border-border bg-white/80 backdrop-blur-lg z-40 transform transition-transform duration-300 ease-in-out",
        isCollapsed ? "w-16 -translate-x-full md:translate-x-0" : "w-72",
        className
      )}
    >
      <div className="flex h-full flex-col">
        <div className={`h-16 flex items-center gap-2 border-b border-border bg-background px-4 ${
          isCollapsed ? "justify-center" : "justify-between"
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-forest-800 flex items-center justify-center">
              <span className="text-white font-serif text-lg font-bold">A</span>
            </div>
            {!isCollapsed && (
              <span className="font-serif font-bold text-xl tracking-tighter text-charcoal">
                AgriChain
              </span>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-secondary-foreground hover:text-primary transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          )}
          {isCollapsed && (
            <button
              onClick={() => setIsCollapsed(false)}
              className="text-secondary-foreground hover:text-primary transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-white/70 text-forest-800 shadow-soft"
                    : "text-secondary-foreground hover:bg-white/50 hover:text-forest-800"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "text-forest-800")} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-secondary-foreground hover:bg-white/50 hover:text-forest-800 transition-colors mb-3">
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </div>
        </div>
      </div>
    </aside>
  );
}