"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  Leaf,
  Calendar,
  MapPin,
  Package,
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface BatchDetail {
  id: string;
  batch_id: string;
  produce_type: string;
  farmer_id: string;
  farm_id: string;
  harvest_date: string;
  harvest_location: string;
  initial_quantity_kg: number;
  available_quantity_kg: number;
  reserved_quantity_kg: number;
  dispatched_quantity_kg: number;
  accepted_quantity_kg: number;
  rejected_quantity_kg: number;
  quality_grade: string;
  packaging_type: string;
  estimated_shelf_life_end: string;
  handling_requirements?: string;
  status: string;
  created_at: string;
}

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [ledgerEvents, setLedgerEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchBatch = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get(`/batches/${id}`);
        setBatch(data);

        try {
          const ledgerRes = await apiClient.get(`/ledger/entity/PRODUCE_BATCH/${data.id || id}`);
          setLedgerEvents(ledgerRes.data?.blocks || ledgerRes.data || []);
        } catch {}
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Unable to load batch details.");
      } finally {
        setLoading(false);
      }
    };
    fetchBatch();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="p-8 text-center border rounded-lg bg-card max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
          <h2 className="text-base font-semibold">Batch Not Found</h2>
          <p className="text-xs text-muted-foreground mt-1 mb-4">{error}</p>
          <Button asChild variant="outline">
            <Link href="/batches">Return to Batches</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/batches">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Batches
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-serif font-bold text-foreground">{batch.batch_id}</h1>
              <Badge variant="outline" className="text-xs">{batch.status}</Badge>
              <Badge variant="secondary" className="text-xs">{batch.quality_grade.replace(/_/g, " ")}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Harvested commodity • Origin {batch.harvest_location}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Initial Harvest</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-serif font-bold text-foreground">{batch.initial_quantity_kg.toLocaleString()} kg</p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-serif font-bold text-emerald-700 dark:text-emerald-400">{batch.available_quantity_kg.toLocaleString()} kg</p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reserved Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-serif font-bold text-amber-700 dark:text-amber-400">{batch.reserved_quantity_kg.toLocaleString()} kg</p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dispatched</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-serif font-bold text-foreground">{batch.dispatched_quantity_kg.toLocaleString()} kg</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Commodity Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b border-border/40">
              <span className="text-sm text-muted-foreground">Produce Type</span>
              <span className="text-sm font-medium text-foreground">{batch.produce_type}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/40">
              <span className="text-sm text-muted-foreground">Harvest Date</span>
              <span className="text-sm font-medium text-foreground">{new Date(batch.harvest_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/40">
              <span className="text-sm text-muted-foreground">Packaging Container</span>
              <span className="text-sm font-medium text-foreground">{batch.packaging_type}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-muted-foreground">Estimated Shelf Life End</span>
              <span className="text-sm font-medium text-foreground">{new Date(batch.estimated_shelf_life_end).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Handling & Custody</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Harvest Location</p>
              <p className="text-sm font-medium text-foreground">{batch.harvest_location}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Handling Instructions</p>
              <p className="text-sm text-foreground bg-secondary/30 p-2.5 rounded-lg mt-1">
                {batch.handling_requirements || "Standard cold-chain storage parameters apply."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ledger History */}
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-accent" />
            Audit Ledger History
          </CardTitle>
          <CardDescription>Verified blockchain-inspired hash blocks recording this batch</CardDescription>
        </CardHeader>
        <CardContent>
          {ledgerEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No events found.</p>
          ) : (
            <div className="space-y-2">
              {ledgerEvents.map((evt) => (
                <div key={evt.block_id || evt.index} className="p-3 rounded-lg border border-border/40 bg-secondary/20 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-mono font-bold text-accent">Block #{evt.index}</span>
                    <span className="mx-2">•</span>
                    <span>{evt.event_summary || evt.event_type}</span>
                  </div>
                  <span className="text-muted-foreground">{new Date(evt.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

