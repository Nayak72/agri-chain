"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Search,
  Bell,
  User,
  ChevronDown,
  Sun,
  Moon,
  LogOut,
  Menu,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLayout } from "@/providers/LayoutProvider";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTheme } from "next-themes";
import { CommandMenu } from "@/components/shell/CommandMenu";

export default function TopNav() {
  const { user, logout } = useAuth();
  const { mobileOpen, setMobileOpen } = useLayout();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [commandOpen, setCommandOpen] = React.useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const theme = resolvedTheme === "light" ? "light" : "dark";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCommandOpen(true);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  const mobileNavLinks = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Farms", href: "/farms" },
    { name: "Produce Catalogue", href: "/produce" },
    { name: "Harvest Batches", href: "/batches" },
    { name: "Warehouses", href: "/warehouses" },
    { name: "Inventory", href: "/inventory" },
    { name: "Purchase Orders", href: "/purchase-orders" },
    { name: "Freight Bookings", href: "/freight-bookings" },
    { name: "Transporters", href: "/transporters" },
    { name: "Fleet Management", href: "/fleet" },
    { name: "Drivers", href: "/drivers" },
    { name: "Shipments", href: "/shipments" },
    { name: "Cold Chain", href: "/cold-chain" },
    { name: "Deliveries", href: "/deliveries" },
    { name: "Analytics", href: "/analytics" },
    { name: "Ledger Explorer", href: "/ledger" },
    { name: "Settings", href: "/settings" },
  ];

  return (
    <TooltipProvider>
      <header
        className="dashboard-topbar fixed top-0 right-0 h-16 border-b border-border glass-raised z-30 transition-all duration-300"
      >
        <div className="flex h-full w-full items-center justify-between px-6 gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle className="font-serif text-lg font-bold flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm">A</span>
                    AgriChain
                  </SheetTitle>
                </SheetHeader>
                <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-80px)]">
                  {mobileNavLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors"
                    >
                      {link.name}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            <form onSubmit={handleSearch} onClick={() => setCommandOpen(true)} className="relative w-full md:w-80 lg:w-96 flex-1 max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search shipments, batches, orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full pl-9 pr-4 rounded-lg border border-input bg-background/50 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                aria-label="Global search"
                readOnly
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘K</kbd>
            </form>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}>
                  {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{theme === "light" ? "Dark mode" : "Light mode"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="relative" aria-label="Notifications"><Bell className="w-4 h-4" /><span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-warning" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 glass-overlay"><DropdownMenuLabel>Notifications</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem className="flex-col items-start gap-1 py-3"><span className="font-medium">Cold-chain alerts</span><span className="text-xs text-muted-foreground">Open this panel to review active telemetry alerts.</span></DropdownMenuItem><DropdownMenuItem asChild><Link href="/cold-chain" className="text-primary">View cold-chain monitoring</Link></DropdownMenuItem></DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent side="bottom">Notifications</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 rounded-full px-2 gap-2 hover:bg-secondary/50" aria-label="User menu">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-xs">
                    {initials}
                  </div>
                  <span className="text-xs font-medium text-foreground hidden sm:inline max-w-[120px] truncate">
                    {user?.full_name || "Account"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-serif font-semibold">Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2 px-2 py-1.5">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-xs">
                    {initials}
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{user?.full_name || "User"}</p>
                    <p className="text-xs text-muted-foreground capitalize truncate">{user?.role?.toLowerCase().replace("_", " ") || "role"}</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2 w-full cursor-pointer">
                    <User className="w-4 h-4" />
                    <span>Profile & Preferences</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
    </TooltipProvider>
  );
}
