"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Search,
  Bell,
  User,
  ChevronDown,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

export default function TopNav() {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [theme, setTheme] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored || (prefersDark ? "dark" : "light");
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log("Search for:", searchQuery);
    }
  };

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <TooltipProvider>
      <header
        className={cn(
          "fixed top-0 right-0 h-16 border-b border-border bg-white/95 backdrop-blur-lg z-30 transition-all duration-300",
          "left-[252px]"
        )}
        style={{ left: "var(--sidebar-width, 252px)" }}
      >
        <div className="flex h-full w-full items-center justify-between px-6 gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
<Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <nav className="space-y-2">
                      <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary">Dashboard</button>
                      <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary">Farms</button>
                      <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary">Produce</button>
                      <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary">Batches</button>
                      <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary">Warehouses</button>
                      <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary">Inventory</button>
                      <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary">Purchase Orders</button>
                      <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary">Freight Bookings</button>
                      <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary">Transporters</button>
                      <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary">Fleet</button>
                      <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary">Drivers</button>
                      <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary">Shipments</button>
                      <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary">Cold Chain</button>
                      <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary">Deliveries</button>
                      <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary">Analytics</button>
                      <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary">Ledger</button>
                      <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary">Settings</button>
                    </nav>
                  </SheetContent>
                </Sheet>
              </TooltipTrigger>
              <TooltipContent side="bottom">Menu</TooltipContent>
            </Tooltip>

            <form onSubmit={handleSearch} className="relative w-full md:w-80 lg:w-96 flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search shipments, batches, orders, farms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full pl-10 pr-4 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Global search"
              />
            </form>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}>
                  {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{theme === "light" ? "Dark mode" : "Light mode"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Notifications</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 gap-2" aria-label="User menu">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-sm">
                        {initials}
                      </div>
                      <ChevronDown className="w-4 h-4 hidden sm:block" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="end">Account</TooltipContent>
                </Tooltip>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-serif font-semibold">Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2 px-2 py-1.5">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-xs">
                    {initials}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{user?.full_name || "User"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user?.role?.toLowerCase().replace("_", " ") || "role"}</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/settings" className="flex items-center gap-2 w-full">
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/settings" className="flex items-center gap-2 w-full">
                    <Sun className="w-4 h-4" />
                    <span>Preferences</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="text-destructive focus:text-destructive-foreground flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}

import { LogOut } from "lucide-react";