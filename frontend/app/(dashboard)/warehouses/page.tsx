"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { Plus, Building2, AlertCircle, Loader2, ArrowRight, Thermometer, Scale } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";

interface Warehouse {
  id: string;
  name: string;
  city: string;
  state: string;
  capacity_kg: number;
  cold_storage_capacity_kg: number;
  temperature_range_min?: number;
  temperature_range_max?: number;
  has_refrigeration: boolean;
  certifications: string[];
  is_active: boolean;
  created_at: string;
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchWarehouses() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get("/warehouses");
        setWarehouses(Array.isArray(data) ? data : data?.items || []);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load warehouses");
        setWarehouses([]);
      } finally {
        setLoading(false);
      }
    }
    fetchWarehouses();
  }, []);

  const filtered = warehouses.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.city?.toLowerCase().includes(search.toLowerCase()) ||
      w.state?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCapacityKg = warehouses.reduce((s, w) => s + (w.capacity_kg || 0), 0);
  const totalColdCapacityKg = warehouses.reduce((s, w) => s + (w.cold_storage_capacity_kg || 0), 0);
  const refrigerated = warehouses.filter((w) => w.has_refrigeration).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Network"
        description="Cold-chain storage terminals and general agri-commodity warehouses"
        actions={
          <Link href="/warehouses/new">
            <Button className="bg-[#173B2F] hover:bg-[#102820] text-white gap-2">
              <Plus className="h-4 w-4" />
              Register Warehouse
            </Button>
          </Link>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Facilities", value: warehouses.length, icon: Building2 },
          { label: "Cold-Chain Hubs", value: refrigerated, icon: Thermometer, accent: true },
          { label: "Total Capacity", value: `${(totalCapacityKg / 1000).toFixed(1)} MT`, icon: Scale },
          { label: "Cold Storage", value: `${(totalColdCapacityKg / 1000).toFixed(1)} MT`, icon: Thermometer },
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
              placeholder="Search name, city, state…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm"
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{filtered.length} facilities</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#173B2F] mb-3" />
            <p className="text-sm text-muted-foreground">Loading warehouse network…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No warehouses found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search ? "No facilities match your search." : "Register your first warehouse facility to start."}
            </p>
            {!search && (
              <Link href="/warehouses/new">
                <Button className="bg-[#173B2F] hover:bg-[#102820] text-white">Register Warehouse</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Facility Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Total Capacity</TableHead>
                  <TableHead>Cold Storage</TableHead>
                  <TableHead>Temp Range</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((w) => (
                  <TableRow key={w.id} className="group">
                    <TableCell>
                      <div className="font-medium text-sm text-foreground">{w.name}</div>
                      {w.certifications?.length > 0 && (
                        <div className="text-xs text-muted-foreground">{w.certifications.slice(0, 2).join(", ")}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{w.city}, {w.state}</TableCell>
                    <TableCell className="text-sm font-semibold">{w.capacity_kg?.toLocaleString()} kg</TableCell>
                    <TableCell className="text-sm">
                      {w.has_refrigeration ? (
                        <span className="text-[#173B2F] font-medium">{w.cold_storage_capacity_kg?.toLocaleString()} kg</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {w.has_refrigeration && w.temperature_range_min !== undefined ? (
                        <span className="flex items-center gap-1 text-xs text-[#173B2F] font-medium">
                          <Thermometer className="h-3 w-3" />
                          {w.temperature_range_min}°–{w.temperature_range_max}°C
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Ambient</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={w.is_active ? "bg-[#173B2F] text-white" : "bg-muted text-muted-foreground"}>
                        {w.is_active ? "Operational" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/warehouses/${w.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                          Details <ArrowRight className="h-3 w-3 ml-1" />
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
