"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Package, Leaf, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/motion";
import { motion } from "framer-motion";
import { Skeleton, SkeletonTableRow, SkeletonCard } from "@/components/ui/skeleton";
import Link from "next/link";
import { Eye } from "lucide-react";
import { AlertCircle } from "lucide-react";

interface ProduceItem {
  id: string;
  produce_type: string;
  name: string;
  category: string;
  unit: string;
  is_active: boolean;
  created_at: string;
}

export default function ProducePage() {
  const [produce, setProduce] = useState<ProduceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  useEffect(() => {
    const fetchProduce = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get("/produce");
        setProduce(data || []);
        setError(null);
      } catch (e) {
        setError("Failed to load produce catalogue. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchProduce();
  }, []);

  const getCategoryIcon = (category: string) => {
    if (category === "FRUITS") return <Leaf className="w-5 h-5" />;
    if (category === "VEGETABLES") return <Truck className="w-5 h-5" />;
    return <Package className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produce Catalogue"
        description="Browse available fruits and vegetables."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewMode("grid")} className={viewMode === "grid" ? "bg-primary/10 border-primary/30 text-primary" : ""}>
              Grid
            </Button>
            <Button variant="outline" size="sm" onClick={() => setViewMode("table")} className={viewMode === "table" ? "bg-primary/10 border-primary/30 text-primary" : ""}>
              Table
            </Button>
            <Button asChild>
              <Link href="/produce/new">
                <Plus className="w-4 h-4 mr-2" />
                Add Produce
              </Link>
            </Button>
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

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            <StaggerContainer>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <StaggerItem key={i} delay={i * 0.03}>
                  <SkeletonCard />
                </StaggerItem>
              ))}
            </StaggerContainer>
          ) : produce.length === 0 ? (
            <div className="col-span-full p-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No produce found</h3>
              <p className="text-muted-foreground mb-6">Get started by adding your first produce item.</p>
              <Button asChild>
                <Link href="/produce/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Produce
                </Link>
              </Button>
            </div>
          ) : (
            produce.map((item, index) => (
              <FadeIn key={item.id} delay={index * 0.05}>
                <Card variant="interactive" className="p-6 h-full">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                    {getCategoryIcon(item.category)}
                  </div>
                  <h3 className="font-serif font-bold text-foreground mb-1">{item.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{item.category} • {item.unit}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">{item.produce_type}</Badge>
                    <Badge variant={item.is_active ? "success" : "secondary"}>
                      {item.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </Card>
              </FadeIn>
            ))
          )}
        </div>
      ) : (
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
            ) : produce.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No produce found</h3>
                <p className="text-muted-foreground mb-6">Get started by adding your first produce item.</p>
                <Button asChild>
                  <Link href="/produce/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Produce
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produce.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            {getCategoryIcon(item.category)}
                            {item.category}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                        <TableCell>
                          <Badge variant={item.is_active ? "success" : "secondary"}>
                            {item.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/produce/${item.id}`}>
                              <Eye className="w-4 h-4" />
                              <span className="sr-only">View {item.name}</span>
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}