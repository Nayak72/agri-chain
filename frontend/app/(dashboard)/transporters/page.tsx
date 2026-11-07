"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Truck, Users } from "lucide-react";

export default function TransportersPage() {
  const [transporters, setTransporters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransporters();
  }, []);

  async function fetchTransporters() {
    try {
      const { data } = await apiClient.get("/transporters");
      setTransporters(data || []);
    } catch (e) {
      setTransporters([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-charcoal">Transporters</h1>
          <p className="text-muted-foreground">Manage transportation companies and their profiles.</p>
        </div>
        <Button className="bg-forest-800 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Transporter
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Transporter ID</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Company Name</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Approval</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : transporters.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No transporters found.</td></tr>
            ) : (
              transporters.map((t) => (
                <tr key={t.transporter_id} className="border-b border-border/40 hover:bg-white/40 transition-colors">
                  <td className="px-4 py-4 font-medium text-charcoal">{t.transporter_id}</td>
                  <td className="px-4 py-4 text-muted-foreground">{t.company_name}</td>
                  <td className="px-4 py-4 text-muted-foreground">{t.contact_person}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${t.approval_status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {t.approval_status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${t.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/transporters/${t.transporter_id}`}>View</a>
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