"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, Leaf, Truck, Warehouse, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { parseApiError } from "@/lib/api-client";
import { useAuthContext } from "@/providers/AuthProvider";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { login } = useAuthContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(parseApiError(err).message);
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
            Agricultural Logistics,<br />
            <span className="text-primary">Redefined</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            A connected platform for managing agricultural produce, freight operations,
            cold-chain conditions, and verifiable supply chain records.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                <Leaf className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground">Produce & Farms</h3>
              <p className="text-sm text-muted-foreground mt-1">Register harvest batches and manage farm profiles</p>
            </div>
            <div className="p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-border">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-3">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground">Freight & Fleet</h3>
              <p className="text-sm text-muted-foreground mt-1">Book transport, manage vehicles and drivers</p>
            </div>
            <div className="p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-border">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success mb-3">
                <Warehouse className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground">Warehouse Ops</h3>
              <p className="text-sm text-muted-foreground mt-1">Receive, inspect, grade, and store produce</p>
            </div>
            <div className="p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-border">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center text-warning mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground">Traceability</h3>
              <p className="text-sm text-muted-foreground mt-1">SHA-256 hash-chained audit ledger</p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative z-20 w-full max-w-md lg:max-w-lg"
      >
        <Card className="w-full bg-white/95 backdrop-blur-lg border border-border/50 shadow-premium">
          <CardHeader className="text-center space-y-1 pb-6">
            <CardTitle className="text-2xl font-serif font-bold text-foreground">Welcome back</CardTitle>
            <CardDescription>Sign in to your AgriChain account</CardDescription>
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
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@farm.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="relative space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-10"
                    autoComplete="current-password"
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
              <Button type="submit" className="w-full bg-primary text-primary-foreground" disabled={loading} size="lg">
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Create account
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
