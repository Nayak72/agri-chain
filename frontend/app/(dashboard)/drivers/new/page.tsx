"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowLeft, Loader2, AlertCircle, UserCheck } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

interface TransporterProfile {
  id: string;
  company_name: string;
}

export default function NewDriverPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [transporters, setTransporters] = useState<TransporterProfile[]>([]);
  const [myTransporterId, setMyTransporterId] = useState<string>("");
  const [selectedTransporterId, setSelectedTransporterId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+91");
  const [email, setEmail] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Nashik");
  const [driverState, setDriverState] = useState("Maharashtra");
  const [pincode, setPincode] = useState("422001");
  const [experienceYears, setExperienceYears] = useState("3");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseNumber.trim()) {
      toast.error("License number is required");
      return;
    }

    const expDate = new Date(licenseExpiry);
    if (!licenseExpiry || expDate <= new Date()) {
      toast.error("License expiry date must be in the future");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        transporter_id: selectedTransporterId || myTransporterId,
        name: name.trim(),
        phone,
        email: email || undefined,
        license_number: licenseNumber.trim(),
        license_expiry: licenseExpiry,
        address: address.trim(),
        city,
        state: driverState,
        pincode,
        experience_years: parseInt(experienceYears) || 0,
      };

      const { data } = await apiClient.post("/drivers", payload);
      toast.success("Driver profile registered successfully");
      router.push(`/drivers/${data.id}`);
    } catch (err: any) {
      const message = err?.response?.data?.detail || "Failed to register driver";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/drivers">
          <Button variant="ghost" size="icon" className="h-9 w-9 border border-input">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title="Register Driver"
          description="Add a certified commercial driver to your fleet operations team"
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
              <CardTitle className="text-base font-semibold">Driver Identity</CardTitle>
              <CardDescription>Personal details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user?.role === "ADMIN" && transporters.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Assign to Transporter *</label>
                  <Select value={selectedTransporterId} onValueChange={setSelectedTransporterId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Transporter Company" />
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
                <label className="text-sm font-medium mb-1.5 block">Full Name *</label>
                <Input
                  placeholder="e.g. Ramesh Kumar Singh"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Mobile Number *</label>
                  <Input
                    type="tel"
                    placeholder="+91XXXXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email (optional)</label>
                  <Input
                    type="email"
                    placeholder="driver@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Residential Address *</label>
                <Input
                  placeholder="e.g. 7/42 Ram Nagar Colony"
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
                  <Input value={driverState} onChange={(e) => setDriverState(e.target.value)} required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Pincode *</label>
                  <Input value={pincode} onChange={(e) => setPincode(e.target.value)} required />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">License & Qualification</CardTitle>
              <CardDescription>Commercial driving certification details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Driving Licence Number *</label>
                <Input
                  placeholder="e.g. MH15 20190000123"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Licence Expiry Date *</label>
                <Input
                  type="date"
                  value={licenseExpiry}
                  onChange={(e) => setLicenseExpiry(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Years of Driving Experience</label>
                <Input
                  type="number"
                  min="0"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                />
              </div>

              <div className="p-4 bg-[#173B2F]/5 border border-[#173B2F]/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <UserCheck className="h-5 w-5 text-[#173B2F] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#173B2F]">Background Verification Required</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      All registered drivers undergo FSSAI compliance checks and license verification. Driver profiles are recorded on the immutable SHA-256 audit ledger.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/drivers">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={submitting || loading} className="bg-[#173B2F] hover:bg-[#102820] text-white">
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Register Driver
          </Button>
        </div>
      </form>
    </div>
  );
}

