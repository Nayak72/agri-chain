"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { Plus, User2, AlertCircle, Loader2, ArrowRight, FileCheck2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";

interface Driver {
  id: string;
  driver_id: string;
  transporter_id: string;
  name: string;
  phone: string;
  license_number: string;
  license_expiry: string;
  city: string;
  state: string;
  experience_years: number;
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-[#173B2F] text-white",
  ON_TRIP: "bg-sky-100 text-sky-900 border-sky-200",
  ON_LEAVE: "bg-amber-100 text-amber-900 border-amber-200",
  INACTIVE: "bg-muted text-muted-foreground",
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchDrivers() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get("/drivers");
        setDrivers(Array.isArray(data) ? data : data?.items || []);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load drivers");
        setDrivers([]);
      } finally {
        setLoading(false);
      }
    }
    fetchDrivers();
  }, []);

  const filtered = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.driver_id?.toLowerCase().includes(search.toLowerCase()) ||
      d.license_number?.toLowerCase().includes(search.toLowerCase())
  );

  const today = new Date();
  const ninetyDays = new Date();
  ninetyDays.setDate(ninetyDays.getDate() + 90);

  const available = drivers.filter((d) => d.status === "AVAILABLE").length;
  const onTrip = drivers.filter((d) => d.status === "ON_TRIP").length;
  const expiringLicenses = drivers.filter((d) => {
    const exp = new Date(d.license_expiry);
    return exp >= today && exp <= ninetyDays;
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drivers"
        description="Manage commercial driver profiles, licence validity, and trip assignments"
        actions={
          <Link href="/drivers/new">
            <Button className="bg-[#173B2F] hover:bg-[#102820] text-white gap-2">
              <Plus className="h-4 w-4" />
              Register Driver
            </Button>
          </Link>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Drivers", value: drivers.length, icon: User2 },
          { label: "Available", value: available, icon: User2, accent: true },
          { label: "On Trip", value: onTrip, icon: User2 },
          { label: "Licence Expiring", value: expiringLicenses, icon: AlertTriangle, warn: expiringLicenses > 0 },
        ].map((s, i) => (
          <Card key={i} className={s.accent ? "border-[#173B2F]/30" : s.warn ? "border-amber-300" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase text-muted-foreground">{s.label}</span>
                <s.icon className={`h-4 w-4 ${s.accent ? "text-[#173B2F]" : s.warn ? "text-amber-600" : "text-muted-foreground"}`} />
              </div>
              <p className={`text-2xl font-bold ${s.accent ? "text-[#173B2F]" : s.warn ? "text-amber-700" : "text-foreground"}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {expiringLicenses > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-semibold">{expiringLicenses} driver licence{expiringLicenses > 1 ? "s" : ""} expiring within 90 days</p>
            <p className="text-amber-700 text-xs mt-0.5">Review and renew driver licences to maintain fleet compliance.</p>
          </div>
        </div>
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
              placeholder="Search name, driver ID, licence…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm"
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{filtered.length} drivers</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#173B2F] mb-3" />
            <p className="text-sm text-muted-foreground">Loading driver roster…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <User2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No drivers found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search ? "No drivers match your search." : "Register your first driver to begin fleet operations."}
            </p>
            {!search && (
              <Link href="/drivers/new">
                <Button className="bg-[#173B2F] hover:bg-[#102820] text-white">Register Driver</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Driver ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Licence No.</TableHead>
                  <TableHead>Licence Expiry</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Profile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => {
                  const expiry = new Date(d.license_expiry);
                  const expiring = expiry <= ninetyDays && expiry >= today;
                  const expired = expiry < today;
                  return (
                    <TableRow key={d.id} className="group">
                      <TableCell className="font-mono text-xs font-semibold">{d.driver_id}</TableCell>
                      <TableCell className="font-medium text-sm text-foreground">{d.name}</TableCell>
                      <TableCell className="font-mono text-xs">{d.license_number}</TableCell>
                      <TableCell className={`text-xs font-medium ${expired ? "text-destructive" : expiring ? "text-amber-600" : "text-muted-foreground"}`}>
                        <div className="flex items-center gap-1">
                          {(expired || expiring) && <AlertTriangle className="h-3 w-3" />}
                          {expiry.toLocaleDateString("en-IN", { dateStyle: "medium" })}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.city}, {d.state}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.experience_years} yr{d.experience_years !== 1 ? "s" : ""}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_STYLES[d.status] || "bg-muted text-muted-foreground"}>
                          {d.status?.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/drivers/${d.id}`}>
                          <Button size="sm" variant="ghost" className="h-7 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                            Profile <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
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
