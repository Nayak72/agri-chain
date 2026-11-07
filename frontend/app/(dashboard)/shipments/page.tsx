"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Truck, Activity, Package, MapPin, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { motion } from "framer-motion";
import { Skeleton, SkeletonTableRow } from "@/components/ui/skeleton";
import Link from "next/link";
import { Eye, MoreHorizontal } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface Shipment {
  id: string;
  shipment_id: string;
  pickup_city: string;
  destination_city: string;
  status: string;
  total_cargo_weight_kg: number;
  vehicle_id?: string;
  driver_id?: string;
  created_at: string;
}

const statusConfig: Record<string, { variant: "default" | "success" | "warning" | "destructive" | "info" | "secondary"; label: string }> = {
  DELIVERED: { variant: "success", label: "Delivered" },
  IN_TRANSIT: { variant: "info", label: "In Transit" },
  DISPATCHED: { variant: "default", label: "Dispatched" },
  LOADED: { variant: "default", label: "Loaded" },
  LOADING: { variant: "secondary", label: "Loading" },
  DELAYED: { variant: "warning", label: "Delayed" },
  CANCELLED: { variant: "destructive", label: "Cancelled" },
  BOOKING_CONFIRMED: { variant: "info", label: "Booking Confirmed" },
  VEHICLE_ASSIGNED: { variant: "secondary", label: "Vehicle Assigned" },
  DRIVER_ASSIGNED: { variant: "secondary", label: "Driver Assigned" },
  AT_CHECKPOINT: { variant: "info", label: "At Checkpoint" },
  ARRIVED_AT_DESTINATION: { variant: "info", label: "Arrived" },
  OUT_FOR_DELIVERY: { variant: "default", label: "Out for Delivery" },
  PARTIALLY_DELIVERED: { variant: "warning", label: "Partially Delivered" },
  DELIVERY_REJECTED: { variant: "destructive", label: "Delivery Rejected" },
  BOOKING_REQUESTED: { variant: "secondary", label: "Booking Requested" },
  QUOTATION_PENDING: { variant: "warning", label: "Quotation Pending" },
};

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get("/shipments");
        setShipments(data || []);
        setError(null);
      } catch (e) {
        setError("Failed to load shipments. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchShipments();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipments"
        description="Track the movement of agricultural produce through the supply chain."
        actions={
          <Button asChild>
            <Link href="/shipments/new">
              <Plus className="w-4 h-4 mr-2" />
              New Shipment
            </Link>
          </Button>
        }
      />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-destructive/20 bg-destructive/5 p-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </motion.div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <StaggerContainer>
                {[1, 2, 3, 4, 5].map((i) => (
                  <StaggerItem key={i} delay={i * 0.03}>
                    <SkeletonTableRow columns={7} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          ) : shipments.length === 0 ? (
            <div className="p-12 text-center">
              <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No shipments found</h3>
              <p className="text-muted-foreground mb-6">Create your first shipment to get started.</p>
              <Button asChild>
                <Link href="/shipments/new">
                  <Plus className="w-4 h-4 mr-2" />
                  New Shipment
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shipment ID</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Weight (kg)</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((shipment) => {
                    const status = statusConfig[shipment.status] || { variant: "secondary", label: shipment.status.replace(/_/g, " ") };
                    return (
                      <TableRow key={shipment.shipment_id}>
                        <TableCell className="font-mono font-medium text-foreground">{shipment.shipment_id}</TableCell>
                        <TableCell className="text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {shipment.pickup_city} → {shipment.destination_city}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{shipment.total_cargo_weight_kg.toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">{shipment.vehicle_id || "—"}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">{shipment.driver_id || "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/shipments/${shipment.shipment_id}`}>
                                <Eye className="w-4 h-4" />
                                <span className="sr-only">View {shipment.shipment_id}</span>
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}