"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Truck, Package, Users, BarChart3, DollarSign, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsData {
  shipment: {
    total_shipments: number;
    active_shipments: number;
    completed_shipments: number;
    delayed_shipments: number;
    average_transit_hours: number;
    on_time_delivery_percentage: number;
  };
  shipmentStats: {
    status_distribution: Array<{ _id: string; count: number }>;
    monthly_volume: Array<{ _id: string; count: number }>;
    total: number;
  };
  freight: {
    total_freight_expenditure_paise: number;
    average_freight_cost_paise: number;
    freight_cost_per_kg: number;
    average_quotation_value_paise: number;
    transporter_wise_cost: Array<{ transporter_id: string; total_cost: number }>;
    route_wise_cost: Array<{ route: string; total_cost: number }>;
  };
  quality: {
    total_dispatched_quantity_kg: number;
    accepted_quantity_kg: number;
    damaged_quantity_kg: number;
    rejected_quantity_kg: number;
    damage_rate_percentage: number;
    rejection_rate_percentage: number;
    cold_chain_compliance_percentage: number;
    temperature_excursion_count: number;
    total_excursion_duration_hours: number;
  };
}

const STATUS_COLORS = ["#4A9E7C", "#2A6D51", "#B59A69", "#3b82f6", "#ef4444"];

export default function AnalyticsPage() {
  const [dashboard, setDashboard] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [dRes, sRes, fRes, qRes] = await Promise.all([
          apiClient.get("/analytics/dashboard"),
          apiClient.get("/analytics/shipments"),
          apiClient.get("/analytics/freight"),
          apiClient.get("/analytics/quality"),
        ]);
        setDashboard({
          shipment: dRes.data,
          shipmentStats: sRes.data,
          freight: fRes.data,
          quality: qRes.data,
        });
        setError(null);
      } catch (e) {
        setError("Failed to load analytics data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Analytics & Reports"
          description="Real-time insights from your supply chain operations."
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

  const d = (dashboard?.shipment ?? {
    total_shipments: 0,
    active_shipments: 0,
    completed_shipments: 0,
    delayed_shipments: 0,
    average_transit_hours: 0,
    on_time_delivery_percentage: 0,
  });
  const q = (dashboard?.quality ?? {
    total_dispatched_quantity_kg: 0,
    accepted_quantity_kg: 0,
    damaged_quantity_kg: 0,
    rejected_quantity_kg: 0,
    damage_rate_percentage: 0,
    rejection_rate_percentage: 0,
    cold_chain_compliance_percentage: 100,
    temperature_excursion_count: 0,
    total_excursion_duration_hours: 0,
  });
  const f = (dashboard?.freight ?? {
    total_freight_expenditure_paise: 0,
    average_freight_cost_paise: 0,
    freight_cost_per_kg: 0,
    average_quotation_value_paise: 0,
    transporter_wise_cost: [],
    route_wise_cost: [],
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics & Reports"
        description="Real-time insights from your supply chain operations."
      />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-destructive/20 bg-destructive/5 p-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </motion.div>
      )}

      <StaggerContainer>
        <StaggerItem delay={0}>
          <Card variant="metric">
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Shipments</CardTitle>
              <Truck className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-bold text-foreground">{d.total_shipments || 0}</div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem delay={0.05}>
          <Card variant="metric">
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">On-Time Delivery</CardTitle>
              <TrendingUp className="w-5 h-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-bold text-foreground">{d.on_time_delivery_percentage?.toFixed(1) || 0}%</div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem delay={0.1}>
          <Card variant="metric">
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Damage Rate</CardTitle>
              <AlertCircle className="w-5 h-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-bold text-foreground">{q.damage_rate_percentage?.toFixed(2) || 0}%</div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem delay={0.15}>
          <Card variant="metric">
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cold Chain Compliance</CardTitle>
              <TrendingUp className="w-5 h-5 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-bold text-foreground">{q.cold_chain_compliance_percentage?.toFixed(1) || 100}%</div>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card variant="chart">
            <CardHeader>
              <CardTitle>Shipment Status Distribution</CardTitle>
              <CardDescription>Breakdown of shipments by current status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dashboard?.shipmentStats?.status_distribution?.map((s: any) => ({ name: s._id.replace(/_/g, " "), value: s.count })) || [{ name: "No Data", value: 1 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {STATUS_COLORS.map((color, index) => (
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
        >
          <Card variant="chart">
            <CardHeader>
              <CardTitle>Monthly Shipment Volume</CardTitle>
              <CardDescription>Number of shipments per month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboard?.shipmentStats?.monthly_volume || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString(), "Shipments"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      boxShadow: "0 10px 30px -10px rgba(23, 59, 47, 0.15)",
                    }}
                  />
                  <Bar dataKey="count" fill="#4A9E7C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card variant="highlight">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Total Freight Expenditure</CardTitle>
              <DollarSign className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-bold text-foreground">{formatCurrency(f.total_freight_expenditure_paise || 0)}</div>
              <div className="text-sm text-muted-foreground mt-2">Average: {formatCurrency(f.average_freight_cost_paise || 0)}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
        >
          <Card variant="highlight">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Freight Cost per KG</CardTitle>
              <TrendingUp className="w-5 h-5 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-bold text-foreground">₹{(f.freight_cost_per_kg || 0).toFixed(2)}</div>
              <div className="text-sm text-muted-foreground mt-2">Total: {formatCurrency(f.total_freight_expenditure_paise || 0)}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card variant="highlight">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Transporter Costs</CardTitle>
              <Truck className="w-5 h-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard?.freight?.transporter_wise_cost?.map((t: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">{t.transporter_id || `Transporter ${i + 1}`}</span>
                    <span className="text-sm font-medium text-foreground">{formatCurrency(t.total_cost || 0)}</span>
                  </div>
                ))}
                {(!dashboard?.freight?.transporter_wise_cost || dashboard.freight.transporter_wise_cost.length === 0) && (
                  <div className="text-center py-4 text-muted-foreground">No transporter cost data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.55 }}
        >
          <Card variant="chart">
            <CardHeader>
              <CardTitle>Quality Metrics</CardTitle>
              <CardDescription>Damage and rejection rates</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: "Damage Rate", value: q.damage_rate_percentage || 0 },
                  { name: "Rejection Rate", value: q.rejection_rate_percentage || 0 },
                  { name: "Cold Chain Compliance", value: q.cold_chain_compliance_percentage || 100 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(2)}%`, "Percentage"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      boxShadow: "0 10px 30px -10px rgba(23, 59, 47, 0.15)",
                    }}
                  />
                  <Bar dataKey="value" fill="#4A9E7C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <Card variant="chart">
            <CardHeader>
              <CardTitle>Cold Chain Excursions</CardTitle>
              <CardDescription>Temperature excursion count and duration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <div className="text-3xl font-serif font-bold text-destructive">{q.temperature_excursion_count || 0}</div>
                  <div className="text-sm text-muted-foreground">Excursion Count</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <div className="text-3xl font-serif font-bold text-warning">{q.total_excursion_duration_hours || 0}h</div>
                  <div className="text-sm text-muted-foreground">Total Duration</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}