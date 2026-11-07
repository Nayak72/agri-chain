"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { Search, Users, Eye, AlertCircle, Loader2, ArrowRight, User2, ShieldAlert, CheckCircle2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
}

const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-900 border-purple-200",
  FARMER: "bg-[#173B2F] text-white",
  BUYER: "bg-sky-100 text-sky-900 border-sky-200",
  TRANSPORTER: "bg-amber-100 text-amber-900 border-amber-200",
  DRIVER: "bg-orange-100 text-orange-900 border-orange-200",
  WAREHOUSE_MANAGER: "bg-indigo-100 text-indigo-900 border-indigo-200",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get("/users");
        setUsers(data?.users || data || []);
        setError(null);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load users. Admin access required.");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const pending = users.filter((u) => !u.is_approved && u.is_active).length;
  const suspended = users.filter((u) => !u.is_active).length;
  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Inspect, approve, and manage platform user accounts and access permissions"
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: users.length, icon: Users },
          { label: "Pending Approval", value: pending, icon: Clock, warn: pending > 0 },
          { label: "Suspended", value: suspended, icon: ShieldAlert, error: suspended > 0 },
          { label: "Active Roles", value: Object.keys(roleCounts).length, icon: CheckCircle2, accent: true },
        ].map((s, i) => (
          <Card key={i} className={s.accent ? "border-[#173B2F]/30" : s.warn ? "border-amber-300" : s.error && suspended > 0 ? "border-destructive/30" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase text-muted-foreground">{s.label}</span>
                <s.icon className={`h-4 w-4 ${s.accent ? "text-[#173B2F]" : s.warn ? "text-amber-600" : s.error && suspended > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              </div>
              <p className={`text-2xl font-bold ${s.accent ? "text-[#173B2F]" : s.warn && pending > 0 ? "text-amber-700" : s.error && suspended > 0 ? "text-destructive" : "text-foreground"}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {pending > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
          <Clock className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-semibold">{pending} account{pending > 1 ? "s" : ""} awaiting approval</p>
            <p className="text-amber-700 text-xs mt-0.5">Review and approve registered transporter/farmer accounts to grant platform access.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      )}

      <Card>
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative max-w-sm w-full">
            <Input
              placeholder="Search name, email, or role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm"
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{filtered.length} users</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#173B2F] mb-3" />
            <p className="text-sm text-muted-foreground">Loading user accounts…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <User2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No users found</h3>
            <p className="text-sm text-muted-foreground">
              {search ? "No accounts match your search." : "No users have registered yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Account Status</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-muted border border-border/50 flex items-center justify-center shrink-0">
                          <User2 className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{user.full_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{user.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge className={ROLE_STYLES[user.role] || "bg-muted text-muted-foreground"}>
                        {user.role.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={user.is_active ? "bg-[#173B2F]/10 text-[#173B2F] border-[#173B2F]/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
                        {user.is_active ? "Active" : "Suspended"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={user.is_approved ? "bg-[#173B2F] text-white" : "bg-amber-100 text-amber-900 border-amber-200"}>
                        {user.is_approved ? "Approved" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/users/${user.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                          Manage <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
