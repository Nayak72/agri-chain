"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Package } from "lucide-react";

export default function ProducePage() {
  const [produce, setProduce] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProduce();
  }, []);

  async function fetchProduce() {
    try {
      const { data } = await apiClient.get("/produce");
      setProduce(data || []);
    } catch (e) {
      setProduce([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-charcoal">Produce Catalogue</h1>
          <p className="text-muted-foreground">Browse available fruits and vegetables.</p>
        </div>
        <Button className="bg-forest-800 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Produce
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full p-8 text-center text-muted-foreground">Loading...</div>
        ) : produce.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground">No produce found.</div>
        ) : (
          produce.map((p) => (
            <Card key={p.id} className="p-6">
              <div className="w-16 h-16 rounded-xl bg-forest-100 flex items-center justify-center text-forest-600 text-2xl mb-4">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="font-serif font-bold text-charcoal">{p.name}</h3>
              <p className="text-xs text-muted-foreground">{p.category} • {p.unit}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-medium text-charcoal">{p.produce_type}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                  {p.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}