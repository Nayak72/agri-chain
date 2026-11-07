"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowLeft, Loader2, AlertCircle, Truck } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

interface TransporterProfile {
  id: string;
  company_name: string;
}

export default function NewVehiclePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [transporters, setTransporters] = useState<TransporterProfile[]>([]);
  const [myTransporterId, setMyTransporterId] = useState<string>("");
  const [selectedTransporterId, setSelectedTransporterId] = useState("");

  // Vehicle fields
  const [registrationNumber, setRegistrationNumber] = useState("MH15");
  const [category, setCategory] = useState("REFRIGERATED_TRUCK");
  const [vehicleType, setVehicleType] = useState("10T_TRUCK");
  const [maxPayloadKg, setMaxPayloadKg] = useState("10000");
  const [hasRefrigeration, setHasRefrigeration] = useState(true);
  const [tempMin, setTempMin] = useState("-5");
  const [tempMax, setTempMax] = useState("10");
  const [registrationExpiry, setRegistrationExpiry] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [fitnessExpiry, setFitnessExpiry] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set default expiry dates (1 year ahead)
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const dateStr = nextYear.toISOString().split("T")[0];
    setRegistrationExpiry(dateStr);
    setInsuranceExpiry(dateStr);
    setFitnessExpiry(dateStr);

    async function loadTransporter() {
      setLoading(true);
      try {
        if (user?.role === "ADMIN") {
          const { data } = await apiClient.get("/transporters").catch(() => ({ data: [] }));
          const list = Array.isArray(data) ? data : data?.items || [];
          setTransporters(list);
        } else if (user?.role === "TRANSPORTER") {
          const { data } = await apiClient.get("/transporters/me").catch(() => ({ data: null }));
          if (data) {
            setMyTransporterId(data.id);
            setSelectedTransporterId(data.id);
            setTransporters([data]);
          }
        }
      } catch {
        // Silently ignore
      } finally {
        setLoading(false);
      }
    }
    if (user) loadTransporter();
  }, [user]);

  // Auto-set refrigeration based on category
  const handleCategoryChange = (val: string) => {
    setCategory(val);
    setHasRefrigeration(val === "REFRIGERATED_TRUCK" || val === "INSULATED_TRUCK");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const regPattern = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;
    if (!regPattern.test(registrationNumber)) {
      toast.error("Registration number must be in format MH15AB1234");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        transporter_id: selectedTransporterId || myTransporterId,
        registration_number: registrationNumber,
        category,
        vehicle_type: vehicleType,
        max_payload_kg: parseFloat(maxPayloadKg) || 10000,
        refrigeration_available: hasRefrigeration,
        temperature_min: hasRefrigeration ? parseFloat(tempMin) : undefined,
        temperature_max: hasRefrigeration ? parseFloat(tempMax) : undefined,
        registration_expiry: registrationExpiry,
        insurance_expiry: insuranceExpiry,
        fitness_expiry: fitnessExpiry,
      };

      const { data } = await apiClient.post("/vehicles", payload);
      toast.success("Vehicle registered to fleet successfully");
      router.push(`/fleet`);
    } catch (err: any) {
      const message = err?.response?.data?.detail || "Failed to register vehicle";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/fleet">
          <Button variant="ghost" size="icon" className="h-9 w-9 border border-input">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title="Register Vehicle"
          description="Add a commercial vehicle to your certified cold-chain freight fleet"
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
              <CardTitle className="text-base font-semibold">Vehicle Identity & Class</CardTitle>
              <CardDescription>Registration details and cargo class specifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user?.role === "ADMIN" && transporters.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Assign to Transporter *</label>
                  <Select value={selectedTransporterId} onValueChange={setSelectedTransporterId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Transporter" />
                    </SelectTrigger>
                    <SelectContent>
                      {transporters.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1.5 block">Registration Number *</label>
                <Input
                  placeholder="e.g. MH15AB1234"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                  required
                  className="font-mono uppercase"
                />
                <p className="text-xs text-muted-foreground mt-1">Format: State (2 letters) + District (2 digits) + Series (1–2 letters) + Serial (4 digits)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Vehicle Category *</label>
                  <Select value={category} onValueChange={handleCategoryChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REFRIGERATED_TRUCK">Refrigerated Truck (Reefer)</SelectItem>
                      <SelectItem value="INSULATED_TRUCK">Insulated Truck</SelectItem>
                      <SelectItem value="NORMAL_CARGO_TRUCK">Normal Cargo Truck</SelectItem>
                      <SelectItem value="SMALL_DELIVERY_VEHICLE">Small Delivery Vehicle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Vehicle Payload Class *</label>
                  <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10T_TRUCK">10-Tonne Truck</SelectItem>
                      <SelectItem value="15T_TRUCK">15-Tonne Truck</SelectItem>
                      <SelectItem value="20T_TRUCK">20-Tonne Truck</SelectItem>
                      <SelectItem value="25T_TRUCK">25-Tonne Heavy Truck</SelectItem>
                      <SelectItem value="1T_PICKUP">1-Tonne Pickup</SelectItem>
                      <SelectItem value="2T_PICKUP">2-Tonne Pickup</SelectItem>
                      <SelectItem value="VAN">Cargo Van</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Maximum Payload (kg) *</label>
                <Input
                  type="number"
                  value={maxPayloadKg}
                  onChange={(e) => setMaxPayloadKg(e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Cold-Chain & Compliance Dates</CardTitle>
              <CardDescription>Refrigeration capability and regulatory certificate expiry</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="has_refrig"
                  checked={hasRefrigeration}
                  onChange={(e) => setHasRefrigeration(e.target.checked)}
                  className="rounded border-input h-4 w-4 text-[#173B2F] focus:ring-[#173B2F]"
                />
                <label htmlFor="has_refrig" className="text-sm font-medium cursor-pointer">
                  Equipped with Active Refrigeration Unit
                </label>
              </div>

              {hasRefrigeration && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Min Cargo Temp (°C)</label>
                    <Input type="number" step="0.5" value={tempMin} onChange={(e) => setTempMin(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Max Cargo Temp (°C)</label>
                    <Input type="number" step="0.5" value={tempMax} onChange={(e) => setTempMax(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="border-t border-border/40 pt-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Compliance Certificate Expiry</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Registration Expiry *</label>
                    <Input
                      type="date"
                      value={registrationExpiry}
                      onChange={(e) => setRegistrationExpiry(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Insurance Expiry *</label>
                    <Input
                      type="date"
                      value={insuranceExpiry}
                      onChange={(e) => setInsuranceExpiry(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Fitness Certificate Expiry *</label>
                    <Input
                      type="date"
                      value={fitnessExpiry}
                      onChange={(e) => setFitnessExpiry(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/fleet">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={submitting || loading} className="bg-[#173B2F] hover:bg-[#102820] text-white">
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Register Vehicle
          </Button>
        </div>
      </form>
    </div>
  );
}

