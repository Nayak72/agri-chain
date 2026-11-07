"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { TreePine, MapPin, Award, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

interface FarmDetail {
  id: string;
  name: string;
  farmer_id: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  area_hectares?: number;
  certifications?: string[];
  description?: string;
  is_active: boolean;
  created_at: string;
}

export default function FarmDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [farm, setFarm] = useState<FarmDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchFarm = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get(`/farms/${id}`);
        setFarm(data);
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Unable to load farm details.");
      } finally {
        setLoading(false);
      }
    };
    fetchFarm();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !farm) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="p-8 text-center border rounded-lg bg-card max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
          <h2 className="text-base font-semibold">Farm Profile Not Found</h2>
          <p className="text-xs text-muted-foreground mt-1 mb-4">{error}</p>
          <Button asChild variant="outline">
            <Link href="/farms">Return to Farms</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/farms">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Farms
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-serif font-bold text-foreground">{farm.name}</h1>
              <Badge variant={farm.is_active ? "success" : "secondary"}>
                {farm.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {farm.city}, {farm.state}
            </p>
          </div>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/batches/new">
              Register Harvest Batch
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Location & Territorial Boundary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Address</p>
              <p className="text-sm font-medium text-foreground">{farm.address}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-border/40 pt-2">
              <div>
                <p className="text-xs text-muted-foreground">City</p>
                <p className="text-sm font-medium">{farm.city}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">State</p>
                <p className="text-sm font-medium">{farm.state}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pincode</p>
                <p className="text-sm font-medium">{farm.pincode}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" /> Certifications & Acreage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Total Acreage</p>
              <p className="text-xl font-bold font-serif text-foreground">
                {farm.area_hectares ? `${farm.area_hectares} Hectares` : "Not specified"}
              </p>
            </div>
            <div className="border-t border-border/40 pt-2">
              <p className="text-xs text-muted-foreground mb-1.5">Compliance Accreditations</p>
              <div className="flex flex-wrap gap-1.5">
                {farm.certifications && farm.certifications.length > 0 ? (
                  farm.certifications.map((c) => (
                    <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No certifications listed</span>
                )}
              </div>
            </div>
            {farm.description && (
              <div className="border-t border-border/40 pt-2">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-xs text-foreground mt-0.5">{farm.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

