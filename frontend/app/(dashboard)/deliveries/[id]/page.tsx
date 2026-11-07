"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  ArrowLeft, Loader2, ShieldAlert, Package, Scale, Thermometer,
  CheckCircle2, AlertTriangle, XCircle, ClipboardList
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

interface DeliveryReport {
  id: string;
  report_id: string;
  shipment_id: string;
  shipment_public_id?: string;
  delivered_quantity_kg: number;
  damaged_quantity_kg: number;
  missing_quantity_kg: number;
  received_by: string;
  received_at: string;
  delivery_photos: string[];
  receiver_signature?: string;
  notes?: string;
  status: string;
  created_at: string;
}

interface Shipment {
  id: string;
  shipment_id: string;
  pickup_city: string;
  destination_city: string;
  status: string;
  total_cargo_weight_kg: number;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "DELIVERED") return <CheckCircle2 className="h-5 w-5 text-[#173B2F]" />;
  if (status === "PARTIAL") return <AlertTriangle className="h-5 w-5 text-amber-600" />;
  return <XCircle className="h-5 w-5 text-destructive" />;
}

export default function DeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const [report, setReport] = useState<DeliveryReport | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const { data: r } = await apiClient.get(`/delivery/reports/${reportId}`);
        setReport(r);

        // Try to load the linked shipment
        if (r.shipment_id) {
          try {
            const { data: s } = await apiClient.get(`/shipments/${r.shipment_id}`);
            setShipment(s);
          } catch {
            // Not critical
          }
        }
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Delivery report not found or access denied.");
      } finally {
        setLoading(false);
      }
    }
    if (reportId) {
      loadReport();
    }
  }, [reportId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#173B2F] mb-4" />
        <p className="text-sm text-muted-foreground">Loading delivery record...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="space-y-6">
        <Link href="/deliveries">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Deliveries
          </Button>
        </Link>
        <Card className="border-destructive/30">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <ShieldAlert className="h-10 w-10 text-destructive mb-3" />
            <h3 className="font-semibold text-lg text-foreground">Delivery Record Unavailable</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">{error || "Report not found."}</p>
            <Button onClick={() => router.push("/deliveries")} variant="outline">
              Return to Deliveries
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalHandled = report.delivered_quantity_kg + report.damaged_quantity_kg + report.missing_quantity_kg;
  const originalKg = shipment?.total_cargo_weight_kg || totalHandled;
  const integrityPct = originalKg > 0 ? Math.round((report.delivered_quantity_kg / originalKg) * 100) : 100;
  const damagePct = originalKg > 0 ? Math.round((report.damaged_quantity_kg / originalKg) * 100) : 0;
  const missingPct = originalKg > 0 ? Math.round((report.missing_quantity_kg / originalKg) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/deliveries">
            <Button variant="ghost" size="icon" className="h-9 w-9 border border-input">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-serif">{report.report_id}</h1>
              <Badge
                className={
                  report.status === "DELIVERED"
                    ? "bg-[#173B2F] text-white"
                    : report.status === "PARTIAL"
                    ? "bg-amber-100 text-amber-900 border-amber-200"
                    : "bg-destructive/10 text-destructive border-destructive/20"
                }
              >
                <StatusIcon status={report.status} />
                <span className="ml-1">{report.status}</span>
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Recorded {new Date(report.created_at).toLocaleString()} •{" "}
              {report.shipment_public_id || `Shipment ${report.shipment_id.slice(0, 8)}…`}
            </p>
          </div>
        </div>

        {shipment && (
          <Link href={`/shipments/${report.shipment_id}`}>
            <Button variant="outline" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              View Shipment
            </Button>
          </Link>
        )}
      </div>

      {/* Cargo Integrity Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-[#173B2F]/30">
          <CardContent className="p-5">
            <span className="text-xs uppercase font-semibold text-muted-foreground">Cargo Dispatched</span>
            <p className="text-2xl font-bold text-foreground mt-1">{originalKg.toLocaleString()} kg</p>
            <p className="text-xs text-muted-foreground mt-1">At time of dispatch</p>
          </CardContent>
        </Card>

        <Card className="border-[#173B2F]/30">
          <CardContent className="p-5">
            <span className="text-xs uppercase font-semibold text-muted-foreground">Delivered Intact</span>
            <p className="text-2xl font-bold text-[#173B2F] mt-1">{report.delivered_quantity_kg.toLocaleString()} kg</p>
            <div className="flex items-center gap-1 mt-1">
              <div className="flex-1 bg-muted rounded-full h-1 overflow-hidden">
                <div className="bg-[#173B2F] h-1 rounded-full" style={{ width: `${integrityPct}%` }} />
              </div>
              <span className="text-xs font-semibold text-[#173B2F]">{integrityPct}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className={report.damaged_quantity_kg > 0 ? "border-amber-300" : ""}>
          <CardContent className="p-5">
            <span className="text-xs uppercase font-semibold text-muted-foreground">Damaged in Transit</span>
            <p className="text-2xl font-bold text-amber-600 mt-1">{report.damaged_quantity_kg.toLocaleString()} kg</p>
            <div className="flex items-center gap-1 mt-1">
              <div className="flex-1 bg-muted rounded-full h-1 overflow-hidden">
                <div className="bg-amber-500 h-1 rounded-full" style={{ width: `${damagePct}%` }} />
              </div>
              <span className="text-xs font-semibold text-amber-600">{damagePct}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className={report.missing_quantity_kg > 0 ? "border-destructive/40" : ""}>
          <CardContent className="p-5">
            <span className="text-xs uppercase font-semibold text-muted-foreground">Missing / Unaccounted</span>
            <p className="text-2xl font-bold text-destructive mt-1">{report.missing_quantity_kg.toLocaleString()} kg</p>
            <div className="flex items-center gap-1 mt-1">
              <div className="flex-1 bg-muted rounded-full h-1 overflow-hidden">
                <div className="bg-destructive h-1 rounded-full" style={{ width: `${missingPct}%` }} />
              </div>
              <span className="text-xs font-semibold text-destructive">{missingPct}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Delivery Attestation</CardTitle>
            <CardDescription>Receiver-confirmed delivery record</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Received By</span>
                <p className="font-medium text-foreground text-sm mt-1">{report.received_by}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Received At</span>
                <p className="font-medium text-foreground text-sm mt-1">
                  {new Date(report.received_at).toLocaleString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            {report.receiver_signature && (
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Digital Signature / Reference</span>
                <p className="font-mono text-xs text-foreground bg-muted/40 border border-border/50 rounded p-2 mt-1 break-all">
                  {report.receiver_signature}
                </p>
              </div>
            )}

            {report.notes && (
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Delivery Notes</span>
                <p className="text-sm text-foreground mt-1 p-3 bg-muted/30 border border-border/40 rounded-lg">{report.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Cargo Integrity Summary</CardTitle>
            <CardDescription>Breakdown of received vs dispatched cargo by weight</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground font-medium">Delivered Intact</span>
                <span className="text-[#173B2F] font-semibold">{report.delivered_quantity_kg.toLocaleString()} kg ({integrityPct}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="bg-[#173B2F] h-2 rounded-full" style={{ width: `${integrityPct}%` }} />
              </div>
            </div>

            {report.damaged_quantity_kg > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground font-medium">Damaged</span>
                  <span className="text-amber-600 font-semibold">{report.damaged_quantity_kg.toLocaleString()} kg ({damagePct}%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${damagePct}%` }} />
                </div>
              </div>
            )}

            {report.missing_quantity_kg > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground font-medium">Missing</span>
                  <span className="text-destructive font-semibold">{report.missing_quantity_kg.toLocaleString()} kg ({missingPct}%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-destructive h-2 rounded-full" style={{ width: `${missingPct}%` }} />
                </div>
              </div>
            )}

            <div className="border-t border-border/40 pt-3 flex justify-between font-semibold text-sm">
              <span>Total Handled</span>
              <span>{totalHandled.toLocaleString()} kg</span>
            </div>

            <div className="p-3 bg-muted/30 border border-border/40 rounded-lg text-xs text-muted-foreground">
              This delivery report is permanently recorded on the AgriChain SHA-256 hash-chained audit ledger and cannot be altered.
            </div>
          </CardContent>
        </Card>
      </div>

      {report.delivery_photos && report.delivery_photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Delivery Documentation ({report.delivery_photos.length} files)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {report.delivery_photos.map((photo, i) => (
                <div key={i} className="rounded-lg border border-border/50 bg-muted/30 p-3 text-center">
                  <Package className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground truncate">{photo}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

