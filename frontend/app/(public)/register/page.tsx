"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, MapPin, Phone, Leaf, Truck, Warehouse, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { setToken } from "@/lib/auth";
import Cookies from "js-cookie";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const ROLES = [
  { value: "FARMER", label: "Farmer / Producer", icon: User, description: "Grow and sell produce" },
  { value: "WAREHOUSE_MANAGER", label: "Warehouse Manager", icon: Warehouse, description: "Receive, store, and grade produce" },
  { value: "TRANSPORTER", label: "Transporter / Fleet", icon: Truck, description: "Manage freight operations" },
  { value: "DRIVER", label: "Driver", icon: MapPin, description: "Transport shipments" },
  { value: "BUYER", label: "Buyer / Retailer", icon: ShieldCheck, description: "Purchase agricultural produce" },
];

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
  const [showPassword, setShowPassword] = useState(false);
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
      setError(err.response?.data?.detail || err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

      <motion.div
        initial={{ opacity: 0, x: -60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="hidden lg:flex lg:w-1/2 h-full items-center justify-center p-12 fixed left-0 top-0 z-10"
      >
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-serif text-2xl font-bold">A</span>
            </div>
            <span className="font-serif font-bold text-2xl tracking-tighter text-foreground">AgriChain</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6 leading-tight">
            Join the Agricultural<br />
            <span className="text-primary">Supply Chain Network</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            Register as a farmer, warehouse manager, transporter, driver, or buyer to access
            the complete AgriChain platform for produce management, freight booking, and traceability.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                <Leaf className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground">Farmers & Producers</h3>
              <p className="text-sm text-muted-foreground mt-1">Register farms and harvest batches</p>
            </div>
            <div className="p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-border">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success mb-3">
                <Warehouse className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground">Warehouse Managers</h3>
              <p className="text-sm text-muted-foreground mt-1">Receive, inspect, and store produce</p>
            </div>
            <div className="p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-border">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-3">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground">Transporters</h3>
              <p className="text-sm text-muted-foreground mt-1">Manage fleet and freight bookings</p>
            </div>
            <div className="p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-border">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center text-warning mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground">Buyers & Retailers</h3>
              <p className="text-sm text-muted-foreground mt-1">Source quality produce with traceability</p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative z-20 w-full max-w-lg"
      >
        <Card className="w-full bg-white/95 backdrop-blur-lg border border-border/50 shadow-premium">
          <CardHeader className="text-center space-y-1 pb-6">
            <CardTitle className="text-2xl font-serif font-bold text-foreground">Create Account</CardTitle>
            <CardDescription>Join AgriChain as an agricultural supply chain participant</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-destructive text-sm"
              >
                {error}
              </motion.div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="full_name"
                    placeholder="John Smith"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    className="pl-10"
                    autoComplete="name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@farm.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="phone"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="pl-10"
                    autoComplete="tel"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label>Select Your Role</Label>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Select your role">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => {
                        setRole(r.value);
                        setFormData({ ...formData, role: r.value });
                      }}
                      role="radio"
                      aria-checked={role === r.value}
                      className={cn(
                        "flex flex-col items-start gap-1 p-3 rounded-xl border transition-all duration-200 text-left",
                        role === r.value
                          ? "bg-primary/5 border-primary/30 text-primary"
                          : "border-border text-muted-foreground hover:bg-primary/5 hover:border-primary/10"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <r.icon className="w-5 h-5" aria-hidden="true" />
                        <span className="font-medium">{r.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-7">{r.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="pl-10 pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="confirm_password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                    required
                    className="pl-10 pr-10"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Administrator accounts cannot be created through public registration. Contact system administration.
              </p>
              <Button type="submit" className="w-full bg-primary text-primary-foreground" disabled={loading} size="lg">
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}