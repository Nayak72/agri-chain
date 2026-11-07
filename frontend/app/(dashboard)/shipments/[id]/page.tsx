"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  Truck,
  MapPin,
  Clock,
  User,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Thermometer,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface ShipmentDetail {
  id: string;
  shipment_id: string;
  booking_id: string;
  purchase_order_id: string;
  farmer_id: string;
  buyer_id: string;
  transporter_id: string;
  vehicle_id: string;
  driver_id: string;
  batch_ids: string[];
  cargo_quantity_kg: number;
  total_cargo_weight_kg: number;
  package_count: number;
  pickup_address: string;
  pickup_city: string;
  pickup_state: string;
  destination_address: string;
  destination_city: string;
  destination_state: string;
  status: string;
  planned_dispatch_time?: string;
  expected_arrival_time?: string;
  actual_dispatch_time?: string;
  actual_arrival_time?: string;
  exception_flags?: string[];
  created_at: string;
  updated_at: string;
}

interface Checkpoint {
  id: string;
  checkpoint_id: string;
  shipment_id: string;
  name: string;
  city: string;
  state: string;
  sequence: number;
  status: string;
  actual_arrival?: string;
  actual_departure?: string;
}

interface LedgerEvent {
  index: number;
  block_id: string;
  event_type: string;
  event_summary: string;
  timestamp: string;
  hash: string;
}

export default function ShipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [ledgerEvents, setLedgerEvents] = useState<LedgerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get(`/shipments/${id}`);
        setShipment(data);

        // Fetch checkpoints if available
        try {
          const cpRes = await apiClient.get(`/checkpoints/shipments/${data.id || id}`);
          setCheckpoints(cpRes.data || []);
        } catch {}

        // Fetch ledger history for this shipment
        try {
          const ledgerRes = await apiClient.get(`/ledger/entity/SHIPMENT/${data.id || id}`);
          setLedgerEvents(ledgerRes.data?.blocks || ledgerRes.data || []);
        } catch {}
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Unable to load shipment details.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Retrieving shipment journey...</p>
        </div>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Shipments
        </Button>
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-foreground">Shipment Not Found</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">{error || "Could not retrieve shipment record."}</p>
          <Button asChild variant="outline">
            <Link href="/shipments">Return to List</Link>
          </Button>
        </div>
      </div>
    );
  }

  const statusVariants: Record<string, "success" | "warning" | "destructive" | "info" | "secondary"> = {
    DELIVERED: "success",
    IN_TRANSIT: "info",
    DISPATCHED: "info",
    LOADED: "secondary",
    DELAYED: "warning",
    CANCELLED: "destructive",
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/shipments">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Shipments
          </Link>
        </Button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-serif font-bold text-foreground tracking-tight">
                {shipment.shipment_id}
              </h1>
              <Badge variant={statusVariants[shipment.status] || "secondary"} className="text-xs uppercase tracking-wider">
                {shipment.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Registered on {new Date(shipment.created_at).toLocaleDateString()} • Hash-Chain Audited
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href={`/cold-chain`}>
                <Thermometer className="w-4 h-4 mr-2" /> Telemetry
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/deliveries/${shipment.id}`}>
                <FileText className="w-4 h-4 mr-2" /> Delivery Report
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Primary Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Route Card */}
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Route Manifest
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Origin Pickup</p>
              <p className="text-sm font-semibold text-foreground">{shipment.pickup_city}, {shipment.pickup_state}</p>
              <p className="text-xs text-muted-foreground truncate">{shipment.pickup_address}</p>
            </div>
            <div className="border-t border-border/50 pt-2">
              <p className="text-xs text-muted-foreground">Destination Delivery</p>
              <p className="text-sm font-semibold text-foreground">{shipment.destination_city}, {shipment.destination_state}</p>
              <p className="text-xs text-muted-foreground truncate">{shipment.destination_address}</p>
            </div>
          </CardContent>
        </Card>

        {/* Cargo Card */}
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" /> Cargo & Payload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Total Dispatched Weight</span>
              <span className="text-lg font-bold font-serif text-foreground">{shipment.total_cargo_weight_kg.toLocaleString()} kg</span>
            </div>
            <div className="flex justify-between items-baseline border-t border-border/50 pt-2">
              <span className="text-xs text-muted-foreground">Package Count</span>
              <span className="text-sm font-medium text-foreground">{shipment.package_count} units</span>
            </div>
            <div className="flex justify-between items-baseline border-t border-border/50 pt-2">
              <span className="text-xs text-muted-foreground">Associated Batches</span>
              <span className="text-xs font-mono text-muted-foreground">{shipment.batch_ids?.length || 0} batches</span>
            </div>
          </CardContent>
        </Card>

        {/* Transport Allocation */}
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Fleet Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Assigned Vehicle</p>
              <p className="text-sm font-mono font-medium text-foreground">{shipment.vehicle_id || "Unassigned"}</p>
            </div>
            <div className="border-t border-border/50 pt-2">
              <p className="text-xs text-muted-foreground">Designated Driver</p>
              <p className="text-sm font-mono font-medium text-foreground">{shipment.driver_id || "Unassigned"}</p>
            </div>
            <div className="border-t border-border/50 pt-2">
              <p className="text-xs text-muted-foreground">Transporter Account</p>
              <p className="text-xs font-mono text-muted-foreground truncate">{shipment.transporter_id}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shipment Journey Timeline */}
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Transit Timeline & Checkpoints</CardTitle>
          <CardDescription>Manual checkpoint progression recorded along the freight corridor</CardDescription>
        </CardHeader>
        <CardContent>
          {checkpoints.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-lg">
              <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No intermediate checkpoints reported yet.</p>
              <p className="text-xs text-muted-foreground mt-0.5">Checkpoints will update as the driver checks in.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-primary/30 ml-4 space-y-6 py-2">
              {checkpoints.map((cp, idx) => (
                <div key={cp.checkpoint_id || idx} className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-primary border-2 border-background" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <p className="text-sm font-semibold text-foreground">{cp.name} ({cp.city}, {cp.state})</p>
                    <Badge variant="outline" className="text-[10px] w-fit">{cp.status}</Badge>
                  </div>
                  {cp.actual_arrival && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Arrived: {new Date(cp.actual_arrival).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ledger Audit Trail for this Shipment */}
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-accent" />
            Cryptographic Audit Ledger Trail
          </CardTitle>
          <CardDescription>Immutable SHA-256 hash-chained event records for this shipment</CardDescription>
        </CardHeader>
        <CardContent>
          {ledgerEvents.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
              No individual ledger entries mapped to this shipment key yet.
            </div>
          ) : (
            <div className="space-y-3">
              {ledgerEvents.map((evt) => (
                <div
                  key={evt.block_id || evt.index}
                  className="p-3.5 rounded-lg border border-border/50 bg-secondary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent">Block #{evt.index}</span>
                      <span className="text-xs font-medium text-foreground">{evt.event_type}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{evt.event_summary}</p>
                    <p className="text-[10px] font-mono text-muted-foreground/70 truncate mt-1 max-w-xl">
                      Hash: {evt.hash}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {new Date(evt.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

