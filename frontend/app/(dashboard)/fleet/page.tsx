"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { Plus, Truck, Thermometer, AlertCircle, Loader2, CheckCircle2, Wrench } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";

interface Vehicle {
  id: string;
  vehicle_id: string;
  registration_number: string;
  category: string;
  vehicle_type: string;
  max_payload_kg: number;
  available_capacity_kg: number;
  refrigeration_available: boolean;
  temperature_min?: number;
  temperature_max?: number;
  status: string;
  registration_expiry: string;
  insurance_expiry: string;
}

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-[#173B2F] text-white",
  ASSIGNED: "bg-sky-100 text-sky-900 border-sky-200",
  MAINTENANCE: "bg-amber-100 text-amber-900 border-amber-200",
  RETIRED: "bg-muted text-muted-foreground",
};

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchVehicles() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get("/vehicles");
        setVehicles(Array.isArray(data) ? data : data?.items || []);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load fleet vehicles");
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    }
    fetchVehicles();
  }, []);

  const filtered = vehicles.filter(
    (v) =>
      v.registration_number.toLowerCase().includes(search.toLowerCase()) ||
      v.vehicle_id.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase())
  );

  const available = vehicles.filter((v) => v.status === "AVAILABLE").length;
  const assigned = vehicles.filter((v) => v.status === "ASSIGNED").length;
  const maintenance = vehicles.filter((v) => v.status === "MAINTENANCE").length;
  const refrigerated = vehicles.filter((v) => v.refrigeration_available).length;
  const utilization = vehicles.length > 0 ? Math.round((assigned / vehicles.length) * 100) : 0;

  // Check expiry warnings
  const today = new Date();
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet Management"
        description="Register and monitor cold-chain certified vehicles and their compliance status"
        actions={
          <Link href="/fleet/new">
            <Button className="bg-[#173B2F] hover:bg-[#102820] text-white gap-2">
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Button>
          </Link>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Fleet", value: vehicles.length, icon: Truck },
          { label: "Available", value: available, icon: CheckCircle2, accent: true },
          { label: "Assigned", value: assigned, icon: Truck },
          { label: "Maintenance", value: maintenance, icon: Wrench },
          { label: "Refrigerated", value: refrigerated, icon: Thermometer },
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

      {/* Utilization bar */}
      {vehicles.length > 0 && (
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground shrink-0">Fleet Utilization</span>
            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#173B2F] h-2 rounded-full transition-all duration-500"
                style={{ width: `${utilization}%` }}
              />
            </div>
            <span className="text-sm font-bold text-foreground shrink-0">{utilization}%</span>
          </CardContent>
        </Card>
      )}

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
              placeholder="Search registration, vehicle ID, category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm"
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{filtered.length} vehicles</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#173B2F] mb-3" />
            <p className="text-sm text-muted-foreground">Loading fleet data…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Truck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No vehicles found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search ? "No vehicles match your search." : "Register your first vehicle to build your fleet."}
            </p>
            {!search && (
              <Link href="/fleet/new">
                <Button className="bg-[#173B2F] hover:bg-[#102820] text-white">Add Vehicle</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Vehicle ID</TableHead>
                  <TableHead>Registration</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Payload (kg)</TableHead>
                  <TableHead>Refrigeration</TableHead>
                  <TableHead>Reg. Expiry</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v) => {
                  const regExpiry = new Date(v.registration_expiry);
                  const regExpiring = regExpiry <= thirtyDays;
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-xs font-semibold">{v.vehicle_id}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-foreground">{v.registration_number}</TableCell>
                      <TableCell className="text-sm">{v.category?.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-sm font-semibold">{v.max_payload_kg?.toLocaleString()}</TableCell>
                      <TableCell>
                        {v.refrigeration_available ? (
                          <span className="flex items-center gap-1 text-xs text-[#173B2F] font-medium">
                            <Thermometer className="h-3 w-3" />
                            {v.temperature_min}°–{v.temperature_max}°C
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Ambient only</span>
                        )}
                      </TableCell>
                      <TableCell className={`text-xs ${regExpiring ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                        {regExpiry.toLocaleDateString("en-IN", { dateStyle: "medium" })}
                        {regExpiring && " ⚠️"}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_STYLES[v.status] || "bg-muted text-muted-foreground"}>
                          {v.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
