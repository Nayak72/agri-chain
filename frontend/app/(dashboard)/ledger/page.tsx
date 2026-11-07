"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, ShieldCheck, ShieldAlert, Activity, Copy } from "lucide-react";

export default function LedgerPage() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchBlocks();
    fetchVerification();
  }, []);

  async function fetchBlocks() {
    try {
      const { data } = await apiClient.get("/ledger/blocks?page_size=20");
      setBlocks(data || []);
    } catch (e) {
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchVerification() {
    try {
      const { data } = await apiClient.get("/ledger/verify");
      setVerification(data);
    } catch (e) {
      setVerification({ valid: false, message: "Unable to verify" });
    }
  }

  async function simulateTampering(blockIndex: number) {
    const block = blocks.find(b => b.index === blockIndex);
    if (!block) return;

    const tamperedCopy = { ...block, event_summary: "TAMPERED - Simulated demonstration only" };
    const tamperedHash = "simulated_hash_mismatch";

    alert(
      `Tampering Simulation (Non-Destructive)\n\nBlock ${blockIndex}:\n- Original hash: ${block.hash.substring(0, 16)}...\n- Tampered hash: ${tamperedHash.substring(0, 16)}...\n- MISMATCH DETECTED!\n\nThis is a simulation. The real ledger has NOT been modified.\nChain verification would detect this as invalid.`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-charcoal">Ledger Explorer</h1>
          <p className="text-muted-foreground">SHA-256 hash-chained audit trail of all supply chain events.</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => simulateTampering(0)}
            variant="outline"
            size="sm"
          >
            <ShieldAlert className="w-4 h-4 mr-2" /> Simulate Tampering
          </Button>
          <Button onClick={fetchVerification} variant="outline" size="sm">
            <ShieldCheck className="w-4 h-4 mr-2" /> Verify Chain
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="glass-panel p-6">
          <div className="text-3xl font-serif font-bold text-charcoal">{verification?.total_blocks || 0}</div>
          <div className="text-xs text-muted-foreground mt-1">Total Blocks</div>
        </Card>
        <Card className="glass-panel p-6">
          <div className={`text-3xl font-serif font-bold ${verification?.valid ? "text-green-600" : "text-red-600"}`}>
            {verification?.valid ? "VALID" : "INVALID"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Chain Integrity</div>
        </Card>
        <Card className="glass-panel p-6">
          <div className="text-3xl font-serif font-bold text-charcoal">{verification?.verified_blocks || 0}</div>
          <div className="text-xs text-muted-foreground mt-1">Verified Blocks</div>
        </Card>
        <Card className="glass-panel p-6">
          <div className="text-3xl font-serif font-bold text-charcoal">{verification?.invalid_blocks || 0}</div>
          <div className="text-xs text-muted-foreground mt-1">Invalid Blocks</div>
        </Card>
      </div>

      {verification && !verification.valid && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">Ledger Integrity Check Failed</h3>
                <p className="text-sm text-red-700 mt-1">{verification.message}</p>
                {verification.first_invalid_block && (
                  <div className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded">
                    First invalid block: {verification.first_invalid_block.index}<br />
                    Expected hash: {verification.first_invalid_block.expected_previous_hash?.substring(0, 16)}...<br />
                    Actual hash: {verification.first_invalid_block.actual_previous_hash?.substring(0, 16)}...
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/50 sticky top-0">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Index</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Block ID</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Event</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Entity</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actor</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Timestamp</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Hash</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="p-8 text-center text-muted-foreground">Loading ledger blocks...</td></tr>
            ) : blocks.length === 0 ? (
              <tr><td colSpan="8" className="p-8 text-center text-muted-foreground">No ledger blocks found.</td></tr>
            ) : (
              blocks.map((b) => (
                <tr key={b.block_id} className="border-b border-border/40 hover:bg-white/40 transition-colors group">
                  <td className="px-4 py-4 font-mono text-xs text-charcoal">{b.index}</td>
                  <td className="px-4 py-4 font-mono text-xs text-muted-foreground">{b.block_id}</td>
                  <td className="px-4 py-4 text-muted-foreground capitalize">{b.event_type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-4 text-muted-foreground">{b.entity_type}</td>
                  <td className="px-4 py-4 text-muted-foreground">{b.actor_id}</td>
                  <td className="px-4 py-4 text-muted-foreground">{new Date(b.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-charcoal truncate w-24">{b.hash.substring(0, 16)}...</span>
                      <button className="text-muted-foreground hover:text-forest-800" title="Copy hash">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Button size="sm" variant="outline">
                      View
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}