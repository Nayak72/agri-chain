"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { Truck, AlertCircle, Loader2, ArrowRight, Building2, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";

interface Transporter {
  id: string;
  transporter_id: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  approval_status: string;
  is_active: boolean;
  vehicle_count?: number;
  driver_count?: number;
  created_at: string;
}

export default function TransportersPage() {
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchTransporters() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get("/transporters");
        setTransporters(Array.isArray(data) ? data : data?.items || []);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load transporters");
        setTransporters([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTransporters();
  }, []);

  const filtered = transporters.filter(
    (t) =>
      t.company_name.toLowerCase().includes(search.toLowerCase()) ||
      t.transporter_id?.toLowerCase().includes(search.toLowerCase()) ||
      t.city?.toLowerCase().includes(search.toLowerCase())
  );

  const approved = transporters.filter((t) => t.approval_status === "APPROVED").length;
  const pending = transporters.filter((t) => t.approval_status !== "APPROVED").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transporters"
        description="View and manage registered cold-chain freight companies and their fleet portfolios"
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Total Transporters", value: transporters.length, icon: Building2 },
          { label: "Approved", value: approved, icon: CheckCircle2, accent: true },
          { label: "Pending Approval", value: pending, icon: Clock },
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
              placeholder="Search by company, ID, or city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm"
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{filtered.length} records</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#173B2F] mb-3" />
            <p className="text-sm text-muted-foreground">Loading transporter network…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No transporters found</h3>
            <p className="text-sm text-muted-foreground">
              {search ? "No transporters match your search." : "No transporter companies are registered yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Transporter ID</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Profile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id} className="group">
                    <TableCell className="font-mono text-xs font-semibold">{t.transporter_id}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm text-foreground">{t.company_name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-foreground">{t.contact_person}</div>
                      <div className="text-xs text-muted-foreground">{t.phone}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.city}, {t.state}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          t.approval_status === "APPROVED"
                            ? "bg-[#173B2F] text-white"
                            : "bg-amber-100 text-amber-900 border-amber-200"
                        }
                      >
                        {t.approval_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={t.is_active ? "bg-[#173B2F]/10 text-[#173B2F] border-[#173B2F]/20" : "bg-muted text-muted-foreground"}>
                        {t.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/transporters/${t.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                          View <ArrowRight className="h-3 w-3 ml-1" />
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
