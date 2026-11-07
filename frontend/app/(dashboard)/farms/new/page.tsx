"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowLeft, TreePine, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewFarmPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [areaHectares, setAreaHectares] = useState("");
  const [certifications, setCertifications] = useState("");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address || !city || !state || !pincode) {
      toast.error("Please fill in all mandatory location details.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name,
        address,
        city,
        state,
        pincode,
        area_hectares: areaHectares ? parseFloat(areaHectares) : undefined,
        certifications: certifications ? certifications.split(",").map((s) => s.trim()).filter(Boolean) : [],
        description: description || undefined,
      };

      const { data } = await apiClient.post("/farms", payload);
      toast.success("Farm profile registered successfully!");
      router.push(`/farms/${data.id || data.name}`);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Failed to register farm profile.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/farms">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Farms
          </Link>
        </Button>
        <PageHeader
          title="Register Farm Profile"
          description="Establish agricultural provenance origin for verified harvest batches."
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
          <CardTitle className="text-base font-semibold">Farm Particulars</CardTitle>
          <CardDescription>Enter registered farm title, acreage, and territorial address</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Farm Estate Name *</label>
              <Input
                placeholder="e.g. Sahyadri Agro Orchards"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Street / Sector Address *</label>
              <Input
                placeholder="e.g. Survey No. 42, Dindori Road"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City / District *</label>
                <Input placeholder="Nashik" value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">State *</label>
                <Input placeholder="Maharashtra" value={state} onChange={(e) => setState(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pincode *</label>
                <Input placeholder="422004" value={pincode} onChange={(e) => setPincode(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acreage (Hectares)</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="25.5"
                  value={areaHectares}
                  onChange={(e) => setAreaHectares(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Certifications (comma-separated)</label>
                <Input
                  placeholder="GlobalGAP, Organic India"
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description & Notes</label>
              <Input
                placeholder="Drip irrigation, cold storage shed equipped"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-border/50">
              <Button type="button" variant="outline" asChild>
                <Link href="/farms">Cancel</Link>
              </Button>
              <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <TreePine className="w-4 h-4 mr-2" />
                    Save Farm
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

