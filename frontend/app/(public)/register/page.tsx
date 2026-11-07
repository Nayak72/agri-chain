"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { setToken } from "@/lib/auth";
import Cookies from "js-cookie";

const ROLES = [
  { value: "FARMER", label: "Farmer / Producer", icon: User },
  { value: "WAREHOUSE_MANAGER", label: "Warehouse Manager", icon: WarehouseIcon },
  { value: "TRANSPORTER", label: "Transporter / Fleet", icon: TruckIcon },
  { value: "DRIVER", label: "Driver", icon: UserIcon },
  { value: "BUYER", label: "Buyer / Retailer", icon: MapPin },
];

function WarehouseIcon() { return <Warehouse className="w-5 h-5" />; }
function TruckIcon() { return <Truck className="w-5 h-5" />; }
function UserIcon() { return <User className="w-5 h-5" />; }

import { Warehouse, Truck } from "lucide-react";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
    role: "FARMER",
  });
  const [role, setRole] = useState("FARMER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    try {
      const { data } = await apiClient.post("/auth/register", {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone,
        role: formData.role,
      });
      setToken(data.access_token);
      Cookies.set("refresh_token", data.refresh_token, { expires: 7 });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-soft px-4">
      <Card className="w-full max-w-lg glass-panel">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-2xl font-serif font-bold text-charcoal">Create Account</CardTitle>
          <CardDescription>Join AgriChain as an agricultural supply chain participant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                placeholder="John Smith"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@farm.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Select Your Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => {
                      setRole(r.value);
                      setFormData({ ...formData, role: r.value });
                    }}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border transition-colors text-sm",
                      role === r.value
                        ? "bg-forest-100 border-forest-300 text-forest-800"
                        : "border-border text-muted-foreground hover:bg-white/50"
                    )}
                  >
                    <r.icon className="w-4 h-4" />
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm Password</Label>
              <Input
                id="confirm_password"
                type="password"
                placeholder="••••••••"
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Administrator accounts cannot be created through public registration. Contact system administration.
            </p>
            <Button type="submit" className="w-full bg-forest-800 text-white" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <a href="/login" className="text-forest-800 hover:underline font-medium">
              Sign in
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}