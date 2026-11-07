"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { SkeletonTableRow } from "@/components/ui/skeleton";
import { Navigation, AlertCircle, Eye } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface DeliveryReport {
  id: string;
  report_id: string;
  shipment_id: string;
  shipment_public_id?: string;
  delivered_quantity_kg: number;
  damaged_quantity_kg: number;
  missing_quantity_kg: number;
  received_by: string;
  status: "DELIVERED" | "PARTIAL" | "REJECTED" | "PENDING";
  received_at: string;
  created_at: string;
}

const statusBadgeVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  DELIVERED: "success",
  PARTIAL: "warning",
  REJECTED: "destructive",
  PENDING: "secondary",
};

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<DeliveryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  async function fetchDeliveries() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get("/delivery/reports");
      const items = data.items || (Array.isArray(data) ? data : []);
      setDeliveries(items);
    } catch (e: any) {
      setError("Unable to retrieve delivery records from server. Please verify backend connectivity.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Verification & Reports"
        description="Verified receipt manifests, quantity reconciliation, and proof-of-delivery records."
      />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-destructive/20 bg-destructive/5 p-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Failed to Load Deliveries</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDeliveries}>
              Retry
            </Button>
          </div>
        </motion.div>
      )}

      <Card className="border-border/70 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report ID</TableHead>
                <TableHead>Shipment Reference</TableHead>
                <TableHead>Delivered (kg)</TableHead>
                <TableHead>Damaged (kg)</TableHead>
                <TableHead>Missing (kg)</TableHead>
                <TableHead>Received By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Receipt Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={9} />
                ))
              ) : deliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-40 text-center">
                    <Navigation className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">No delivery reports recorded yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Delivery manifests will appear here once driver confirms drop-off.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                deliveries.map((d) => (
                  <TableRow key={d.report_id || d.id} className="hover:bg-secondary/30 transition-colors">
                    <TableCell className="font-mono font-medium text-foreground text-xs">
                      {d.report_id}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/shipments/${d.shipment_id}`}
                        className="text-primary hover:underline font-mono text-xs"
                      >
                        {d.shipment_public_id || d.shipment_id}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{d.delivered_quantity_kg.toLocaleString()} kg</TableCell>
                    <TableCell className={d.damaged_quantity_kg > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
                      {d.damaged_quantity_kg.toLocaleString()} kg
                    </TableCell>
                    <TableCell className={d.missing_quantity_kg > 0 ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                      {d.missing_quantity_kg.toLocaleString()} kg
                    </TableCell>
                    <TableCell className="text-muted-foreground">{d.received_by || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant[d.status] || "secondary"} className="text-[10px]">
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(d.received_at || d.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/deliveries/${d.id || d.report_id}`}>
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
