"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowLeft, Building2, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewWarehousePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Nashik");
  const [state, setState] = useState("Maharashtra");
  const [pincode, setPincode] = useState("422001");
  const [capacityKg, setCapacityKg] = useState("50000");
  const [coldStorageCapacityKg, setColdStorageCapacityKg] = useState("20000");
  const [hasRefrigeration, setHasRefrigeration] = useState(true);
  const [tempMin, setTempMin] = useState("0");
  const [tempMax, setTempMax] = useState("8");
  const [certifications, setCertifications] = useState("FSSAI, ISO 22000, Cold Chain Alliance");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a warehouse facility name");
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
        capacity_kg: parseFloat(capacityKg) || 10000,
        cold_storage_capacity_kg: hasRefrigeration ? (parseFloat(coldStorageCapacityKg) || 0) : 0,
        has_refrigeration: hasRefrigeration,
        temperature_range_min: hasRefrigeration ? parseFloat(tempMin) : undefined,
        temperature_range_max: hasRefrigeration ? parseFloat(tempMax) : undefined,
        certifications: certifications.split(",").map((c) => c.trim()).filter(Boolean),
      };

      const { data } = await apiClient.post("/warehouses", payload);
      toast.success("Warehouse registered successfully");
      router.push(`/warehouses/${data.id}`);
    } catch (err: any) {
      const message = err?.response?.data?.detail || "Failed to create warehouse";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/warehouses">
          <Button variant="ghost" size="icon" className="h-9 w-9 border border-input">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title="Register Warehouse"
          description="Add a new cold-chain hub or general storage terminal to your logistics network"
        />
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Facility Information</CardTitle>
              <CardDescription>Primary identification and physical address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Warehouse Facility Name *</label>
                <Input
                  placeholder="e.g. Apex AgriCold Logistics Terminal A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Street Address *</label>
                <Input
                  placeholder="e.g. Plot 42, MIDC Ambad Industrial Area"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">City *</label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">State *</label>
                  <Input value={state} onChange={(e) => setState(e.target.value)} required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Pincode *</label>
                  <Input value={pincode} onChange={(e) => setPincode(e.target.value)} required />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Accreditations & Certifications</label>
                <Input
                  placeholder="Comma separated: FSSAI, ISO 22000, WDRA"
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Capacity & Climate Specs</CardTitle>
              <CardDescription>Storage volumes and reefer capabilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Total Storage Capacity (kg) *</label>
                <Input
                  type="number"
                  value={capacityKg}
                  onChange={(e) => setCapacityKg(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="has_refrig"
                  checked={hasRefrigeration}
                  onChange={(e) => setHasRefrigeration(e.target.checked)}
                  className="rounded border-input h-4 w-4 text-[#173B2F] focus:ring-[#173B2F]"
                />
                <label htmlFor="has_refrig" className="text-sm font-medium cursor-pointer">
                  Equipped with Temperature-Controlled Cold Storage
                </label>
              </div>

              {hasRefrigeration && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Cold Storage Capacity (kg) *</label>
                    <Input
                      type="number"
                      value={coldStorageCapacityKg}
                      onChange={(e) => setColdStorageCapacityKg(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Min Temp (°C)</label>
                      <Input
                        type="number"
                        step="0.5"
                        value={tempMin}
                        onChange={(e) => setTempMin(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Max Temp (°C)</label>
                      <Input
                        type="number"
                        step="0.5"
                        value={tempMax}
                        onChange={(e) => setTempMax(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/warehouses">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={submitting} className="bg-[#173B2F] hover:bg-[#102820] text-white">
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Register Warehouse
          </Button>
        </div>
      </form>
    </div>
  );
}

