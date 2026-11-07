"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowLeft, ShoppingCart, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PRODUCE_TYPES } from "@/lib/constants";

interface Batch {
  id: string;
  batch_id: string;
  farmer_id: string;
  produce_type: string;
  available_quantity_kg: number;
  harvest_location: string;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);

  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [produceType, setProduceType] = useState("TOMATO");
  const [sellerId, setSellerId] = useState("");
  const [quantityKg, setQuantityKg] = useState("");
  const [unitPriceRupees, setUnitPriceRupees] = useState("35.00");
  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0]
  );
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [handlingReqs, setHandlingReqs] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBatches() {
      setLoadingBatches(true);
      try {
        const { data } = await apiClient.get("/batches?page_size=50");
        const items = Array.isArray(data) ? data : data.items || [];
        setBatches(items);
        if (items.length > 0) {
          const first = items[0];
          setSelectedBatchId(first.id);
          setSellerId(first.farmer_id);
          setProduceType(first.produce_type);
          setPickupAddress(first.harvest_location || "Central Sorting Terminal, Nashik");
        }
      } catch (e) {
        setError("Unable to load produce batches.");
      } finally {
        setLoadingBatches(false);
      }
    }
    loadBatches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerId || !quantityKg || parseFloat(quantityKg) <= 0 || !deliveryAddress) {
      toast.error("Please complete all mandatory order details.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const unitPricePaise = Math.round(parseFloat(unitPriceRupees) * 100);
      const payload = {
        seller_id: sellerId,
        produce_type: produceType,
        batch_id: selectedBatchId || undefined,
        requested_quantity_kg: parseFloat(quantityKg),
        unit_price_paise: unitPricePaise,
        preferred_delivery_date: deliveryDate,
        pickup_address: pickupAddress || "Nashik Agro Hub",
        delivery_address: deliveryAddress,
        handling_requirements: handlingReqs || undefined,
      };

      const { data } = await apiClient.post("/purchase-orders", payload);
      toast.success("Purchase order placed successfully!");
      router.push(`/purchase-orders/${data.id || data.order_id}`);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Failed to create purchase order.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const totalRupees = (parseFloat(quantityKg || "0") * parseFloat(unitPriceRupees || "0")).toFixed(2);
  const allProduce = [...PRODUCE_TYPES.VEGETABLES, ...PRODUCE_TYPES.FRUITS];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/purchase-orders">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Purchase Orders
          </Link>
        </Button>
        <PageHeader
          title="Place Commercial Purchase Order"
          description="Initiate an agricultural commodity order with escrow reservation and custody tracking."
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
          <CardTitle className="text-base font-semibold">Order Specifications</CardTitle>
          <CardDescription>Select verified batch or commodity type, pricing, and destination</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Source Produce Batch (Optional)
              </label>
              <Select
                value={selectedBatchId}
                onValueChange={(val) => {
                  setSelectedBatchId(val);
                  const b = batches.find((item) => item.id === val);
                  if (b) {
                    setSellerId(b.farmer_id);
                    setProduceType(b.produce_type);
                    setPickupAddress(b.harvest_location);
                  }
                }}
                disabled={loadingBatches}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={loadingBatches ? "Loading batches..." : "Select specific harvest batch"} />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.batch_id} — {b.produce_type} ({b.available_quantity_kg.toLocaleString()} kg available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Produce Category</label>
                <Select value={produceType} onValueChange={setProduceType}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allProduce.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Seller / Farmer ID *</label>
                <Input
                  placeholder="Seller MongoDB ID"
                  value={sellerId}
                  onChange={(e) => setSellerId(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Quantity (kg) *</label>
                <Input
                  type="number"
                  placeholder="e.g. 2500"
                  value={quantityKg}
                  onChange={(e) => setQuantityKg(e.target.value)}
                  min="1"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unit Price (₹/kg) *</label>
                <Input
                  type="number"
                  step="0.5"
                  value={unitPriceRupees}
                  onChange={(e) => setUnitPriceRupees(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preferred Delivery</label>
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pickup Location Address *</label>
                <Input
                  placeholder="Origin farm or consolidation center"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Delivery Destination Address *</label>
                <Input
                  placeholder="e.g. Distribution Center 4, APMC Market, Bengaluru"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-secondary/30 flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Calculated Order Valuation:</span>
              <span className="font-serif font-bold text-lg text-foreground">₹{parseFloat(totalRupees).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-border/50">
              <Button type="button" variant="outline" asChild>
                <Link href="/purchase-orders">Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={submitting || !sellerId || !quantityKg || !deliveryAddress}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting Order...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Place Purchase Order
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

