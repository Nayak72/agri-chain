"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Package, Truck, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const { data } = await apiClient.get("/purchase-orders");
      setOrders(data || []);
    } catch (e) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    ACCEPTED: "bg-green-100 text-green-700",
    PLACED: "bg-blue-100 text-blue-700",
    FULFILLED: "bg-indigo-100 text-indigo-700",
    REJECTED: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-700",
    DRAFT: "bg-amber-100 text-amber-700",
    PARTIALLY_FULFILLED: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-charcoal">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage commercial orders for agricultural produce.</p>
        </div>
        <Button className="bg-forest-800 text-white">
          <Plus className="w-4 h-4 mr-2" /> New Order
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Order ID</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Produce</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Qty (kg)</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="p-8 text-center text-muted-foreground">Loading orders...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan="7" className="p-8 text-center text-muted-foreground">No orders found.</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o.order_id} className="border-b border-border/40 hover:bg-white/40 transition-colors">
                  <td className="px-4 py-4 font-medium text-charcoal">{o.order_id}</td>
                  <td className="px-4 py-4 text-muted-foreground">{o.produce_type}</td>
                  <td className="px-4 py-4 text-muted-foreground">{o.requested_quantity_kg}</td>
                  <td className="px-4 py-4 text-muted-foreground">{formatCurrency(o.total_amount_paise || 0)}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[o.status] || "bg-gray-100 text-gray-700"}`}>
                      {o.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/purchase-orders/${o.order_id}`}>View</a>
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