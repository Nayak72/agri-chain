"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { Plus, ShoppingCart, AlertCircle, Loader2, ArrowRight, Package, IndianRupee, Clock } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";

interface PurchaseOrder {
  id: string;
  order_id: string;
  produce_type: string;
  requested_quantity_kg: number;
  total_amount_paise: number;
  delivery_city: string;
  delivery_state: string;
  required_delivery_date: string;
  status: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  ACCEPTED: "bg-[#173B2F] text-white",
  PLACED: "bg-sky-100 text-sky-900 border-sky-200",
  FULFILLED: "bg-[#173B2F]/10 text-[#173B2F] border-[#173B2F]/20",
  REJECTED: "bg-destructive/10 text-destructive border-destructive/20",
  CANCELLED: "bg-muted text-muted-foreground",
  DRAFT: "bg-amber-100 text-amber-900 border-amber-200",
  PARTIALLY_FULFILLED: "bg-indigo-100 text-indigo-900 border-indigo-200",
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get("/purchase-orders");
        setOrders(Array.isArray(data) ? data : data?.items || []);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load purchase orders");
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  const filtered = orders.filter(
    (o) =>
      o.order_id?.toLowerCase().includes(search.toLowerCase()) ||
      o.produce_type?.toLowerCase().includes(search.toLowerCase()) ||
      o.delivery_city?.toLowerCase().includes(search.toLowerCase())
  );

  const accepted = orders.filter((o) => o.status === "ACCEPTED").length;
  const placed = orders.filter((o) => o.status === "PLACED").length;
  const totalValue = orders.reduce((s, o) => s + (o.total_amount_paise || 0), 0);
  const totalKg = orders.reduce((s, o) => s + (o.requested_quantity_kg || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Manage commercial procurement orders for agricultural produce"
        actions={
          <Link href="/purchase-orders/new">
            <Button className="bg-[#173B2F] hover:bg-[#102820] text-white gap-2">
              <Plus className="h-4 w-4" />
              New Purchase Order
            </Button>
          </Link>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: orders.length, icon: ShoppingCart },
          { label: "Accepted", value: accepted, icon: ShoppingCart, accent: true },
          { label: "Awaiting Response", value: placed, icon: Clock },
          { label: "Total Value", value: `₹${(totalValue / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: IndianRupee },
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
              placeholder="Search by order ID, produce, or city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm"
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{filtered.length} orders</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#173B2F] mb-3" />
            <p className="text-sm text-muted-foreground">Loading purchase orders…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No orders found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search ? "No orders match your search." : "Create your first purchase order to begin."}
            </p>
            {!search && (
              <Link href="/purchase-orders/new">
                <Button className="bg-[#173B2F] hover:bg-[#102820] text-white">New Purchase Order</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Order Ref</TableHead>
                  <TableHead>Produce</TableHead>
                  <TableHead>Quantity (kg)</TableHead>
                  <TableHead>Order Value</TableHead>
                  <TableHead>Delivery To</TableHead>
                  <TableHead>Required By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.id} className="group">
                    <TableCell className="font-mono text-xs font-semibold text-foreground">{o.order_id}</TableCell>
                    <TableCell className="text-sm font-medium text-foreground">
                      {o.produce_type?.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="text-sm font-semibold">{o.requested_quantity_kg?.toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-semibold">
                      ₹{((o.total_amount_paise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {o.delivery_city}, {o.delivery_state}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {o.required_delivery_date ? new Date(o.required_delivery_date).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_STYLES[o.status] || "bg-muted text-muted-foreground"}>
                        {o.status?.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/purchase-orders/${o.id}`}>
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
