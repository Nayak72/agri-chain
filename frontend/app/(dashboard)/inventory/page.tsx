"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Package } from "lucide-react";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    try {
      const { data } = await apiClient.get("/inventory");
      setInventory(data || []);
    } catch (e) {
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    AVAILABLE: "bg-green-100 text-green-700",
    RESERVED: "bg-amber-100 text-amber-700",
    DISPATCHED: "bg-blue-100 text-blue-700",
    DAMAGED: "bg-red-100 text-red-700",
    REJECTED: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-charcoal">Inventory</h1>
          <p className="text-muted-foreground">Track warehouse stock levels and movements.</p>
        </div>
        <Button className="bg-forest-800 text-white">
          <Plus className="w-4 h-4 mr-2" /> New Movement
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Batch ID</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Produce</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantity (kg)</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Reserved</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Grade</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : inventory.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No inventory found.</td></tr>
            ) : (
              inventory.map((item) => (
                <tr key={item.id} className="border-b border-border/40 hover:bg-white/40 transition-colors">
                  <td className="px-4 py-4 font-medium text-charcoal">{item.batch_id}</td>
                  <td className="px-4 py-4 text-muted-foreground">{item.produce_type}</td>
                  <td className="px-4 py-4 text-muted-foreground">{item.quantity_kg}</td>
                  <td className="px-4 py-4 text-muted-foreground">{item.reserved_quantity_kg}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[item.status] || "bg-gray-100 text-gray-700"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{item.quality_grade}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}