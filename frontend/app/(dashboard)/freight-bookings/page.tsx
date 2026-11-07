"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { Plus, Truck, AlertCircle, Loader2, ArrowRight, Thermometer, Package } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";

interface FreightBooking {
  id: string;
  booking_id: string;
  pickup_city: string;
  pickup_state: string;
  destination_city: string;
  destination_state: string;
  total_cargo_weight_kg: number;
  requested_pickup_date: string;
  refrigeration_required: boolean;
  preferred_vehicle_category: string;
  status: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-[#173B2F] text-white",
  REQUESTED: "bg-sky-100 text-sky-900 border-sky-200",
  QUOTATION_PENDING: "bg-amber-100 text-amber-900 border-amber-200",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function FreightBookingsPage() {
  const [bookings, setBookings] = useState<FreightBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get("/freight-bookings");
        setBookings(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load freight bookings");
        setBookings([]);
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, []);

  const filtered = bookings.filter(
    (b) =>
      b.booking_id.toLowerCase().includes(search.toLowerCase()) ||
      b.pickup_city.toLowerCase().includes(search.toLowerCase()) ||
      b.destination_city.toLowerCase().includes(search.toLowerCase())
  );

  // Summary stats
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED").length;
  const pending = bookings.filter((b) => b.status === "REQUESTED" || b.status === "QUOTATION_PENDING").length;
  const totalKg = bookings.reduce((s, b) => s + (b.total_cargo_weight_kg || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Freight Bookings"
        description="Manage cold-chain logistics requests, transporter bids, and confirmed freight engagements"
        actions={
          <Link href="/freight-bookings/new">
            <Button className="bg-[#173B2F] hover:bg-[#102820] text-white gap-2">
              <Plus className="h-4 w-4" />
              New Booking Request
            </Button>
          </Link>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Bookings", value: bookings.length, icon: Package },
          { label: "Confirmed", value: confirmed, icon: Truck, accent: true },
          { label: "Awaiting Quotes", value: pending, icon: Truck },
          { label: "Total Cargo (kg)", value: totalKg.toLocaleString(), icon: Package },
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
              placeholder="Search by booking ID or city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-3 text-sm"
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{filtered.length} records</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#173B2F] mb-3" />
            <p className="text-sm text-muted-foreground">Loading freight bookings…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Truck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No bookings found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search ? "No bookings match your search criteria." : "Create your first freight booking to get started."}
            </p>
            {!search && (
              <Link href="/freight-bookings/new">
                <Button className="bg-[#173B2F] hover:bg-[#102820] text-white">New Booking Request</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Booking Ref</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Cargo (kg)</TableHead>
                  <TableHead>Pickup Date</TableHead>
                  <TableHead>Vehicle Type</TableHead>
                  <TableHead>Cold-Chain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => (
                  <TableRow key={b.id} className="group">
                    <TableCell className="font-mono text-xs font-semibold text-foreground">{b.booking_id}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-foreground">{b.pickup_city}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ArrowRight className="h-3 w-3" /> {b.destination_city}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-semibold">{b.total_cargo_weight_kg?.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(b.requested_pickup_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {b.preferred_vehicle_category?.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell>
                      {b.refrigeration_required ? (
                        <span className="flex items-center gap-1 text-xs text-[#173B2F] font-medium">
                          <Thermometer className="h-3 w-3" /> Reefer
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Ambient</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_STYLES[b.status] || "bg-muted text-muted-foreground"}>
                        {b.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/freight-bookings/${b.id}`}>
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
