"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Package, Truck } from "lucide-react";

export default function BatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBatches();
  }, []);

  async function fetchBatches() {
    try {
      const { data } = await apiClient.get("/batches");
      setBatches(data);
    } catch (e) {
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-charcoal">Harvest Batches</h1>
          <p className="text-muted-foreground">Manage your agricultural produce batches from harvest to delivery.</p>
        </div>
        <Button className="bg-forest-800 text-white">
          <Plus className="w-4 h-4 mr-2" /> New Batch
        </Button>
      </div>

      <div className="flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Batch ID</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Produce</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Harvest Date</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Qty (kg)</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Available</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Grade</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">Loading batches...</td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">No batches found.</td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.batch_id} className="border-b border-border/40 hover:bg-white/40 transition-colors">
                    <td className="px-4 py-4 font-medium text-charcoal">{batch.batch_id}</td>
                    <td className="px-4 py-4 text-muted-foreground">{batch.produce_type}</td>
                    <td className="px-4 py-4 text-muted-foreground">{new Date(batch.harvest_date).toLocaleDateString()}</td>
                    <td className="px-4 py-4 text-muted-foreground">{batch.initial_quantity_kg}</td>
                    <td className="px-4 py-4 text-muted-foreground">{batch.available_quantity_kg}</td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-medium">
                        {batch.quality_grade}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 rounded bg-forest-100 text-forest-800 text-xs font-medium">
                        {batch.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Button size="sm" variant="outline" asChild>
                        <a href={`/batches/${batch.batch_id}`}>View</a>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}