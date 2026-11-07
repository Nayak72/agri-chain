"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Package, Truck } from "lucide-react";

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  async function fetchDeliveries() {
    try {
      const { data } = await apiClient.get("/delivery/reports");
      setDeliveries(data || []);
    } catch (e) {
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    DELIVERED: "bg-green-100 text-green-700",
    PARTIAL: "bg-amber-100 text-amber-700",
    REJECTED: "bg-red-100 text-red-700",
    PENDING: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-charcoal">Deliveries</h1>
          <p className="text-muted-foreground">Track delivery confirmations and proof of delivery.</p>
        </div>
        <Button className="bg-forest-800 text-white">
          <MapPin className="w-4 h-4 mr-2" /> New Report
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Report ID</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Shipment</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Delivered (kg)</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Damaged (kg)</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : deliveries.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No deliveries found.</td></tr>
            ) : (
              deliveries.map((d) => (
                <tr key={d.report_id} className="border-b border-border/40 hover:bg-white/40 transition-colors">
                  <td className="px-4 py-4 font-medium text-charcoal">{d.report_id}</td>
                  <td className="px-4 py-4 text-muted-foreground">{d.shipment_id}</td>
                  <td className="px-4 py-4 text-muted-foreground">{d.delivered_quantity_kg}</td>
                  <td className="px-4 py-4 text-muted-foreground">{d.damaged_quantity_kg}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[d.status] || "bg-gray-100 text-gray-700"}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}