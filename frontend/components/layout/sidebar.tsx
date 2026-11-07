"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  Menu,
  Activity,
  ClipboardList,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  Home,
  TreePine,
  Factory,
  ShoppingCart,
  Ship,
  Navigation,
  Gauge,
  ClipboardCheck,
  Database,
  Settings,
  History,
  FileText,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLayout } from "@/providers/LayoutProvider";
import { USER_ROLES } from "@/lib/constants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  children?: NavItem[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
  roles?: string[];
};

const navigationGroups: NavGroup[] = [
  {
    label: "OVERVIEW",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "AGRICULTURE",
    items: [
      { name: "Farms", href: "/farms", icon: TreePine },
      { name: "Produce Catalogue", href: "/produce", icon: Package },
      { name: "Harvest Batches", href: "/batches", icon: ClipboardList },
      { name: "Warehouses", href: "/warehouses", icon: Warehouse },
      { name: "Inventory", href: "/inventory", icon: Database },
    ],
  },
  {
    label: "COMMERCE",
    items: [
      { name: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart },
      { name: "Freight Bookings", href: "/freight-bookings", icon: Truck },
    ],
  },
  {
    label: "TRANSPORTATION",
    items: [
      { name: "Transporters", href: "/transporters", icon: Users },
      { name: "Fleet Management", href: "/fleet", icon: Ship },
      { name: "Drivers", href: "/drivers", icon: UsersIcon },
      { name: "Shipments", href: "/shipments", icon: Activity },
      { name: "Deliveries", href: "/deliveries", icon: Navigation },
    ],
  },
  {
    label: "MONITORING",
    items: [
      { name: "Cold Chain", href: "/cold-chain", icon: Thermometer },
      { name: "Ledger Explorer", href: "/ledger", icon: ShieldCheck },
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { name: "Users", href: "/users", icon: UserCog, roles: [USER_ROLES.ADMIN] },
      { name: "Design system", href: "/design", icon: Factory, roles: [USER_ROLES.ADMIN] },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

function hasAccess(roles?: string[], userRole?: string): boolean {
  if (!roles || roles.length === 0) return true;
  return userRole ? roles.includes(userRole) : false;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout: authLogout } = useAuth();
  const { isCollapsed, setIsCollapsed } = useLayout();
  const [expandedGroups, setExpandedGroups] = React.useState<string[]>([
    "OVERVIEW",
    "AGRICULTURE",
    "COMMERCE",
    "TRANSPORTATION",
    "MONITORING",
    "SYSTEM",
  ]);

  const handleLogout = async () => {
    await authLogout();
    window.location.href = "/login";
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  const filteredGroups = navigationGroups.filter((group) =>
    hasAccess(group.roles, user?.role)
  );

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen border-r border-border glass-raised z-40 transition-all duration-300 ease-in-out hidden md:block",
          isCollapsed ? "w-16" : "w-72"
        )}
      >
        <div className="flex h-full flex-col">
          <div className={`h-16 flex items-center gap-2 border-b border-border bg-background px-4 transition-all duration-300 ${isCollapsed ? "justify-center" : "justify-between"}`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-primary-foreground font-serif text-lg font-bold">A</span>
              </div>
              {!isCollapsed && (
                <span className="font-serif font-bold text-xl tracking-tighter text-foreground truncate">
                  AgriChain
                </span>
              )}
            </div>
            {!isCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCollapsed(true)}
                    className="text-muted-foreground hover:text-primary"
                    aria-label="Collapse sidebar"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Collapse sidebar</TooltipContent>
              </Tooltip>
            )}
            {isCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCollapsed(false)}
                    className="text-muted-foreground hover:text-primary"
                    aria-label="Expand sidebar"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Expand sidebar</TooltipContent>
              </Tooltip>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-3" aria-label="Main navigation">
            {filteredGroups.map((group) => {
              const isExpanded = expandedGroups.includes(group.label);
              const groupItems = group.items.filter((item) =>
                hasAccess(item.roles, user?.role)
              );

              if (groupItems.length === 0) return null;

              return (
                <div key={group.label} className="space-y-1">
                  {!isCollapsed && (
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground px-2 py-2",
                        !isExpanded && "opacity-60"
                      )}
                      onClick={() => toggleGroup(group.label)}
                      aria-expanded={isExpanded}
                    >
                      <span className="flex items-center gap-2">
                        <ChevronRight
                          className={cn(
                            "w-3 h-3 transition-transform duration-200",
                            isExpanded && "rotate-90"
                          )}
                        />
                        {group.label}
                      </span>
                    </Button>
                  )}
                  {(!isCollapsed && isExpanded) || isCollapsed ? (
                    groupItems.map((item) => {
                      const active = isActive(pathname, item.href);
                      const Icon = item.icon;
                      return (
                        <Tooltip key={item.name} disableHoverableContent={!isCollapsed}>
                          <TooltipTrigger asChild>
                            <Link
                              href={item.href}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                                active
                                  ? "bg-primary/10 text-primary shadow-soft border border-primary/20"
                                  : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                              )}
                              aria-current={active ? "page" : undefined}
                            >
                              <Icon className={cn("w-5 h-5 flex-shrink-0", active && "text-primary")} aria-hidden="true" />
                              {!isCollapsed && <span className="truncate">{item.name}</span>}
                              {isCollapsed && (
                                <TooltipContent side="right" align="start">
                                  {item.name}
                                </TooltipContent>
                              )}
                            </Link>
                          </TooltipTrigger>
                        </Tooltip>
                      );
                    })
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            {!isCollapsed ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-medium text-sm">
                      {user?.full_name?.charAt(0) || "U"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user?.full_name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize truncate">
                      {user?.role?.toLowerCase().replace("_", " ") || "role"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Button>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={handleLogout}
                    aria-label="User menu"
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" align="center">Sign Out</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
