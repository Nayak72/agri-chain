"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowLeft, Truck, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface FreightBooking {
  id: string;
  booking_id: string;
  purchase_order_id: string;
  pickup_city: string;
  destination_city: string;
  total_cargo_weight_kg: number;
}

interface Vehicle {
  id: string;
  vehicle_id: string;
  registration_number: string;
  category: string;
  max_payload_kg: number;
  status: string;
}

interface Driver {
  id: string;
  driver_id: string;
  name: string;
  phone: string;
  status: string;
}

export default function NewShipmentPage() {
  const router = useRouter();

  const [bookings, setBookings] = useState<FreightBooking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFormData() {
      setLoading(true);
      setError(null);
      try {
        const [bRes, vRes, dRes] = await Promise.all([
          apiClient.get("/freight-bookings?page_size=50"),
          apiClient.get("/vehicles?status=AVAILABLE&page_size=50"),
          apiClient.get("/drivers?status=AVAILABLE&page_size=50"),
        ]);
        setBookings(Array.isArray(bRes.data) ? bRes.data : bRes.data.items || []);
        setVehicles(Array.isArray(vRes.data) ? vRes.data : vRes.data.items || []);
        setDrivers(Array.isArray(dRes.data) ? dRes.data : dRes.data.items || []);
      } catch (e: any) {
        setError("Unable to load booking and fleet resources. Please check your connection.");
      } finally {
        setLoading(false);
      }
    }
    loadFormData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingId || !selectedVehicleId || !selectedDriverId) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // Find accepted quotation for booking or use placeholder ID
      const { data } = await apiClient.post("/shipments", {
        booking_id: selectedBookingId,
        accepted_quotation_id: "auto-assign",
        vehicle_id: selectedVehicleId,
        driver_id: selectedDriverId,
        planned_checkpoints: [],
      });
      toast.success("Shipment successfully created!");
      router.push(`/shipments/${data.id || data.shipment_id}`);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Failed to create shipment. Please review inputs.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/shipments">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Shipments
          </Link>
        </Button>
        <PageHeader
          title="Create New Shipment"
          description="Allocate verified fleet vehicles and authorized drivers to an active freight booking."
        />
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Dispatch Assignment</CardTitle>
          <CardDescription>Select eligible freight booking, available vehicle, and driver</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading freight resources...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Freight Booking Manifest *
                </label>
                <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select booking" />
                  </SelectTrigger>
                  <SelectContent>
                    {bookings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.booking_id} — {b.pickup_city} → {b.destination_city} ({b.total_cargo_weight_kg} kg)
                      </SelectItem>
                    ))}
                    {bookings.length === 0 && (
                      <SelectItem value="none" disabled>No active bookings available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Available Vehicle *
                  </label>
                  <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.registration_number} ({v.category.replace(/_/g, " ")})
                        </SelectItem>
                      ))}
                      {vehicles.length === 0 && (
                        <SelectItem value="none" disabled>No vehicles available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Assigned Driver *
                  </label>
                  <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} ({d.phone})
                        </SelectItem>
                      ))}
                      {drivers.length === 0 && (
                        <SelectItem value="none" disabled>No drivers available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border/50">
                <Button type="button" variant="outline" asChild>
                  <Link href="/shipments">Cancel</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !selectedBookingId || !selectedVehicleId || !selectedDriverId}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Dispatching...
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4 mr-2" />
                      Create Shipment
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

