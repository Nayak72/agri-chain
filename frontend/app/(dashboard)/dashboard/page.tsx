"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Tooltip } from "recharts";
import { Truck, Package, Users, AlertCircle, ShieldCheck, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({
    totalShipments: 0,
    activeShipments: 0,
    completedShipments: 0,
    delayedShipments: 0,
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data } = await apiClient.get("/analytics/dashboard");
        setMetrics(data);
      } catch (e) {
        // Use mock data if API fails
        setMetrics({
          totalShipments: 12,
          activeShipments: 5,
          completedShipments: 6,
          delayedShipments: 1,
        });
      }
    };
    fetchMetrics();
  }, []);

  const statCards = [
    { title: "Total Shipments", value: metrics.totalShipments, icon: Truck, color: "text-forest-800" },
    { title: "Active", value: metrics.activeShipments, icon: Package, color: "text-blue-600" },
    { title: "Completed", value: metrics.completedShipments, icon: ShieldCheck, color: "text-green-600" },
    { title: "Delayed", value: metrics.delayedShipments, icon: AlertCircle, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-charcoal">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of your agricultural supply chain operations</p>
        </div>
        <Button className="bg-forest-800 text-white px-6 py-2">
          New Shipment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title} className="bg-white/80 backdrop-blur-sm border border-border/50 hover:shadow-medium transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-serif font-bold text-charcoal">{stat.value}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Shipment Status Distribution</CardTitle>
            <CardDescription>View the breakdown of shipments by current status</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <PieChart width={600} height={300}>
              <Pie
                data={[
                  { name: "Completed", value: metrics.completedShipments, fill: "#4A9E7C" },
                  { name: "Active", value: metrics.activeShipments, fill: "#2A6D51" },
                  { name: "Delayed", value: metrics.delayedShipments, fill: "#B59A69" },
                ]}
                cx={300}
                cy={150}
                innerRadius={80}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                <Tooltip />
              </Pie>
            </PieChart>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/shipments/new" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-forest-50 transition-colors">
              <Truck className="w-5 h-5 text-forest-600" />
              <span className="text-sm font-medium text-charcoal">Create Shipment</span>
            </Link>
            <Link href="/batches/new" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-forest-50 transition-colors">
              <Package className="w-5 h-5 text-forest-600" />
              <span className="text-sm font-medium text-charcoal">Register Batch</span>
            </Link>
            <Link href="/users" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-forest-50 transition-colors">
              <Users className="w-5 h-5 text-forest-600" />
              <span className="text-sm font-medium text-charcoal">Manage Users</span>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}