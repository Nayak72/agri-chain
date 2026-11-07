"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Truck, Activity, Clock, Package } from "lucide-react";

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShipments();
  }, []);

  async function fetchShipments() {
    try {
      const { data } = await apiClient.get("/shipments");
      setShipments(data);
    } catch (e) {
      setShipments([]);
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    DELIVERED: "bg-green-100 text-green-700",
    IN_TRANSIT: "bg-blue-100 text-blue-700",
    DISPATCHED: "bg-indigo-100 text-indigo-700",
    LOADED: "bg-purple-100 text-purple-700",
    DELAYED: "bg-amber-100 text-amber-700",
    CANCELLED: "bg-red-100 text-red-700",
    LOADING: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-charcoal">Shipments</h1>
          <p className="text-muted-foreground">Track the movement of agricultural produce through the supply chain.</p>
        </div>
        <Button className="bg-forest-800 text-white">
          <Plus className="w-4 h-4 mr-2" /> New Shipment
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Shipment ID</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Route</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Weight (kg)</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Vehicle</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Driver</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="p-8 text-center text-muted-foreground">Loading shipments...</td></tr>
            ) : shipments.length === 0 ? (
              <tr><td colSpan="7" className="p-8 text-center text-muted-foreground">No shipments found.</td></tr>
            ) : (
              shipments.map((s) => (
                <tr key={s.shipment_id} className="border-b border-border/40 hover:bg-white/40 transition-colors">
                  <td className="px-4 py-4 font-medium text-charcoal">{s.shipment_id}</td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {s.pickup_city} → {s.destination_city}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[s.status] || "bg-gray-100 text-gray-700"}`}>
                      {s.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{s.total_cargo_weight_kg}</td>
                  <td className="px-4 py-4 text-muted-foreground">{s.vehicle_id || "—"}</td>
                  <td className="px-4 py-4 text-muted-foreground">{s.driver_id || "—"}</td>
                  <td className="px-4 py-4">
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/shipments/${s.shipment_id}`}>View Details</a>
                    </Button>
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