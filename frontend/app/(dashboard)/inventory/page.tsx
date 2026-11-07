"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { Package, AlertCircle, Loader2, ArrowRight, Layers, Scale, Thermometer } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface InventoryItem {
  id: string;
  batch_id: string;
  produce_type: string;
  quantity_kg: number;
  reserved_quantity_kg?: number;
  storage_location?: string;
  quality_grade?: string;
  entry_date: string;
  status: string;
  warehouse_id?: string;
  temperature_min?: number;
  temperature_max?: number;
}

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-[#173B2F] text-white",
  RESERVED: "bg-amber-100 text-amber-900 border-amber-200",
  DISPATCHED: "bg-sky-100 text-sky-900 border-sky-200",
  DAMAGED: "bg-destructive/10 text-destructive border-destructive/20",
  REJECTED: "bg-muted text-muted-foreground",
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchInventory() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get("/inventory");
        setInventory(Array.isArray(data) ? data : data?.items || []);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load inventory");
        setInventory([]);
      } finally {
        setLoading(false);
      }
    }
    fetchInventory();
  }, []);

  const filtered = inventory.filter(
    (item) =>
      item.batch_id?.toLowerCase().includes(search.toLowerCase()) ||
      item.produce_type?.toLowerCase().includes(search.toLowerCase()) ||
      item.storage_location?.toLowerCase().includes(search.toLowerCase())
  );

  const totalKg = inventory.reduce((s, item) => s + (item.quantity_kg || 0), 0);
  const availableKg = inventory.filter((i) => i.status === "AVAILABLE").reduce((s, i) => s + i.quantity_kg, 0);
  const reservedKg = inventory.filter((i) => i.status === "RESERVED").reduce((s, i) => s + i.quantity_kg, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Management"
        description="Real-time tracking of produce lots stored across warehouse facilities"
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Lots", value: inventory.length, icon: Layers },
          { label: "Available (kg)", value: availableKg.toLocaleString(), icon: Package, accent: true },
          { label: "Reserved (kg)", value: reservedKg.toLocaleString(), icon: Package },
          { label: "Total Stock (kg)", value: totalKg.toLocaleString(), icon: Scale },
        ].map((s, i) => (
          <Card key={i} className={s.accent ? "border-[#173B2F]/30" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase text-muted-foreground">{s.label}</span>
                <s.icon className={`h-4 w-4 ${s.accent ? "text-[#173B2F]" : "text-muted-foreground"}`} />
              </div>
              <p className={`text-2xl font-bold ${s.accent ? "text-[#173B2F]" : "text-foreground"}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      )}

      <Card>
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative max-w-sm w-full">
            <Input
              placeholder="Search batch, produce type, location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm"
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{filtered.length} lots</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#173B2F] mb-3" />
            <p className="text-sm text-muted-foreground">Loading inventory…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No inventory found</h3>
            <p className="text-sm text-muted-foreground">
              {search ? "No lots match your search." : "No produce lots are currently in stock."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Batch Ref</TableHead>
                  <TableHead>Produce</TableHead>
                  <TableHead>Quantity (kg)</TableHead>
                  <TableHead>Reserved (kg)</TableHead>
                  <TableHead>Bay / Location</TableHead>
                  <TableHead>Quality Grade</TableHead>
                  <TableHead>Entry Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Batch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id} className="group">
                    <TableCell className="font-mono text-xs font-semibold">{item.batch_id}</TableCell>
                    <TableCell className="text-sm font-medium text-foreground">{item.produce_type}</TableCell>
                    <TableCell className="text-sm font-semibold">{item.quantity_kg?.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-amber-700">
                      {item.reserved_quantity_kg ? item.reserved_quantity_kg.toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.storage_location || "Bay A"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{item.quality_grade || "Grade A"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.entry_date ? new Date(item.entry_date).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_STYLES[item.status] || "bg-muted text-muted-foreground"}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/batches/${item.batch_id}`}>
                        <Button size="sm" variant="ghost" className="h-7 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                          Batch <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
