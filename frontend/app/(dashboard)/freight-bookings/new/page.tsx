"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowLeft, PackageCheck, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface PurchaseOrder {
  id: string;
  order_id: string;
  produce_type: string;
  quantity_kg: number;
  delivery_address: string;
  delivery_city: string;
  delivery_state: string;
  status: string;
  batch_id?: string;
}

interface Batch {
  id: string;
  batch_id: string;
  produce_type: string;
  quantity_kg: number;
}

export default function NewFreightBookingPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [cargoQuantityKg, setCargoQuantityKg] = useState("");
  const [packageCount, setPackageCount] = useState("10");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCity, setPickupCity] = useState("Nashik");
  const [pickupState, setPickupState] = useState("Maharashtra");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationCity, setDestinationCity] = useState("Mumbai");
  const [destinationState, setDestinationState] = useState("Maharashtra");
  const [pickupDate, setPickupDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [preferredVehicle, setPreferredVehicle] = useState("REFRIGERATED_TRUCK");
  const [refrigerationRequired, setRefrigerationRequired] = useState(true);
  const [tempMin, setTempMin] = useState("2.0");
  const [tempMax, setTempMax] = useState("6.0");
  const [packagingDetails, setPackagingDetails] = useState("Crates on wooden pallets");
  const [specialInstructions, setSpecialInstructions] = useState("Pre-cool cargo to 4°C prior to loading");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [ordersRes, batchesRes] = await Promise.all([
          apiClient.get("/purchase-orders").catch(() => ({ data: [] })),
          apiClient.get("/batches").catch(() => ({ data: [] })),
        ]);

        const orderList = Array.isArray(ordersRes.data) ? ordersRes.data : [];
        setOrders(orderList);

        const batchList = Array.isArray(batchesRes.data) ? batchesRes.data : [];
        setBatches(batchList);

        if (orderList.length > 0) {
          const firstOrder = orderList[0];
          setSelectedOrderId(firstOrder.id);
          setCargoQuantityKg(String(firstOrder.quantity_kg || 1000));
          setDestinationAddress(firstOrder.delivery_address || "APMC Market Vashi");
          setDestinationCity(firstOrder.delivery_city || "Navi Mumbai");
          setDestinationState(firstOrder.delivery_state || "Maharashtra");
        }

        if (batchList.length > 0) {
          setSelectedBatchId(batchList[0].id);
        }

        // Set default dates
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setPickupDate(tomorrow.toISOString().split("T")[0]);

        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 4);
        setDeliveryDate(nextWeek.toISOString().split("T")[0]);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load purchase orders and batches");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      setCargoQuantityKg(String(order.quantity_kg));
      if (order.delivery_address) setDestinationAddress(order.delivery_address);
      if (order.delivery_city) setDestinationCity(order.delivery_city);
      if (order.delivery_state) setDestinationState(order.delivery_state);
      if (order.batch_id) setSelectedBatchId(order.batch_id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      toast.error("Please select a purchase order");
      return;
    }
    if (!selectedBatchId) {
      toast.error("Please select at least one produce batch");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        purchase_order_id: selectedOrderId,
        batch_ids: [selectedBatchId],
        cargo_quantity_kg: parseFloat(cargoQuantityKg) || 1000,
        total_cargo_weight_kg: parseFloat(cargoQuantityKg) || 1000,
        package_count: parseInt(packageCount) || 10,
        pickup_address: pickupAddress || "Farm Gate Hub 1",
        pickup_city: pickupCity || "Nashik",
        pickup_state: pickupState || "Maharashtra",
        destination_address: destinationAddress || "Wholesale Warehouse",
        destination_city: destinationCity || "Mumbai",
        destination_state: destinationState || "Maharashtra",
        requested_pickup_date: pickupDate,
        required_delivery_date: deliveryDate,
        preferred_vehicle_category: preferredVehicle,
        refrigeration_required: refrigerationRequired,
        temperature_min: refrigerationRequired ? parseFloat(tempMin) : undefined,
        temperature_max: refrigerationRequired ? parseFloat(tempMax) : undefined,
        packaging_details: packagingDetails,
        special_handling_instructions: specialInstructions,
      };

      const { data } = await apiClient.post("/freight-bookings", payload);
      toast.success("Freight booking created successfully");
      router.push(`/freight-bookings/${data.id || data.booking_id}`);
    } catch (err: any) {
      const message = err?.response?.data?.detail || "Failed to create freight booking";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/freight-bookings">
          <Button variant="ghost" size="icon" className="h-9 w-9 border border-input">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title="Create Freight Booking"
          description="Request freight logistics and open quotation bidding from certified transporters"
        />
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <Card className="p-12 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#173B2F] mb-4" />
          <p className="text-sm text-muted-foreground">Loading logistics options...</p>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">1. Order & Cargo Selection</CardTitle>
                <CardDescription>Link this booking with an accepted Purchase Order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Purchase Order *</label>
                  <Select value={selectedOrderId} onValueChange={handleOrderChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Purchase Order" />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map((po) => (
                        <SelectItem key={po.id} value={po.id}>
                          {po.order_id} ({po.produce_type} - {po.quantity_kg} kg)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Produce Batch *</label>
                  <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Cargo Batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {batches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.batch_id} ({b.produce_type} - {b.quantity_kg} kg)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Cargo Weight (kg) *</label>
                    <Input
                      type="number"
                      value={cargoQuantityKg}
                      onChange={(e) => setCargoQuantityKg(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Package Count *</label>
                    <Input
                      type="number"
                      value={packageCount}
                      onChange={(e) => setPackageCount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Preferred Vehicle Class</label>
                  <Select value={preferredVehicle} onValueChange={setPreferredVehicle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REFRIGERATED_TRUCK">Refrigerated Truck (Reefer)</SelectItem>
                      <SelectItem value="INSULATED_TRUCK">Insulated Truck</SelectItem>
                      <SelectItem value="NORMAL_CARGO_TRUCK">Normal Cargo Truck</SelectItem>
                      <SelectItem value="SMALL_DELIVERY_VEHICLE">Small Delivery Vehicle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">2. Transit Route & Schedule</CardTitle>
                <CardDescription>Specify origin, destination, and transit window</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Pickup Address *</label>
                  <Input
                    placeholder="e.g. Farm Gate Packhouse 3"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Pickup City *</label>
                    <Input value={pickupCity} onChange={(e) => setPickupCity(e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Pickup State *</label>
                    <Input value={pickupState} onChange={(e) => setPickupState(e.target.value)} required />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Destination Address *</label>
                  <Input
                    placeholder="e.g. Cold Hub Terminal 2"
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Destination City *</label>
                    <Input value={destinationCity} onChange={(e) => setDestinationCity(e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Destination State *</label>
                    <Input value={destinationState} onChange={(e) => setDestinationState(e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Pickup Date *</label>
                    <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Required Delivery Date *</label>
                    <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} required />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">3. Cold-Chain & Handling Specifications</CardTitle>
              <CardDescription>Define climate control requirements and safety guidelines</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="refrigeration_req"
                  checked={refrigerationRequired}
                  onChange={(e) => setRefrigerationRequired(e.target.checked)}
                  className="rounded border-input h-4 w-4 text-[#173B2F] focus:ring-[#173B2F]"
                />
                <label htmlFor="refrigeration_req" className="text-sm font-medium cursor-pointer">
                  Requires Active Cold-Chain Refrigeration
                </label>
              </div>

              {refrigerationRequired && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Minimum Temperature (°C)</label>
                    <Input type="number" step="0.5" value={tempMin} onChange={(e) => setTempMin(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Maximum Temperature (°C)</label>
                    <Input type="number" step="0.5" value={tempMax} onChange={(e) => setTempMax(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Packaging Details</label>
                  <Input
                    placeholder="e.g. Ventilated plastic crates, shrink-wrapped"
                    value={packagingDetails}
                    onChange={(e) => setPackagingDetails(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Special Handling Instructions</label>
                  <Input
                    placeholder="e.g. Avoid direct sunlight; calibrate sensors prior to departure"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Link href="/freight-bookings">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={submitting} className="bg-[#173B2F] hover:bg-[#102820] text-white">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Publish Booking Request
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

