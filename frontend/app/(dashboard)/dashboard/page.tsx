"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Truck, Package, ShieldCheck, AlertCircle, Plus, BarChart3, Leaf, Warehouse, Ship } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface DashboardMetricsAPI {
  total_shipments?: number;
  active_shipments?: number;
  completed_shipments?: number;
  delayed_shipments?: number;
  cancelled_shipments?: number;
  average_transit_hours?: number;
  on_time_delivery_percentage?: number;
}

interface DashboardMetrics {
  totalShipments: number;
  activeShipments: number;
  completedShipments: number;
  delayedShipments: number;
  cancelledShipments: number;
  averageTransitHours: number;
  onTimeDeliveryPercentage: number;
}

const roleDashboard: Record<string, { title: string; action: string; href: string; description: string }> = {
  ADMIN: { title: "System health and approvals", action: "Review users", href: "/users", description: "Keep approvals, active shipments, alerts and ledger integrity moving." },
  FARMER: { title: "Harvest to market", action: "Register a batch", href: "/batches/new", description: "Track farms, harvest batches, stock and purchase orders." },
  WAREHOUSE_MANAGER: { title: "Warehouse operations", action: "Review inventory", href: "/inventory", description: "Prioritize receiving, inspection, FEFO stock and expiry risk." },
  TRANSPORTER: { title: "Fleet readiness", action: "View bookings", href: "/freight-bookings", description: "Turn open freight requests into quotes and active trips." },
  DRIVER: { title: "Trip execution", action: "Record checkpoint", href: "/shipments", description: "Stay ahead of checkpoints, exceptions and simulated cold-chain readings." },
  BUYER: { title: "Order fulfilment", action: "View orders", href: "/purchase-orders", description: "Follow purchase orders, deliveries and quality outcomes." },
};

function mapDashboardMetrics(api: DashboardMetricsAPI): DashboardMetrics {
  return {
    totalShipments: api.total_shipments ?? 0,
    activeShipments: api.active_shipments ?? 0,
    completedShipments: api.completed_shipments ?? 0,
    delayedShipments: api.delayed_shipments ?? 0,
    cancelledShipments: api.cancelled_shipments ?? 0,
    averageTransitHours: api.average_transit_hours ?? 0,
    onTimeDeliveryPercentage: api.on_time_delivery_percentage ?? 0,
  };
}

const COLORS = ["#173B2F", "#1F5440", "#B59A69", "#A7B9A3"];

export default function DashboardPage() {
  const { user } = useAuth();
  const roleContent = roleDashboard[user?.role ?? "BUYER"];
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalShipments: 0,
    activeShipments: 0,
    completedShipments: 0,
    delayedShipments: 0,
    cancelledShipments: 0,
    averageTransitHours: 0,
    onTimeDeliveryPercentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get<DashboardMetricsAPI>("/analytics/dashboard");
        setMetrics(mapDashboardMetrics(data));
        setError(null);
      } catch (e: any) {
        setError("Failed to load dashboard metrics. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const statCards = [
    { title: "Total Shipments", value: metrics.totalShipments, icon: Truck, color: "text-primary", bg: "bg-primary/10" },
    { title: "Active Shipments", value: metrics.activeShipments, icon: Package, color: "text-accent", bg: "bg-accent/15" },
    { title: "Completed", value: metrics.completedShipments, icon: ShieldCheck, color: "text-emerald-700", bg: "bg-emerald-500/10" },
    { title: "Delayed", value: metrics.delayedShipments, icon: AlertCircle, color: "text-amber-700", bg: "bg-amber-500/10" },
  ];

  const quickActions = [
    { label: "Register Batch", href: "/batches/new", icon: Leaf, description: "Create new harvest batch" },
    { label: "New Shipment", href: "/shipments/new", icon: Truck, description: "Book freight & assign vehicle" },
    { label: "Manage Farms", href: "/farms", icon: Leaf, description: "Add or edit farm profiles" },
    { label: "View Warehouses", href: "/warehouses", icon: Warehouse, description: "Check capacity & inventory" },
    { label: "Fleet Management", href: "/fleet", icon: Ship, description: "Vehicles, drivers, assignments" },
    { label: "Analytics", href: "/analytics", icon: BarChart3, description: "Detailed reports & insights" },
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Executive Dashboard"
          description="Overview of your agricultural supply chain operations"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-28 mb-3" />
              <Skeleton className="h-8 w-20" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={roleContent.title}
        description={`Welcome back, ${user?.full_name || "User"}. Operational overview for ${user?.role?.toLowerCase().replace(/_/g, " ") || "account"}.`}
        actions={
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft">
            <Link href="/shipments/new">
              <Plus className="w-4 h-4 mr-2" />
              New Shipment
            </Link>
          </Button>
        }
      />

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Next best action</p><p className="mt-1 text-sm text-muted-foreground">{roleContent.description}</p></div>
          <Button asChild variant="outline" className="shrink-0"><Link href={roleContent.href}>{roleContent.action}</Link></Button>
        </CardContent>
      </Card>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-destructive/20 bg-destructive/5 p-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Unable to load dashboard data</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </motion.div>
      )}

      {/* KPI Cards Grid */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <StaggerItem key={stat.title} delay={index * 0.05}>
            <Card className="hover:shadow-medium transition-all duration-200 border-border/70">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{stat.title}</CardTitle>
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", stat.bg)}>
                  <stat.icon className={cn("w-4 h-4", stat.color)} aria-hidden="true" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-foreground font-serif">
                    {stat.value.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Main Charts & Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="h-full border-border/70">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Shipment Distribution by Status</CardTitle>
              <CardDescription>Breakdown of active, completed, and exception shipments</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.totalShipments === 0 ? (
                <div className="h-[280px] flex flex-col items-center justify-center text-center p-6">
                  <Truck className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No shipments recorded in system yet.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Completed", value: metrics.completedShipments, fill: COLORS[0] },
                        { name: "Active", value: metrics.activeShipments, fill: COLORS[1] },
                        { name: "Delayed", value: metrics.delayedShipments, fill: COLORS[2] },
                        { name: "Cancelled", value: metrics.cancelledShipments, fill: COLORS[3] },
                      ].filter((d) => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                      <Tooltip
                        formatter={(value: number) => [`${value} shipments`, "Count"]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          boxShadow: "0 10px 25px -5px rgba(23, 59, 47, 0.1)",
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="lg:col-span-1"
        >
          <Card className="h-full border-border/70">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
              <CardDescription>Frequent workflows and operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 hover:bg-secondary/40 hover:border-primary/20 transition-all duration-150 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform flex-shrink-0">
                    <action.icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{action.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
