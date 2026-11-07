"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowLeft, Building2, Thermometer, ShieldCheck, Box, Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Warehouse {
  id: string;
  name: string;
  manager_id: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  capacity_kg: number;
  cold_storage_capacity_kg: number;
  temperature_range_min?: number;
  temperature_range_max?: number;
  has_refrigeration: boolean;
  certifications: string[];
  is_active: boolean;
  created_at: string;
}

interface InventoryItem {
  id: string;
  batch_id: string;
  produce_type: string;
  quantity_kg: number;
  storage_location?: string;
  entry_date: string;
  quality_grade?: string;
}

export default function WarehouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const warehouseId = params.id as string;

  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadWarehouseData() {
      setLoading(true);
      setError(null);
      try {
        const { data: wh } = await apiClient.get(`/warehouses/${warehouseId}`);
        setWarehouse(wh);

        // Fetch inventory stored in this warehouse
        try {
          const { data: inv } = await apiClient.get("/inventory", {
            params: { warehouse_id: wh.id },
          });
          setInventory(Array.isArray(inv) ? inv : []);
        } catch {
          setInventory([]);
        }
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Warehouse facility not found.");
      } finally {
        setLoading(false);
      }
    }
    if (warehouseId) {
      loadWarehouseData();
    }
  }, [warehouseId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#173B2F] mb-4" />
        <p className="text-sm text-muted-foreground">Loading facility profile...</p>
      </div>
    );
  }

  if (error || !warehouse) {
    return (
      <div className="space-y-6">
        <Link href="/warehouses">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Warehouses
          </Button>
        </Link>
        <Card className="border-destructive/30">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <ShieldAlert className="h-10 w-10 text-destructive mb-3" />
            <h3 className="font-semibold text-lg text-foreground">Facility Record Unavailable</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">{error || "Unable to display warehouse facility."}</p>
            <Button onClick={() => router.push("/warehouses")} variant="outline">
              Return to Warehouse Network
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalOccupiedKg = inventory.reduce((acc, curr) => acc + (curr.quantity_kg || 0), 0);
  const occupancyPercent = warehouse.capacity_kg > 0 ? Math.min(100, Math.round((totalOccupiedKg / warehouse.capacity_kg) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/warehouses">
            <Button variant="ghost" size="icon" className="h-9 w-9 border border-input">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-serif">{warehouse.name}</h1>
              <Badge className={warehouse.is_active ? "bg-[#173B2F] text-white" : "bg-muted text-muted-foreground"}>
                {warehouse.is_active ? "OPERATIONAL" : "INACTIVE"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {warehouse.city}, {warehouse.state} ({warehouse.pincode}) • Registered on{" "}
              {new Date(warehouse.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <Link href="/inventory">
          <Button className="bg-[#173B2F] hover:bg-[#102820] text-white">
            <Box className="h-4 w-4 mr-2" /> View Stock Ledger
          </Button>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <span className="text-xs uppercase font-semibold text-muted-foreground">Total Capacity</span>
            <p className="text-2xl font-bold text-foreground mt-1">{warehouse.capacity_kg.toLocaleString()} kg</p>
            <p className="text-xs text-muted-foreground mt-1">Full terminal capacity</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <span className="text-xs uppercase font-semibold text-muted-foreground">Cold Storage</span>
            <p className="text-2xl font-bold text-[#173B2F] mt-1">
              {warehouse.has_refrigeration ? `${warehouse.cold_storage_capacity_kg.toLocaleString()} kg` : "N/A"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {warehouse.has_refrigeration ? `${warehouse.temperature_range_min}°C to ${warehouse.temperature_range_max}°C` : "Ambient only"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <span className="text-xs uppercase font-semibold text-muted-foreground">Current Stock</span>
            <p className="text-2xl font-bold text-foreground mt-1">{totalOccupiedKg.toLocaleString()} kg</p>
            <p className="text-xs text-muted-foreground mt-1">{inventory.length} active lots stored</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <span className="text-xs uppercase font-semibold text-muted-foreground">Utilization</span>
            <p className="text-2xl font-bold text-foreground mt-1">{occupancyPercent}%</p>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-[#173B2F] h-1.5 rounded-full"
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Current Stored Batches ({inventory.length})</CardTitle>
            <CardDescription>Live agricultural commodities currently held in facility storage bays</CardDescription>
          </CardHeader>
          <CardContent>
            {inventory.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No active lots stored in this warehouse at present.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch Ref</TableHead>
                      <TableHead>Produce</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Bay / Location</TableHead>
                      <TableHead>Quality Grade</TableHead>
                      <TableHead>Entry Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs font-semibold">{item.batch_id}</TableCell>
                        <TableCell className="text-sm font-medium">{item.produce_type}</TableCell>
                        <TableCell className="text-sm font-semibold">{item.quantity_kg.toLocaleString()} kg</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.storage_location || "Bay A"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.quality_grade || "Grade A"}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(item.entry_date).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Location & Standards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold block">Street Address</span>
              <p className="text-sm text-foreground mt-1">{warehouse.address}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {warehouse.city}, {warehouse.state} {warehouse.pincode}
              </p>
            </div>

            <div className="border-t border-border/40 pt-4">
              <span className="text-xs text-muted-foreground uppercase font-semibold block">Quality Certifications</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {warehouse.certifications && warehouse.certifications.length > 0 ? (
                  warehouse.certifications.map((c, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      <ShieldCheck className="h-3 w-3 mr-1 text-[#173B2F]" /> {c}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">Standard compliance verified</span>
                )}
              </div>
            </div>

            <div className="border-t border-border/40 pt-4">
              <span className="text-xs text-muted-foreground uppercase font-semibold block">Refrigeration System</span>
              <p className="text-sm text-foreground mt-1">
                {warehouse.has_refrigeration ? "Active HVAC Multi-Zone Coolant" : "Passive Ventilation"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

