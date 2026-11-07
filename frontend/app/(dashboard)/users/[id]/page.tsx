"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  ArrowLeft, Loader2, ShieldAlert, CheckCircle2, XCircle, Ban, User2,
  Mail, Phone, Calendar, Shield, AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-900 border-purple-200",
  FARMER: "bg-[#173B2F] text-white",
  BUYER: "bg-sky-100 text-sky-900 border-sky-200",
  TRANSPORTER: "bg-amber-100 text-amber-900 border-amber-200",
  DRIVER: "bg-orange-100 text-orange-900 border-orange-200",
  WAREHOUSE_MANAGER: "bg-indigo-100 text-indigo-900 border-indigo-200",
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const userId = params.id as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = currentUser?.role === "ADMIN";

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(`/users/${userId}`);
      setProfile(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "User not found or access denied.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const handleApprove = async () => {
    setActionLoading("approve");
    try {
      await apiClient.post(`/users/${userId}/approve`);
      toast.success("User approved — they can now access the platform");
      await fetchProfile();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to approve user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async () => {
    setActionLoading("suspend");
    try {
      await apiClient.post(`/users/${userId}/suspend`);
      toast.success("User account suspended");
      await fetchProfile();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to suspend user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async () => {
    setActionLoading("activate");
    try {
      await apiClient.post(`/users/${userId}/activate`);
      toast.success("User account reactivated");
      await fetchProfile();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to activate user");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#173B2F] mb-4" />
        <p className="text-sm text-muted-foreground">Loading user profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-6">
        <Link href="/users">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Users
          </Button>
        </Link>
        <Card className="border-destructive/30">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <ShieldAlert className="h-10 w-10 text-destructive mb-3" />
            <h3 className="font-semibold text-lg text-foreground">User Record Unavailable</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">{error || "User not found."}</p>
            <Button onClick={() => router.push("/users")} variant="outline">
              Return to User Management
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSelf = currentUser?.id === userId;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/users">
            <Button variant="ghost" size="icon" className="h-9 w-9 border border-input">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-full">
                <User2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-serif">{profile.full_name}</h1>
              <Badge className={ROLE_COLORS[profile.role] || "bg-muted text-muted-foreground"}>
                {profile.role}
              </Badge>
              {!profile.is_active && (
                <Badge className="bg-destructive/10 text-destructive border-destructive/20">Suspended</Badge>
              )}
              {profile.is_active && !profile.is_approved && (
                <Badge className="bg-amber-100 text-amber-900 border-amber-200">Pending Approval</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground ml-11">
              {profile.email} • Joined {new Date(profile.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
            </p>
          </div>
        </div>

        {isAdmin && !isSelf && (
          <div className="flex items-center gap-2">
            {!profile.is_approved && profile.is_active && (
              <Button
                onClick={handleApprove}
                disabled={actionLoading !== null}
                className="bg-[#173B2F] hover:bg-[#102820] text-white gap-2"
              >
                {actionLoading === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Approve Account
              </Button>
            )}
            {profile.is_active ? (
              <Button
                variant="outline"
                onClick={handleSuspend}
                disabled={actionLoading !== null}
                className="text-destructive border-destructive/30 hover:bg-destructive/5 gap-2"
              >
                {actionLoading === "suspend" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Suspend
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleActivate}
                disabled={actionLoading !== null}
                className="text-[#173B2F] border-[#173B2F]/30 gap-2"
              >
                {actionLoading === "activate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Reactivate
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Account Status Alerts */}
      {!profile.is_approved && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-semibold">Account Pending Approval</p>
            <p className="text-amber-700 mt-0.5">This user has registered but awaits administrator approval before gaining platform access.</p>
          </div>
        </div>
      )}

      {!profile.is_active && (
        <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          <Ban className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Account Suspended</p>
            <p className="mt-0.5 opacity-80">This user&apos;s access is currently restricted. All active sessions are invalidated.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2.5">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Email Address</span>
                <p className="font-medium text-foreground text-sm mt-0.5">{profile.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Phone Number</span>
                <p className="font-medium text-foreground text-sm mt-0.5">{profile.phone || "Not provided"}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Account Created</span>
                <p className="font-medium text-foreground text-sm mt-0.5">
                  {new Date(profile.created_at).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Last Updated</span>
                <p className="font-medium text-foreground text-sm mt-0.5">
                  {new Date(profile.updated_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Access Control & Permissions</CardTitle>
            <CardDescription>Role-based platform access and account status overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Role</span>
                <Badge className={`mt-1 ${ROLE_COLORS[profile.role] || "bg-muted text-muted-foreground"}`}>
                  {profile.role}
                </Badge>
              </div>
              <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Status</span>
                <div className="flex items-center gap-1.5 mt-1">
                  {profile.is_active ? (
                    <CheckCircle2 className="h-4 w-4 text-[#173B2F]" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm font-medium">{profile.is_active ? "Active" : "Suspended"}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                <span className="text-xs text-muted-foreground uppercase font-semibold block">Approval</span>
                <div className="flex items-center gap-1.5 mt-1">
                  {profile.is_approved ? (
                    <Shield className="h-4 w-4 text-[#173B2F]" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="text-sm font-medium">{profile.is_approved ? "Approved" : "Pending"}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                <span className="text-xs text-muted-foreground uppercase font-semibold block">User ID</span>
                <p className="font-mono text-xs text-foreground mt-1 truncate">{profile.id}</p>
              </div>
            </div>

            <div className="p-4 bg-muted/30 border border-border/40 rounded-lg">
              <p className="text-xs text-muted-foreground">
                All account status changes are recorded on the immutable SHA-256 audit ledger. Approval grants role-specific platform access per AgriChain RBAC policy.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

