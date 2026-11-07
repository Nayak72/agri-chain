import { UserRole } from "@/lib/constants";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  permission?: string;
  group: string;
  roles?: UserRole[];
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "layout-dashboard", group: "Workspace" },
  { label: "Farms", href: "/farms", icon: "tractor", permission: "farms:read", group: "Produce" },
  { label: "Produce", href: "/produce", icon: "leaf", permission: "produce:read", group: "Produce" },
  { label: "Batches", href: "/batches", icon: "package", permission: "batches:read", group: "Produce" },
  { label: "Inventory", href: "/inventory", icon: "warehouse", permission: "inventory:read", group: "Operations" },
  { label: "Shipments", href: "/shipments", icon: "truck", permission: "shipments:read", group: "Operations" },
  { label: "Cold chain", href: "/cold-chain", icon: "thermometer", permission: "sensors:read", group: "Operations" },
  { label: "Ledger", href: "/ledger", icon: "link", permission: "ledger:read", group: "Traceability" },
  { label: "Users", href: "/users", icon: "users", permission: "users:read", group: "Administration", roles: ["ADMIN"] },
];

export function visibleNavItems(permissions: string[] = []) {
  return navItems.filter((item) => !item.permission || permissions.includes(item.permission));
}
