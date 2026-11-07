"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Truck } from "lucide-react";

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicles();
  }, []);

  async function fetchVehicles() {
    try {
      const { data } = await apiClient.get("/vehicles");
      setVehicles(data || []);
    } catch (e) {
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    AVAILABLE: "bg-green-100 text-green-700",
    ASSIGNED: "bg-blue-100 text-blue-700",
    MAINTENANCE: "bg-amber-100 text-amber-700",
    RETIRED: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-charcoal">Fleet Management</h1>
          <p className="text-muted-foreground">Manage vehicles, capacities, and availability.</p>
        </div>
        <Button className="bg-forest-800 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Vehicle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: "Total Vehicles", value: vehicles.length, icon: Truck },
          { label: "Available", value: vehicles.filter(v => v.status === "AVAILABLE").length, icon: Truck },
          { label: "Assigned", value: vehicles.filter(v => v.status === "ASSIGNED").length, icon: Truck },
          { label: "Maintenance", value: vehicles.filter(v => v.status === "MAINTENANCE").length, icon: Truck },
          { label: "Refrigerated", value: vehicles.filter(v => v.refrigeration_available).length, icon: Truck },
          { label: "Utilization", value: `${vehicles.length > 0 ? ((vehicles.filter(v => v.status === "ASSIGNED").length / vehicles.length) * 100).toFixed(1) : 0}%`, icon: Truck },
        ].map((stat, i) => (
          <Card key={i} className="glass-panel p-6">
            <CardHeader className="pb-2 flex items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="w-5 h-5 text-forest-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-serif font-bold text-charcoal">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Vehicle ID</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Registration</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Capacity (kg)</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Refrigeration</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : vehicles.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-muted-foreground">No vehicles found.</td></tr>
            ) : (
              vehicles.map((v) => (
                <tr key={v.vehicle_id} className="border-b border-border/40 hover:bg-white/40 transition-colors">
                  <td className="px-4 py-4 font-medium text-charcoal">{v.vehicle_id}</td>
                  <td className="px-4 py-4 text-muted-foreground">{v.registration_number}</td>
                  <td className="px-4 py-4 text-muted-foreground">{v.category}</td>
                  <td className="px-4 py-4 text-muted-foreground">{v.max_payload_kg}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${v.refrigeration_available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                      {v.refrigeration_available ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[v.status] || "bg-gray-100 text-gray-700"}`}>
                      {v.status}
                    </span>
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