"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, ShieldCheck, ShieldAlert, Activity, Copy, ChevronRight, Eye, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle } from "lucide-react";

interface LedgerBlock {
  index: number;
  block_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  actor_id: string;
  actor_role: string;
  event_summary: string;
  payload_hash: string;
  previous_hash: string;
  hash: string;
  timestamp: string;
}

interface LedgerVerification {
  valid: boolean;
  total_blocks: number;
  verified_blocks: number;
  invalid_blocks: number;
  message?: string;
  first_invalid_block?: {
    index: number;
    expected_previous_hash: string;
    actual_previous_hash: string;
  };
}

export default function LedgerPage() {
  const [blocks, setBlocks] = useState<LedgerBlock[]>([]);
  const [verification, setVerification] = useState<LedgerVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedBlock, setSelectedBlock] = useState<LedgerBlock | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [bRes, vRes] = await Promise.all([
          apiClient.get("/ledger/blocks?page_size=50"),
          apiClient.get("/ledger/verify"),
        ]);
        setBlocks(bRes.data || []);
        setVerification(vRes.data);
        setError(null);
      } catch (e) {
        setError("Failed to load ledger data. Please try again.");
        setBlocks([]);
        setVerification({ valid: false, total_blocks: 0, verified_blocks: 0, invalid_blocks: 0, message: "Unable to verify" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchVerification = async () => {
    setVerificationLoading(true);
    try {
      const { data } = await apiClient.get("/ledger/verify");
      setVerification(data);
    } catch (e) {
      setVerification({ valid: false, total_blocks: 0, verified_blocks: 0, invalid_blocks: 0, message: "Unable to verify" });
    } finally {
      setVerificationLoading(false);
    }
  };

  const simulateTampering = (blockIndex: number) => {
    const block = blocks.find(b => b.index === blockIndex);
    if (!block) return;

    const tamperedSummary = "TAMPERED - Simulated demonstration only";
    const tamperedHash = "simulated_hash_mismatch_" + Date.now();

    setSelectedBlock({
      ...block,
      event_summary: tamperedSummary,
      hash: tamperedHash,
    });
  };

  const filteredBlocks = blocks.filter(block =>
    block.block_id.toLowerCase().includes(search.toLowerCase()) ||
    block.event_type.toLowerCase().includes(search.toLowerCase()) ||
    block.entity_type.toLowerCase().includes(search.toLowerCase()) ||
    block.actor_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ledger Explorer"
        description="SHA-256 hash-chained audit trail of all supply chain events."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchVerification} disabled={verificationLoading}>
              <ShieldCheck className="w-4 h-4 mr-2" />
              Verify Chain
            </Button>
            <Button variant="outline" size="sm" onClick={() => simulateTampering(0)}>
              <ShieldAlert className="w-4 h-4 mr-2" />
              Simulate Tampering
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

      {verification && !verification.valid && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-destructive/20 bg-destructive/5 p-4"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <h3 className="font-medium text-destructive">Ledger Integrity Check Failed</h3>
              <p className="text-sm text-destructive/80 mt-1">{verification.message}</p>
              {verification.first_invalid_block && (
                <div className="mt-2 text-xs text-destructive/80 bg-destructive/5 p-2 rounded font-mono">
                  First invalid block: {verification.first_invalid_block.index}<br />
                  Expected: {verification.first_invalid_block.expected_previous_hash?.substring(0, 16)}...<br />
                  Actual: {verification.first_invalid_block.actual_previous_hash?.substring(0, 16)}...
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <StaggerContainer>
        <StaggerItem delay={0}>
          <Card variant="metric">
            <CardHeader className="pb-2 flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Blocks</CardTitle>
              <Activity className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-bold text-foreground">{verification?.total_blocks || 0}</div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem delay={0.05}>
          <Card variant={verification?.valid ? "highlight" : "metric"}>
            <CardHeader className="pb-2 flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Chain Integrity</CardTitle>
              <ShieldCheck className={cn("w-5 h-5", verification?.valid ? "text-success" : "text-destructive")} />
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-serif font-bold", verification?.valid ? "text-success" : "text-destructive")}>
                {verification?.valid ? "VALID" : "INVALID"}
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem delay={0.1}>
          <Card variant="metric">
            <CardHeader className="pb-2 flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Verified Blocks</CardTitle>
              <CheckCircle className="w-5 h-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-bold text-foreground">{verification?.verified_blocks || 0}</div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem delay={0.15}>
          <Card variant="metric">
            <CardHeader className="pb-2 flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Invalid Blocks</CardTitle>
              <ShieldAlert className="w-5 h-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-bold text-foreground">{verification?.invalid_blocks || 0}</div>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Ledger Blocks</CardTitle>
              <CardDescription>Hash-chained audit trail of all supply chain events</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search blocks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 h-9 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <StaggerContainer>
                {[1, 2, 3, 4, 5].map((i) => (
                  <StaggerItem key={i} delay={i * 0.03}>
                    <div className="animate-pulse h-12 bg-muted rounded" />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          ) : filteredBlocks.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No ledger blocks found</h3>
              <p className="text-muted-foreground">The ledger is empty or no blocks match your search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Index</TableHead>
                    <TableHead className="w-48">Block ID</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead className="w-48">Hash</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBlocks.map((block) => (
                    <TableRow key={block.block_id}>
                      <TableCell className="font-mono text-xs text-foreground">{block.index}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{block.block_id}</TableCell>
                      <TableCell className="text-muted-foreground capitalize">{block.event_type.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-muted-foreground">{block.entity_type}</TableCell>
                      <TableCell className="text-muted-foreground">{block.actor_id} <Badge variant="outline" className="ml-1 text-xs">{block.actor_role}</Badge></TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{new Date(block.timestamp).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-foreground truncate max-w-[80px]">{block.hash.substring(0, 16)}...</span>
                          <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(block.hash)} aria-label="Copy hash">
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedBlock(block)}>
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => simulateTampering(block.index)}>
                            <ShieldAlert className="w-3 h-3 text-destructive" />
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

      <Dialog open={!!selectedBlock} onOpenChange={(open) => !open && setSelectedBlock(null)}>
        <DialogContent variant="large">
          <DialogHeader>
            <DialogTitle>Block Details</DialogTitle>
            <DialogDescription>Block #{selectedBlock?.index} - {selectedBlock?.block_id}</DialogDescription>
          </DialogHeader>
          <DialogContent className="max-h-[70vh] overflow-y-auto p-0">
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground">Event Type</p>
                  <p className="font-medium capitalize">{selectedBlock?.event_type.replace(/_/g, " ")}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground">Entity</p>
                  <p className="font-medium">{selectedBlock?.entity_type}: {selectedBlock?.entity_id}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground">Actor</p>
                  <p className="font-medium">{selectedBlock?.actor_id} ({selectedBlock?.actor_role})</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground">Timestamp</p>
                  <p className="font-medium font-mono text-xs">{selectedBlock ? new Date(selectedBlock.timestamp).toLocaleString() : "—"}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Event Summary</p>
                  <p className="font-medium">{selectedBlock?.event_summary}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Hash</p>
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg font-mono text-xs">
                    <span className="truncate">{selectedBlock?.hash}</span>
                    <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(selectedBlock?.hash || "")}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Previous Hash</p>
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg font-mono text-xs">
                    <span className="truncate">{selectedBlock?.previous_hash}</span>
                    <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(selectedBlock?.previous_hash || "")}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Payload Hash</p>
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg font-mono text-xs">
                    <span className="truncate">{selectedBlock?.payload_hash}</span>
                    <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(selectedBlock?.payload_hash || "")}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedBlock(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedBlock && selectedBlock.event_summary.includes("TAMPERED")} onOpenChange={(open) => !open && setSelectedBlock(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <DialogTitle>Tampering Detected (Simulation)</DialogTitle>
                <DialogDescription>This is a non-destructive demonstration of hash-chain verification</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-destructive/5 rounded-lg border border-destructive/20">
              <div>
                <p className="text-sm text-muted-foreground">Original Hash</p>
                <p className="font-mono text-xs text-foreground">{blocks.find(b => b.index === selectedBlock?.index)?.hash.substring(0, 32)}...</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tampered Hash</p>
                <p className="font-mono text-xs text-destructive">{selectedBlock?.hash.substring(0, 32)}...</p>
              </div>
            </div>
            <div className="p-4 bg-success/5 rounded-lg border border-success/20">
              <p className="text-sm text-success"><strong>Verification Result:</strong> Hash mismatch detected. The tampered block breaks the chain integrity.</p>
              <p className="text-xs text-muted-foreground mt-2">This is a simulation. The actual ledger has NOT been modified.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedBlock(null)}>Close</Button>
            <Button onClick={() => setSelectedBlock(null)}>Acknowledge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { cn } from "@/lib/utils";