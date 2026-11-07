"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowLeft, CheckCircle2, Clock, Truck, ShieldAlert, Loader2, DollarSign } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

interface FreightBooking {
  id: string;
  booking_id: string;
  purchase_order_id: string;
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
  requested_pickup_date: string;
  required_delivery_date: string;
  preferred_vehicle_category: string;
  refrigeration_required: boolean;
  temperature_min?: number;
  temperature_max?: number;
  packaging_details?: string;
  special_handling_instructions?: string;
  status: string;
  created_at: string;
}

interface Quotation {
  id: string;
  quotation_id: string;
  booking_id: string;
  transporter_id: string;
  total_quote_paise: number;
  freight_base_charge_paise: number;
  handling_charge_paise: number;
  fuel_surcharge_paise: number;
  other_charges_paise: number;
  planned_distance_km: number;
  estimated_transit_hours: number;
  proposed_vehicle_category: string;
  status: string;
  valid_until: string;
  created_at: string;
}

export default function FreightBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<FreightBooking | null>(null);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transporter quote submission state
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [baseChargeRupees, setBaseChargeRupees] = useState("12000");
  const [handlingChargeRupees, setHandlingChargeRupees] = useState("1500");
  const [fuelChargeRupees, setFuelChargeRupees] = useState("2000");
  const [distanceKm, setDistanceKm] = useState("180");
  const [transitHours, setTransitHours] = useState("6");
  const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: bookingData } = await apiClient.get(`/freight-bookings/${bookingId}`);
      setBooking(bookingData);

      // Fetch quotations for this booking
      try {
        const { data: quotesData } = await apiClient.get(`/freight-quotes`, {
          params: { booking_id: bookingData.id },
        });
        setQuotations(Array.isArray(quotesData) ? quotesData : []);
      } catch {
        setQuotations([]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Freight booking not found or access denied.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId) {
      fetchData();
    }
  }, [bookingId]);

  const handleAcceptQuote = async (quoteId: string) => {
    setAcceptingQuoteId(quoteId);
    try {
      await apiClient.post(`/freight-quotes/${quoteId}/accept`);
      toast.success("Quotation accepted. Booking is now confirmed!");
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to accept quotation");
    } finally {
      setAcceptingQuoteId(null);
    }
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    setSubmittingQuote(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      const payload = {
        booking_id: booking.id,
        proposed_vehicle_category: booking.preferred_vehicle_category || "REFRIGERATED_TRUCK",
        freight_base_charge_paise: Math.round(parseFloat(baseChargeRupees) * 100),
        handling_charge_paise: Math.round(parseFloat(handlingChargeRupees) * 100),
        fuel_surcharge_paise: Math.round(parseFloat(fuelChargeRupees) * 100),
        other_charges_paise: 0,
        planned_distance_km: parseFloat(distanceKm) || 150,
        estimated_transit_hours: parseFloat(transitHours) || 6,
        expected_pickup_date: tomorrow.toISOString().split("T")[0],
        expected_delivery_date: dayAfter.toISOString().split("T")[0],
        validity_days: 7,
      };

      await apiClient.post("/freight-quotes", payload);
      toast.success("Quotation submitted successfully!");
      setShowQuoteForm(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to submit quotation");
    } finally {
      setSubmittingQuote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#173B2F] mb-4" />
        <p className="text-sm text-muted-foreground">Retrieving freight booking details...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="space-y-6">
        <Link href="/freight-bookings">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Freight Bookings
          </Button>
        </Link>
        <Card className="border-destructive/30">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <ShieldAlert className="h-10 w-10 text-destructive mb-3" />
            <h3 className="font-semibold text-lg text-foreground">Record Unavailable</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">{error || "Unable to display freight booking"}</p>
            <Button onClick={() => router.push("/freight-bookings")} variant="outline">
              Return to Logistics Hub
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isTransporter = user?.role === "TRANSPORTER";
  const canAccept = user?.role === "BUYER" || user?.role === "FARMER" || user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/freight-bookings">
            <Button variant="ghost" size="icon" className="h-9 w-9 border border-input">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-serif">{booking.booking_id}</h1>
              <Badge
                className={
                  booking.status === "CONFIRMED"
                    ? "bg-[#173B2F] text-white"
                    : booking.status === "REQUESTED"
                    ? "bg-amber-100 text-amber-900 border-amber-200"
                    : "bg-muted text-muted-foreground"
                }
              >
                {booking.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Created {new Date(booking.created_at).toLocaleDateString()} • PO Ref: {booking.purchase_order_id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isTransporter && booking.status !== "CONFIRMED" && (
            <Button
              onClick={() => setShowQuoteForm(!showQuoteForm)}
              className="bg-[#173B2F] hover:bg-[#102820] text-white"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              {showQuoteForm ? "Cancel Quotation" : "Submit Transporter Quote"}
            </Button>
          )}

          {booking.status === "CONFIRMED" && (
            <Link href="/shipments/new">
              <Button className="bg-[#173B2F] hover:bg-[#102820] text-white">
                <Truck className="h-4 w-4 mr-2" />
                Dispatch Shipment
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Transporter Quotation Form Modal / Box */}
      {showQuoteForm && (
        <Card className="border-[#173B2F]/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#173B2F]">Submit Quotation for Freight</CardTitle>
            <CardDescription>
              Provide itemized pricing and route parameters. Quotes are locked to the SHA-256 audit ledger.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleQuoteSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Base Freight (₹)</label>
                  <Input
                    type="number"
                    value={baseChargeRupees}
                    onChange={(e) => setBaseChargeRupees(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Handling Fee (₹)</label>
                  <Input
                    type="number"
                    value={handlingChargeRupees}
                    onChange={(e) => setHandlingChargeRupees(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Fuel Surcharge (₹)</label>
                  <Input
                    type="number"
                    value={fuelChargeRupees}
                    onChange={(e) => setFuelChargeRupees(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Total (₹)</label>
                  <Input
                    disabled
                    value={(
                      (parseFloat(baseChargeRupees) || 0) +
                      (parseFloat(handlingChargeRupees) || 0) +
                      (parseFloat(fuelChargeRupees) || 0)
                    ).toFixed(2)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Planned Distance (km)</label>
                  <Input
                    type="number"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Est. Transit Time (hours)</label>
                  <Input
                    type="number"
                    value={transitHours}
                    onChange={(e) => setTransitHours(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowQuoteForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingQuote} className="bg-[#173B2F] hover:bg-[#102820] text-white">
                  {submittingQuote && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit Quote
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Logistics & Route Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Origin / Pickup</span>
                <p className="font-medium text-foreground mt-1">{booking.pickup_address}</p>
                <p className="text-sm text-muted-foreground">{booking.pickup_city}, {booking.pickup_state}</p>
                <p className="text-xs text-[#173B2F] font-medium mt-1">
                  Requested Date: {new Date(booking.requested_pickup_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Destination / Delivery</span>
                <p className="font-medium text-foreground mt-1">{booking.destination_address}</p>
                <p className="text-sm text-muted-foreground">{booking.destination_city}, {booking.destination_state}</p>
                <p className="text-xs text-[#173B2F] font-medium mt-1">
                  Required By: {new Date(booking.required_delivery_date).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="border-t border-border/40 pt-4 grid grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Cargo Quantity</span>
                <p className="font-medium text-foreground mt-1">{booking.total_cargo_weight_kg.toLocaleString()} kg</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Package Units</span>
                <p className="font-medium text-foreground mt-1">{booking.package_count} units</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Vehicle Category</span>
                <p className="font-medium text-foreground mt-1">{booking.preferred_vehicle_category}</p>
              </div>
            </div>

            <div className="border-t border-border/40 pt-4">
              <span className="text-xs text-muted-foreground uppercase font-semibold block">Packaging & Handling Notes</span>
              <p className="text-sm text-foreground mt-1">{booking.packaging_details || "Standard industrial packaging"}</p>
              {booking.special_handling_instructions && (
                <p className="text-xs text-muted-foreground mt-1">
                  Note: {booking.special_handling_instructions}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cold-Chain Specs Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Climate Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/40 border border-border/50">
              <span className="text-xs text-muted-foreground uppercase font-semibold block">Refrigeration Mode</span>
              <p className="font-medium text-foreground mt-1">
                {booking.refrigeration_required ? "Active Reefer Controlled" : "Ambient Temperature"}
              </p>
            </div>

            {booking.refrigeration_required && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#173B2F]/5 border border-[#173B2F]/20 rounded-lg text-center">
                  <span className="text-xs text-muted-foreground uppercase block">Min Temp</span>
                  <p className="text-lg font-bold text-[#173B2F] mt-0.5">{booking.temperature_min ?? 0}°C</p>
                </div>
                <div className="p-3 bg-[#173B2F]/5 border border-[#173B2F]/20 rounded-lg text-center">
                  <span className="text-xs text-muted-foreground uppercase block">Max Temp</span>
                  <p className="text-lg font-bold text-[#173B2F] mt-0.5">{booking.temperature_max ?? 10}°C</p>
                </div>
              </div>
            )}

            <div className="p-3 bg-muted/30 border border-border/40 rounded-lg text-xs text-muted-foreground">
              All telemetry readings during transit are continuously validated against these safe boundaries and logged to the SHA-256 ledger.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Received Quotations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Transporter Quotations ({quotations.length})</CardTitle>
          <CardDescription>Bids received for this freight booking request</CardDescription>
        </CardHeader>
        <CardContent>
          {quotations.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No transporter quotations submitted yet. Registered transporters can review this booking in their dispatch portal.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote Ref</TableHead>
                    <TableHead>Vehicle Type</TableHead>
                    <TableHead>Transit Time</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Total Quote</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono text-xs font-semibold">{q.quotation_id}</TableCell>
                      <TableCell className="text-sm">{q.proposed_vehicle_category}</TableCell>
                      <TableCell className="text-sm">{q.estimated_transit_hours} hrs</TableCell>
                      <TableCell className="text-sm">{q.planned_distance_km} km</TableCell>
                      <TableCell className="font-semibold text-sm">
                        ₹{(q.total_quote_paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            q.status === "ACCEPTED"
                              ? "bg-[#173B2F] text-white"
                              : q.status === "REJECTED"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {q.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canAccept && q.status === "SUBMITTED" && booking.status !== "CONFIRMED" && (
                          <Button
                            size="sm"
                            disabled={acceptingQuoteId === q.id}
                            onClick={() => handleAcceptQuote(q.id)}
                            className="bg-[#173B2F] hover:bg-[#102820] text-white text-xs h-8"
                          >
                            {acceptingQuoteId === q.id && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                            Accept Quote
                          </Button>
                        )}
                        {q.status === "ACCEPTED" && (
                          <span className="text-xs font-semibold text-[#173B2F] flex items-center justify-end gap-1">
                            <CheckCircle2 className="h-4 w-4" /> Selected
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

