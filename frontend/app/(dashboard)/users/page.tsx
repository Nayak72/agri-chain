"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Users, MoreHorizontal, Eye, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { Skeleton, SkeletonTableRow } from "@/components/ui/skeleton";

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
}

const roleConfig: Record<string, { variant: "default" | "success" | "warning" | "destructive" | "info" | "secondary"; icon: React.ComponentType<{ className?: string }> }> = {
  ADMIN: { variant: "default", icon: UserCog },
  FARMER: { variant: "success", icon: Users },
  WAREHOUSE_MANAGER: { variant: "info", icon: UserCog },
  TRANSPORTER: { variant: "default", icon: Truck },
  DRIVER: { variant: "secondary", icon: MapPin },
  BUYER: { variant: "warning", icon: ShoppingCart },
};

import { Truck, MapPin, ShoppingCart } from "lucide-react";

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
        setUsers(data?.users || []);
        setError(null);
      } catch (e) {
        setError("Failed to load users. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage system users and their roles."
        actions={
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 h-9 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        }
      />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-destructive/20 bg-destructive/5 p-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </motion.div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <StaggerContainer>
                {[1, 2, 3, 4, 5].map((i) => (
                  <StaggerItem key={i} delay={i * 0.03}>
                    <SkeletonTableRow columns={6} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No users found</h3>
              <p className="text-muted-foreground mb-6">{search ? "No users match your search." : "No users have been registered yet."}</p>
              {!search && (
                <Button asChild>
                  <a href="/users/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const role = roleConfig[user.role] || { variant: "secondary", icon: Users };
                    const Icon = role.icon;
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{user.full_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{user.id.substring(0, 8)}...</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={role.variant}>{user.role.replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? "success" : "destructive"}>
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_approved ? "success" : "warning"}>
                            {user.is_approved ? "Yes" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`/users/${user.id}`}>
                                <Eye className="w-4 h-4" />
                              </a>
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}