"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Truck, Package, ShieldCheck, AlertCircle, Plus, BarChart3, Leaf, Warehouse, Ship, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface DashboardMetrics {
  totalShipments: number;
  activeShipments: number;
  completedShipments: number;
  delayedShipments: number;
  totalFreightExpenditure?: number;
  vehicleUtilization?: number;
  activeAlerts?: number;
  onTimeDeliveryRate?: number;
}

const COLORS = ["#4A9E7C", "#2A6D51", "#B59A69", "#7C8A77"];

export default function DashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalShipments: 0,
    activeShipments: 0,
    completedShipments: 0,
    delayedShipments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get("/analytics/dashboard");
        setMetrics(data);
        setError(null);
      } catch (e) {
        setError("Failed to load dashboard metrics. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const statCards = [
    { title: "Total Shipments", value: metrics.totalShipments, icon: Truck, color: "text-primary", trend: "+12%", trendColor: "text-success" },
    { title: "Active Shipments", value: metrics.activeShipments, icon: Package, color: "text-info", trend: "+3%", trendColor: "text-info" },
    { title: "Completed", value: metrics.completedShipments, icon: ShieldCheck, color: "text-success", trend: "+8%", trendColor: "text-success" },
    { title: "Delayed", value: metrics.delayedShipments, icon: AlertCircle, color: "text-warning", trend: "-2%", trendColor: "text-destructive" },
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
          title="Dashboard"
          description="Overview of your agricultural supply chain operations"
        />
        <StaggerContainer>
          {[1, 2, 3, 4].map((i) => (
            <StaggerItem key={i} delay={i * 0.05}>
              <Card variant="metric">
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-12 w-1/2" />
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user?.full_name || "User"}. Here's an overview of your ${user?.role?.toLowerCase().replace("_", " ") || "operations"}.`}
        actions={
          <Button asChild>
            <Link href="/shipments/new">
              <Plus className="w-4 h-4 mr-2" />
              New Shipment
            </Link>
          </Button>
        }
      />

      <StaggerContainer>
        {statCards.map((stat, index) => (
          <StaggerItem key={stat.title} delay={index * 0.05}>
            <Card variant="metric" className="hover-lift">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className={cn("w-5 h-5", stat.color)} aria-hidden="true" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-serif font-bold text-foreground">
                    {(stat.value || 0).toLocaleString()}
                  </span>
                  <Badge variant="success" className="text-xs">{stat.trend} vs last month</Badge>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card variant="chart">
            <CardHeader>
              <CardTitle>Shipment Status Distribution</CardTitle>
              <CardDescription>View the breakdown of shipments by current status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Completed", value: metrics.completedShipments, fill: COLORS[0] },
                      { name: "Active", value: metrics.activeShipments, fill: COLORS[1] },
                      { name: "Delayed", value: metrics.delayedShipments, fill: COLORS[2] },
                      { name: "Other", value: Math.max(0, metrics.totalShipments - metrics.completedShipments - metrics.activeShipments - metrics.delayedShipments), fill: COLORS[3] },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                    <Tooltip
                      formatter={(value: number) => [value.toLocaleString(), "Shipments"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "0 10px 30px -10px rgba(23, 59, 47, 0.15)",
                      }}
                    />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="lg:col-span-1"
        >
          <Card variant="highlight">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action, index) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-primary/5 hover:border-primary/20 transition-all duration-200 group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <action.icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{action.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-destructive/20 bg-destructive/5 p-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Unable to load dashboard data</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";