"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowLeft, Leaf, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PRODUCE_TYPES, QUALITY_GRADES } from "@/lib/constants";

interface Farm {
  id: string;
  name: string;
  city: string;
  state: string;
}

export default function NewBatchPage() {
  const router = useRouter();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(true);

  const [produceType, setProduceType] = useState("TOMATO");
  const [farmId, setFarmId] = useState("");
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split("T")[0]);
  const [harvestLocation, setHarvestLocation] = useState("");
  const [quantityKg, setQuantityKg] = useState("");
  const [qualityGrade, setQualityGrade] = useState("GRADE_A");
  const [packagingType, setPackagingType] = useState("CRATE");
  const [shelfLifeDays, setShelfLifeDays] = useState("14");
  const [handlingReqs, setHandlingReqs] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFarms() {
      setLoadingFarms(true);
      try {
        const { data } = await apiClient.get("/farms?page_size=50");
        const items = Array.isArray(data) ? data : data.items || [];
        setFarms(items);
        if (items.length > 0) {
          setFarmId(items[0].id);
          setHarvestLocation(`${items[0].city}, ${items[0].state}`);
        }
      } catch (e) {
        setError("Unable to load farms. Please create a farm profile first.");
      } finally {
        setLoadingFarms(false);
      }
    }
    loadFarms();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId || !quantityKg || parseFloat(quantityKg) <= 0) {
      toast.error("Please enter a valid harvest quantity.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        produce_type: produceType,
        farm_id: farmId,
        harvest_date: harvestDate,
        harvest_location: harvestLocation || "Nashik, Maharashtra",
        initial_quantity_kg: parseFloat(quantityKg),
        quality_grade: qualityGrade,
        packaging_type: packagingType,
        estimated_shelf_life_days: parseInt(shelfLifeDays, 10) || 14,
        handling_requirements: handlingReqs || undefined,
      };

      const { data } = await apiClient.post("/batches", payload);
      toast.success("Harvest batch recorded and added to audit ledger!");
      router.push(`/batches/${data.id || data.batch_id}`);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Failed to record harvest batch.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const allProduce = [...PRODUCE_TYPES.VEGETABLES, ...PRODUCE_TYPES.FRUITS];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/batches">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Batches
          </Link>
        </Button>
        <PageHeader
          title="Register Harvest Batch"
          description="Record newly harvested agricultural commodity into the immutable custody chain."
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
          <CardTitle className="text-base font-semibold">Batch Attributes</CardTitle>
          <CardDescription>Enter harvest weight, commodity grade, and storage instructions</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Commodity Produce *
                </label>
                <Select value={produceType} onValueChange={setProduceType}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allProduce.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Source Farm *
                </label>
                <Select
                  value={farmId}
                  onValueChange={(val) => {
                    setFarmId(val);
                    const selected = farms.find((f) => f.id === val);
                    if (selected) {
                      setHarvestLocation(`${selected.city}, ${selected.state}`);
                    }
                  }}
                  disabled={loadingFarms}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={loadingFarms ? "Loading farms..." : "Select farm"} />
                  </SelectTrigger>
                  <SelectContent>
                    {farms.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} ({f.city}, {f.state})
                      </SelectItem>
                    ))}
                    {farms.length === 0 && (
                      <SelectItem value="none" disabled>No registered farms</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Harvest Date *
                </label>
                <Input
                  type="date"
                  value={harvestDate}
                  onChange={(e) => setHarvestDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Harvest Quantity (kg) *
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={quantityKg}
                  onChange={(e) => setQuantityKg(e.target.value)}
                  step="0.1"
                  min="1"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Quality Grade
                </label>
                <Select value={qualityGrade} onValueChange={setQualityGrade}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GRADE_A">Grade A (Premium)</SelectItem>
                    <SelectItem value="GRADE_B">Grade B (Standard)</SelectItem>
                    <SelectItem value="GRADE_C">Grade C (Processing)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Packaging Container
                </label>
                <Select value={packagingType} onValueChange={setPackagingType}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRATE">Ventilated Crates</SelectItem>
                    <SelectItem value="BOX">Corrugated Boxes</SelectItem>
                    <SelectItem value="BAG">Mesh Bags</SelectItem>
                    <SelectItem value="PALLET">Standard Palletized</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Estimated Shelf Life (Days)
                </label>
                <Input
                  type="number"
                  value={shelfLifeDays}
                  onChange={(e) => setShelfLifeDays(e.target.value)}
                  min="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Special Handling Instructions
              </label>
              <Input
                placeholder="e.g. Keep chilled between 7-10°C, avoid direct sunlight"
                value={handlingReqs}
                onChange={(e) => setHandlingReqs(e.target.value)}
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-border/50">
              <Button type="button" variant="outline" asChild>
                <Link href="/batches">Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={submitting || !farmId || !quantityKg}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Recording Ledger Block...
                  </>
                ) : (
                  <>
                    <Leaf className="w-4 h-4 mr-2" />
                    Commit Batch to Ledger
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

