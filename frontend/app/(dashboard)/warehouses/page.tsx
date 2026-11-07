"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Warehouse } from "lucide-react";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  async function fetchWarehouses() {
    try {
      const { data } = await apiClient.get("/warehouses");
      setWarehouses(data || []);
    } catch (e) {
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-charcoal">Warehouses</h1>
          <p className="text-muted-foreground">Manage warehouse facilities and storage capacity.</p>
        </div>
        <Button className="bg-forest-800 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Warehouse
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">City</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Capacity (kg)</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cold Storage</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Refrigeration</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : warehouses.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-muted-foreground">No warehouses found.</td></tr>
            ) : (
              warehouses.map((w) => (
                <tr key={w.id} className="border-b border-border/40 hover:bg-white/40 transition-colors">
                  <td className="px-4 py-4 font-medium text-charcoal">{w.name}</td>
                  <td className="px-4 py-4 text-muted-foreground">{w.city}, {w.state}</td>
                  <td className="px-4 py-4 text-muted-foreground">{w.capacity_kg}</td>
                  <td className="px-4 py-4 text-muted-foreground">{w.cold_storage_capacity_kg}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${w.has_refrigeration ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                      {w.has_refrigeration ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${w.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {w.is_active ? "Active" : "Inactive"}
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