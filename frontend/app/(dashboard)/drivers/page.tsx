"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Users } from "lucide-react";

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrivers();
  }, []);

  async function fetchDrivers() {
    try {
      const { data } = await apiClient.get("/drivers");
      setDrivers(data || []);
    } catch (e) {
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-charcoal">Drivers</h1>
          <p className="text-muted-foreground">Manage driver profiles, licenses, and assignments.</p>
        </div>
        <Button className="bg-forest-800 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Driver
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Driver ID</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">License</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">License Expiry</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : drivers.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No drivers found.</td></tr>
            ) : (
              drivers.map((d) => (
                <tr key={d.driver_id} className="border-b border-border/40 hover:bg-white/40 transition-colors">
                  <td className="px-4 py-4 font-medium text-charcoal">{d.driver_id}</td>
                  <td className="px-4 py-4 text-muted-foreground">{d.name}</td>
                  <td className="px-4 py-4 text-muted-foreground">{d.license_number}</td>
                  <td className="px-4 py-4 text-muted-foreground">{new Date(d.license_expiry).toLocaleDateString()}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${d.status === "AVAILABLE" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/drivers/${d.driver_id}`}>View</a>
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