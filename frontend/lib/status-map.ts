export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface StatusDefinition {
  label: string;
  tone: StatusTone;
}

export const statusMap: Record<string, StatusDefinition> = {
  BOOKING_REQUESTED: { label: "Booking requested", tone: "info" },
  BOOKING_CONFIRMED: { label: "Booking confirmed", tone: "success" },
  VEHICLE_ASSIGNED: { label: "Vehicle assigned", tone: "info" },
  DRIVER_ASSIGNED: { label: "Driver assigned", tone: "info" },
  LOADING: { label: "Loading", tone: "warning" },
  LOADED: { label: "Loaded", tone: "success" },
  DISPATCHED: { label: "Dispatched", tone: "info" },
  IN_TRANSIT: { label: "In transit", tone: "info" },
  AT_CHECKPOINT: { label: "At checkpoint", tone: "warning" },
  ARRIVED_AT_DESTINATION: { label: "Arrived", tone: "success" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", tone: "info" },
  DELIVERED: { label: "Delivered", tone: "success" },
  PARTIALLY_DELIVERED: { label: "Partially delivered", tone: "warning" },
  DELIVERY_REJECTED: { label: "Delivery rejected", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
  DELAYED: { label: "Delayed", tone: "warning" },
  PENDING: { label: "Pending", tone: "warning" },
  ACTIVE: { label: "Active", tone: "info" },
  ACKNOWLEDGED: { label: "Acknowledged", tone: "success" },
  RESOLVED: { label: "Resolved", tone: "success" },
  NORMAL: { label: "Normal", tone: "success" },
  WARNING: { label: "Warning", tone: "warning" },
  CRITICAL: { label: "Critical", tone: "danger" },
};
