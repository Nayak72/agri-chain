"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, TreePine, MapPin, Eye, MoreHorizontal, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/motion";
import { motion } from "framer-motion";
import { Skeleton, SkeletonTableRow } from "@/components/ui/skeleton";

interface Farm {
  id: string;
  name: string;
  city: string;
  state: string;
  area_hectares?: number;
  is_active: boolean;
  created_at: string;
}

export default function FarmsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFarms = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get("/farms");
        setFarms(data || []);
        setError(null);
      } catch (e) {
        setError("Failed to load farms. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchFarms();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Farms"
        description="Manage farm profiles and locations."
        actions={
          <Button asChild>
            <Link href="/farms/new">
              <Plus className="w-4 h-4 mr-2" />
              Register Farm
            </Link>
          </Button>
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
                    <SkeletonTableRow columns={5} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          ) : farms.length === 0 ? (
            <div className="p-12 text-center">
              <TreePine className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No farms found</h3>
              <p className="text-muted-foreground mb-6">Get started by registering your first farm.</p>
              <Button asChild>
                <Link href="/farms/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Register Farm
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farm Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Area (hectares)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {farms.map((farm, index) => (
                    <TableRow key={farm.id} className="hover:bg-primary/3">
                      <TableCell className="font-medium text-foreground">{farm.name}</TableCell>
                      <TableCell className="text-muted-foreground">{farm.city}, {farm.state}</TableCell>
                      <TableCell className="text-muted-foreground">{farm.area_hectares || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={farm.is_active ? "success" : "secondary"}>
                          {farm.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/farms/${farm.id}`}>
                              <Eye className="w-4 h-4" />
                              <span className="sr-only">View {farm.name}</span>
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}