"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowLeft, Truck, User2, Phone, Mail, MapPin, FileCheck2, ShieldAlert, Loader2 } from "lucide-react";
import Link from "next/link";

interface Driver {
  id: string;
  driver_id: string;
  transporter_id: string;
  name: string;
  phone: string;
  email?: string;
  license_number: string;
  license_expiry: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  experience_years: number;
  status: string;
  current_assignment?: string;
  created_at: string;
}

interface Shipment {
  id: string;
  shipment_id: string;
  status: string;
  pickup_city: string;
  destination_city: string;
  created_at: string;
}

export default function DriverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const driverId = params.id as string;

  const [driver, setDriver] = useState<Driver | null>(null);
  const [recentShipments, setRecentShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDriver() {
      setLoading(true);
      setError(null);
      try {
        const { data: d } = await apiClient.get(`/drivers/${driverId}`);
        setDriver(d);

        try {
          const { data: sData } = await apiClient.get("/shipments", {
            params: { driver_id: d.id, page_size: 10 },
          });
          setRecentShipments(Array.isArray(sData) ? sData : sData?.items || []);
        } catch {
          setRecentShipments([]);
        }
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Driver profile not found.");
      } finally {
        setLoading(false);
      }
    }
    if (driverId) {
      loadDriver();
    }
  }, [driverId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#173B2F] mb-4" />
        <p className="text-sm text-muted-foreground">Loading driver profile...</p>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="space-y-6">
        <Link href="/drivers">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Drivers
          </Button>
        </Link>
        <Card className="border-destructive/30">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <ShieldAlert className="h-10 w-10 text-destructive mb-3" />
            <h3 className="font-semibold text-lg text-foreground">Driver Record Unavailable</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">{error || "Driver not found."}</p>
            <Button onClick={() => router.push("/drivers")} variant="outline">
              Return to Drivers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expiryDate = new Date(driver.license_expiry);
  const today = new Date();
  const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const licenseWarning = daysUntilExpiry < 90;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/drivers">
            <Button variant="ghost" size="icon" className="h-9 w-9 border border-input">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-serif">{driver.name}</h1>
              <Badge
                className={
                  driver.status === "AVAILABLE"
                    ? "bg-[#173B2F] text-white"
                    : driver.status === "ON_TRIP"
                    ? "bg-amber-100 text-amber-900 border-amber-200"
                    : "bg-muted text-muted-foreground"
                }
              >
                {driver.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {driver.driver_id} • Registered {new Date(driver.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {driver.current_assignment && (
          <Link href={`/shipments/${driver.current_assignment}`}>
            <Button variant="outline" className="gap-2">
              <Truck className="h-4 w-4" />
              View Active Shipment
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Contact & Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-start gap-2.5">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold block">Mobile</span>
                  <p className="font-medium text-foreground text-sm">{driver.phone}</p>
                </div>
              </div>
              {driver.email && (
                <div className="flex items-start gap-2.5">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground uppercase font-semibold block">Email</span>
                    <p className="font-medium text-foreground text-sm">{driver.email}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Residential Address</span>
                <p className="font-medium text-foreground text-sm">{driver.address}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {driver.city}, {driver.state} — {driver.pincode}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <User2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Fleet Experience</span>
                <p className="font-medium text-foreground text-sm">{driver.experience_years} year{driver.experience_years !== 1 ? "s" : ""} of commercial driving</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Licence Certification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2.5">
              <FileCheck2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Licence Number</span>
                <p className="font-mono font-semibold text-foreground">{driver.license_number}</p>
              </div>
            </div>

            <div
              className={`p-3 rounded-lg border ${
                licenseWarning
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-[#173B2F]/5 border-[#173B2F]/20 text-[#173B2F]"
              }`}
            >
              <span className="text-xs font-semibold uppercase block">Valid Until</span>
              <p className="font-semibold mt-0.5">{expiryDate.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
              <p className="text-xs mt-1">
                {licenseWarning
                  ? `⚠️ Expires in ${daysUntilExpiry} days — renewal required`
                  : `Valid for ${daysUntilExpiry} days`}
              </p>
            </div>

            <div className="p-3 bg-muted/30 border border-border/40 rounded-lg">
              <span className="text-xs text-muted-foreground">
                All licence data is immutably recorded on the AgriChain SHA-256 audit ledger at time of registration.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Recent Shipment History ({recentShipments.length})</CardTitle>
          <CardDescription>Past and ongoing transit assignments for this driver</CardDescription>
        </CardHeader>
        <CardContent>
          {recentShipments.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No shipment history found for this driver yet.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shipment Ref</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentShipments.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs font-semibold">{s.shipment_id}</TableCell>
                      <TableCell className="text-sm">{s.pickup_city} → {s.destination_city}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            s.status === "DELIVERED"
                              ? "bg-[#173B2F] text-white"
                              : s.status === "IN_TRANSIT"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/shipments/${s.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            View
                          </Button>
                        </Link>
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

