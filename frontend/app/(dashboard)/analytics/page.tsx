"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie } from "recharts";
import { Truck, Package, Users, AlertCircle, BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function AnalyticsPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
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
    } catch (e) {
      setDashboard({
        shipment: { total_shipments: 0, active_shipments: 0, completed_shipments: 0, delayed_shipments: 0, average_transit_hours: 0, on_time_delivery_percentage: 0 },
        shipmentStats: { status_distribution: [], monthly_volume: [], total: 0 },
        freight: { total_freight_expenditure_paise: 0, average_freight_cost_paise: 0, freight_cost_per_kg: 0, average_quotation_value_paise: 0, transporter_wise_cost: [], route_wise_cost: [] },
        quality: { total_dispatched_quantity_kg: 0, accepted_quantity_kg: 0, damaged_quantity_kg: 0, rejected_quantity_kg: 0, damage_rate_percentage: 0, rejection_rate_percentage: 0, cold_chain_compliance_percentage: 100, temperature_excursion_count: 0, total_excursion_duration_hours: 0 },
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forest-800"></div>
      </div>
    );
  }

  const d = dashboard?.shipment || {};
  const q = dashboard?.quality || {};
  const f = dashboard?.freight || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-charcoal">Analytics & Reports</h1>
        <p className="text-muted-foreground">Real-time insights from your supply chain operations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-panel p-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Total Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif font-bold text-charcoal">{d.total_shipments || 0}</div>
          </CardContent>
        </Card>
        <Card className="glass-panel p-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">On-Time Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif font-bold text-charcoal">{d.on_time_delivery_percentage?.toFixed(1) || 0}%</div>
          </CardContent>
        </Card>
        <Card className="glass-panel p-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Damage Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif font-bold text-charcoal">{q.damage_rate_percentage?.toFixed(2) || 0}%</div>
          </CardContent>
        </Card>
        <Card className="glass-panel p-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Cold Chain Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif font-bold text-charcoal">{q.cold_chain_compliance_percentage?.toFixed(1) || 100}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Shipment Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <PieChart width={400} height={400}>
              <Pie
                data={dashboard?.shipmentStats?.status_distribution?.map((s: any) => ({ name: s._id, value: s.count })) || [{ name: "No Data", value: 1 }]}
                cx={200} cy={200} innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value"
              >
                <Tooltip />
              </Pie>
            </PieChart>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Shipment Volume</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <BarChart width={500} height={300}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="_id" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#4A9E7C" />
            </BarChart>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Freight Expenditure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-serif font-bold text-charcoal">{formatCurrency(f.total_freight_expenditure_paise || 0)}</div>
            <div className="text-xs text-muted-foreground mt-2">Average: {formatCurrency(f.average_freight_cost_paise || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Freight Cost per KG</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-serif font-bold text-charcoal">₹{(f.freight_cost_per_kg || 0).toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-2">Total: {formatCurrency(f.total_freight_expenditure_paise || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transporter Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard?.freight?.transporter_wise_cost?.map((t: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transporter {i + 1}</span>
                  <span className="text-charcoal font-medium">{formatCurrency(t.total_cost || 0)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}