"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowLeft, Leaf, Loader2, ShieldAlert, Thermometer, Package2, Layers, Edit2, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

interface Produce {
  id: string;
  produce_type: string;
  name: string;
  category: string;
  unit: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Known cold-chain handling profiles — mirrors backend PRODUCE_HANDLING_PROFILES
const HANDLING_PROFILES: Record<string, { tempMin: number; tempMax: number; humidityMin: number; humidityMax: number; shelfLifeDays: number }> = {
  TOMATO: { tempMin: 10, tempMax: 15, humidityMin: 85, humidityMax: 95, shelfLifeDays: 14 },
  POTATO: { tempMin: 2, tempMax: 8, humidityMin: 90, humidityMax: 95, shelfLifeDays: 90 },
  ONION: { tempMin: 0, tempMax: 4, humidityMin: 65, humidityMax: 75, shelfLifeDays: 180 },
  APPLE: { tempMin: 0, tempMax: 4, humidityMin: 90, humidityMax: 95, shelfLifeDays: 120 },
  BANANA: { tempMin: 13, tempMax: 18, humidityMin: 90, humidityMax: 95, shelfLifeDays: 21 },
  MANGO: { tempMin: 10, tempMax: 15, humidityMin: 85, humidityMax: 90, shelfLifeDays: 21 },
  GRAPES: { tempMin: 0, tempMax: 2, humidityMin: 90, humidityMax: 95, shelfLifeDays: 56 },
  ORANGE: { tempMin: 5, tempMax: 10, humidityMin: 85, humidityMax: 90, shelfLifeDays: 56 },
};

export default function ProduceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const produceId = params.id as string;

  const [produce, setProduce] = useState<Produce | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    async function loadProduce() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get(`/produce/${produceId}`);
        setProduce(data);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Produce record not found.");
      } finally {
        setLoading(false);
      }
    }
    if (produceId) {
      loadProduce();
    }
  }, [produceId]);

  const handleToggleActive = async () => {
    if (!produce) return;
    setToggling(true);
    try {
      await apiClient.patch(`/produce/${produce.id}`, { is_active: !produce.is_active });
      setProduce((prev) => prev ? { ...prev, is_active: !prev.is_active } : prev);
      toast.success(`Produce ${produce.is_active ? "deactivated" : "activated"} successfully`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to update produce status");
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#173B2F] mb-4" />
        <p className="text-sm text-muted-foreground">Loading produce catalogue entry...</p>
      </div>
    );
  }

  if (error || !produce) {
    return (
      <div className="space-y-6">
        <Link href="/produce">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Catalogue
          </Button>
        </Link>
        <Card className="border-destructive/30">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <ShieldAlert className="h-10 w-10 text-destructive mb-3" />
            <h3 className="font-semibold text-lg text-foreground">Catalogue Entry Unavailable</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">{error}</p>
            <Button onClick={() => router.push("/produce")} variant="outline">
              Return to Catalogue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profile = HANDLING_PROFILES[produce.produce_type];
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/produce">
            <Button variant="ghost" size="icon" className="h-9 w-9 border border-input">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#173B2F]/10 rounded-lg">
                <Leaf className="h-5 w-5 text-[#173B2F]" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-serif">{produce.name}</h1>
              <Badge className={produce.is_active ? "bg-[#173B2F] text-white" : "bg-muted text-muted-foreground"}>
                {produce.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground ml-11">
              {produce.produce_type} • {produce.category} • Last updated {new Date(produce.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {isAdmin && (
          <Button
            variant="outline"
            onClick={handleToggleActive}
            disabled={toggling}
            className={produce.is_active ? "text-destructive border-destructive/30 hover:bg-destructive/5" : "text-[#173B2F] border-[#173B2F]/30"}
          >
            {toggling ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : produce.is_active ? (
              <XCircle className="h-4 w-4 mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            {produce.is_active ? "Deactivate" : "Activate"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Catalogue Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Produce Type Code</span>
                <p className="font-mono font-semibold text-foreground mt-1">{produce.produce_type}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Category</span>
                <p className="font-medium text-foreground mt-1">{produce.category}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Display Name</span>
                <p className="font-medium text-foreground mt-1">{produce.name}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Unit of Measure</span>
                <p className="font-medium text-foreground mt-1">{produce.unit}</p>
              </div>
            </div>

            {produce.description && (
              <div className="border-t border-border/40 pt-4">
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Description</span>
                <p className="text-sm text-foreground mt-1 p-3 bg-muted/30 border border-border/40 rounded-lg">
                  {produce.description}
                </p>
              </div>
            )}

            <div className="border-t border-border/40 pt-4">
              <span className="text-xs text-muted-foreground uppercase font-semibold block">Registered On</span>
              <p className="text-sm text-foreground mt-1">
                {new Date(produce.created_at).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-[#173B2F]" />
              <CardTitle className="text-base font-semibold">Cold-Chain Handling Profile</CardTitle>
            </div>
            <CardDescription>Recommended storage and transit conditions for this commodity</CardDescription>
          </CardHeader>
          <CardContent>
            {profile ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#173B2F]/5 border border-[#173B2F]/20 rounded-lg text-center">
                    <span className="text-xs text-muted-foreground uppercase font-semibold block">Min Temp</span>
                    <p className="text-xl font-bold text-[#173B2F] mt-0.5">{profile.tempMin}°C</p>
                  </div>
                  <div className="p-3 bg-[#173B2F]/5 border border-[#173B2F]/20 rounded-lg text-center">
                    <span className="text-xs text-muted-foreground uppercase font-semibold block">Max Temp</span>
                    <p className="text-xl font-bold text-[#173B2F] mt-0.5">{profile.tempMax}°C</p>
                  </div>
                  <div className="p-3 bg-muted/30 border border-border/40 rounded-lg text-center">
                    <span className="text-xs text-muted-foreground uppercase font-semibold block">Min Humidity</span>
                    <p className="text-xl font-bold text-foreground mt-0.5">{profile.humidityMin}%</p>
                  </div>
                  <div className="p-3 bg-muted/30 border border-border/40 rounded-lg text-center">
                    <span className="text-xs text-muted-foreground uppercase font-semibold block">Max Humidity</span>
                    <p className="text-xl font-bold text-foreground mt-0.5">{profile.humidityMax}%</p>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                  <span className="text-xs text-amber-700 uppercase font-semibold block">Typical Shelf Life</span>
                  <p className="text-lg font-bold text-amber-800 mt-0.5">{profile.shelfLifeDays} days</p>
                  <p className="text-xs text-amber-600 mt-0.5">Under optimal storage conditions</p>
                </div>

                <p className="text-xs text-muted-foreground">
                  These parameters drive the in-transit sensor simulation engine and are enforced as alert thresholds during cold-chain monitoring sessions.
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Package2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No predefined cold-chain profile for this produce type. Generic ambient parameters apply.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

