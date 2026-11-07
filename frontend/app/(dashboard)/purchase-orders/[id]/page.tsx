"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  ShoppingCart,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Truck,
  ArrowLeft,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

interface PurchaseOrderDetail {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  produce_type: string;
  batch_id?: string;
  requested_quantity_kg: number;
  accepted_quantity_kg: number;
  fulfilled_quantity_kg: number;
  unit_price_paise: number;
  total_amount_paise: number;
  preferred_delivery_date: string;
  pickup_address: string;
  delivery_address: string;
  handling_requirements?: string;
  status: string;
  created_at: string;
}

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user } = useAuth();

  const [order, setOrder] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(`/purchase-orders/${id}`);
      setOrder(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Unable to load purchase order details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchOrder();
  }, [id]);

  const handleAccept = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/purchase-orders/${order.id}/accept`, {
        accepted_quantity_kg: order.requested_quantity_kg,
      });
      toast.success("Purchase order accepted! Inventory reserved.");
      await fetchOrder();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to accept order.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/purchase-orders/${order.id}/reject`, {
        reason: "Seller capacity constraint",
      });
      toast.success("Purchase order rejected.");
      await fetchOrder();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to reject order.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="p-8 text-center border rounded-lg bg-card max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
          <h2 className="text-base font-semibold">Purchase Order Not Found</h2>
          <p className="text-xs text-muted-foreground mt-1 mb-4">{error}</p>
          <Button asChild variant="outline">
            <Link href="/purchase-orders">Return to Orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isSeller = user?.role === "FARMER" || user?.id === order.seller_id;
  const canAccept = isSeller && order.status === "PLACED";

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/purchase-orders">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Orders
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-serif font-bold text-foreground">{order.order_id}</h1>
              <Badge variant="outline" className="text-xs uppercase">{order.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Placed on {new Date(order.created_at).toLocaleDateString()} • {order.produce_type}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canAccept && (
              <>
                <Button
                  onClick={handleAccept}
                  disabled={actionLoading}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Accept Order
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={actionLoading}
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="w-4 h-4 mr-1.5" /> Reject
                </Button>
              </>
            )}
            {order.status === "ACCEPTED" && (
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/freight-bookings/new">
                  <Truck className="w-4 h-4 mr-1.5" /> Book Freight
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ordered Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-serif font-bold text-foreground">
              {order.requested_quantity_kg.toLocaleString()} kg
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Accepted: {order.accepted_quantity_kg.toLocaleString()} kg
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unit Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-serif font-bold text-foreground">
              ₹{(order.unit_price_paise / 100).toFixed(2)} / kg
            </p>
            <p className="text-xs text-muted-foreground mt-1">Contracted rate</p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Valuation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-serif font-bold text-accent">
              ₹{(order.total_amount_paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Full consignment amount</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Delivery Routing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Consignment Pickup</p>
              <p className="text-sm font-medium text-foreground">{order.pickup_address}</p>
            </div>
            <div className="border-t border-border/40 pt-2">
              <p className="text-xs text-muted-foreground">Delivery Destination</p>
              <p className="text-sm font-medium text-foreground">{order.delivery_address}</p>
            </div>
            <div className="border-t border-border/40 pt-2">
              <p className="text-xs text-muted-foreground">Requested Delivery Date</p>
              <p className="text-sm font-medium text-foreground">{new Date(order.preferred_delivery_date).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> Contractual Parties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Purchasing Buyer ID</p>
              <p className="text-xs font-mono text-foreground mt-0.5">{order.buyer_id}</p>
            </div>
            <div className="border-t border-border/40 pt-2">
              <p className="text-xs text-muted-foreground">Supplying Farmer ID</p>
              <p className="text-xs font-mono text-foreground mt-0.5">{order.seller_id}</p>
            </div>
            {order.batch_id && (
              <div className="border-t border-border/40 pt-2">
                <p className="text-xs text-muted-foreground">Associated Batch</p>
                <Link href={`/batches/${order.batch_id}`} className="text-xs font-mono text-primary hover:underline">
                  {order.batch_id}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

