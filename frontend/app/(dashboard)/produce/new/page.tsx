"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowLeft, Loader2, AlertCircle, Leaf } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const PRODUCE_TYPES = [
  "TOMATO", "POTATO", "ONION", "APPLE", "BANANA", "MANGO", "GRAPES",
  "ORANGE", "GUAVA", "POMEGRANATE", "CAULIFLOWER", "CABBAGE", "SPINACH",
  "CARROT", "BITTER_GOURD", "BRINJAL", "CAPSICUM", "CHILLI", "GARLIC",
  "GINGER", "LEMON", "WATERMELON", "PAPAYA", "PINEAPPLE", "STRAWBERRY",
];

const CATEGORIES = [
  { value: "FRUIT", label: "Fruits" },
  { value: "VEGETABLE", label: "Vegetables" },
  { value: "GRAIN", label: "Grains & Cereals" },
  { value: "SPICE", label: "Spices & Condiments" },
  { value: "LEGUME", label: "Legumes & Pulses" },
  { value: "FLOWER", label: "Cut Flowers & Floriculture" },
  { value: "HERB", label: "Herbs & Medicinal" },
];

export default function NewProducePage() {
  const router = useRouter();

  const [produceType, setProduceType] = useState("TOMATO");
  const [name, setName] = useState("Tomato");
  const [category, setCategory] = useState("VEGETABLE");
  const [unit, setUnit] = useState("kg");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProduceTypeChange = (val: string) => {
    setProduceType(val);
    // Auto-fill name from type
    setName(val.charAt(0) + val.slice(1).toLowerCase().replace(/_/g, " "));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Produce name is required");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        produce_type: produceType,
        name: name.trim(),
        category,
        unit,
        description: description.trim() || undefined,
      };

      const { data } = await apiClient.post("/produce", payload);
      toast.success("Produce registered to catalogue");
      router.push(`/produce/${data.id}`);
    } catch (err: any) {
      const message = err?.response?.data?.detail || "Failed to register produce";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/produce">
          <Button variant="ghost" size="icon" className="h-9 w-9 border border-input">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title="Register Produce"
          description="Add a new commodity to the AgriChain produce catalogue"
        />
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#173B2F]/10 rounded-lg">
                <Leaf className="h-5 w-5 text-[#173B2F]" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Commodity Details</CardTitle>
                <CardDescription>Official catalogue entry for a supported agricultural produce type</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Produce Type *</label>
              <Select value={produceType} onValueChange={handleProduceTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {PRODUCE_TYPES.map((pt) => (
                    <SelectItem key={pt} value={pt}>
                      {pt.charAt(0) + pt.slice(1).toLowerCase().replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Must be unique across the catalogue. Used for cold-chain handling profile lookup.</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Display Name *</label>
              <Input
                placeholder="e.g. Cherry Tomato (Premium Grade)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Produce Category *</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Unit of Measurement *</label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg (Kilogram)</SelectItem>
                    <SelectItem value="quintal">Quintal (100 kg)</SelectItem>
                    <SelectItem value="mt">MT (Metric Tonne)</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="crate">Crate</SelectItem>
                    <SelectItem value="dozen">Dozen</SelectItem>
                    <SelectItem value="piece">Piece</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Description / Notes</label>
              <textarea
                className="w-full border border-input rounded-md text-sm p-3 focus:outline-none focus:ring-2 focus:ring-[#173B2F] resize-none min-h-[80px] bg-background"
                placeholder="Optional: quality grades, varieties, handling notes, cold-chain temperature requirements…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="p-4 bg-[#173B2F]/5 border border-[#173B2F]/20 rounded-lg">
              <p className="text-xs font-medium text-[#173B2F]">Admin-Only Operation</p>
              <p className="text-xs text-muted-foreground mt-1">
                Only administrators can add produce types. Each entry creates a system-wide catalogue record used for batch classification, sensor simulation profiles, and analytics reporting.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Link href="/produce">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={submitting} className="bg-[#173B2F] hover:bg-[#102820] text-white">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add to Catalogue
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

