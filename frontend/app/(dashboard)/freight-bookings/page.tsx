"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Truck, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function FreightBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    try {
      const { data } = await apiClient.get("/freight-bookings");
      setBookings(data || []);
    } catch (e) {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    CONFIRMED: "bg-green-100 text-green-700",
    REQUESTED: "bg-blue-100 text-blue-700",
    QUOTED: "bg-indigo-100 text-indigo-700",
    QUOTATION_PENDING: "bg-amber-100 text-amber-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-charcoal">Freight Bookings</h1>
          <p className="text-muted-foreground">Manage freight transportation requests and quotes.</p>
        </div>
        <Button className="bg-forest-800 text-white">
          <Plus className="w-4 h-4 mr-2" /> New Booking
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Booking ID</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Route</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Weight (kg)</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Pickup Date</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-muted-foreground">Loading bookings...</td></tr>
            ) : bookings.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-muted-foreground">No bookings found.</td></tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.booking_id} className="border-b border-border/40 hover:bg-white/40 transition-colors">
                  <td className="px-4 py-4 font-medium text-charcoal">{b.booking_id}</td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {b.pickup_city} → {b.destination_city}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{b.total_cargo_weight_kg}</td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {new Date(b.requested_pickup_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[b.status] || "bg-gray-100 text-gray-700"}`}>
                      {b.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/freight-bookings/${b.booking_id}`}>View</a>
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