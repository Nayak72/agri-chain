export const USER_ROLES = {
  ADMIN: "ADMIN",
  FARMER: "FARMER",
  WAREHOUSE_MANAGER: "WAREHOUSE_MANAGER",
  TRANSPORTER: "TRANSPORTER",
  DRIVER: "DRIVER",
  BUYER: "BUYER",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const PRODUCE_TYPES = {
  VEGETABLES: [
    { value: "TOMATO", label: "Tomato" },
    { value: "POTATO", label: "Potato" },
    { value: "ONION", label: "Onion" },
    { value: "CARROT", label: "Carrot" },
    { value: "CABBAGE", label: "Cabbage" },
    { value: "CAULIFLOWER", label: "Cauliflower" },
    { value: "SPINACH", label: "Spinach" },
    { value: "CUCUMBER", label: "Cucumber" },
    { value: "CAPSICUM", label: "Capsicum" },
    { value: "BRINJAL", label: "Brinjal" },
    { value: "GREEN_CHILLI", label: "Green Chilli" },
  ],
  FRUITS: [
    { value: "APPLE", label: "Apple" },
    { value: "BANANA", label: "Banana" },
    { value: "MANGO", label: "Mango" },
    { value: "GRAPES", label: "Grapes" },
    { value: "ORANGE", label: "Orange" },
    { value: "POMEGRANATE", label: "Pomegranate" },
    { value: "PAPAYA", label: "Papaya" },
    { value: "GUAVA", label: "Guava" },
    { value: "WATERMELON", label: "Watermelon" },
    { value: "PINEAPPLE", label: "Pineapple" },
  ],
} as const;

export const SHIPMENT_STATUSES = {
  BOOKING_REQUESTED: "Booking Requested",
  BOOKING_CONFIRMED: "Booking Confirmed",
  VEHICLE_ASSIGNED: "Vehicle Assigned",
  DRIVER_ASSIGNED: "Driver Assigned",
  LOADING: "Loading",
  LOADED: "Loaded",
  DISPATCHED: "Dispatched",
  IN_TRANSIT: "In Transit",
  AT_CHECKPOINT: "At Checkpoint",
  ARRIVED_AT_DESTINATION: "Arrived at Destination",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  PARTIALLY_DELIVERED: "Partially Delivered",
  DELIVERY_REJECTED: "Delivery Rejected",
  CANCELLED: "Cancelled",
} as const;

export const PURCHASE_ORDER_STATUSES = {
  DRAFT: "Draft",
  PLACED: "Placed",
  ACCEPTED: "Accepted",
  PARTIALLY_FULFILLED: "Partially Fulfilled",
  FULFILLED: "Fulfilled",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
} as const;

export const QUALITY_GRADES = {
  GRADE_A: "Grade A",
  GRADE_B: "Grade B",
  GRADE_C: "Grade C",
  REJECTED: "Rejected",
} as const;

export const INVENTORY_STATUSES = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  DISPATCHED: "Dispatched",
  DAMAGED: "Damaged",
  REJECTED: "Rejected",
} as const;

export const ALERT_SEVERITIES = {
  INFO: "Informational",
  WARNING: "Warning",
  CRITICAL: "Critical",
} as const;

export const ALERT_STATUSES = {
  ACTIVE: "Active",
  ACKNOWLEDGED: "Acknowledged",
  RESOLVED: "Resolved",
} as const;

export const VEHICLE_CATEGORIES = {
  REFRIGERATED_TRUCK: "Refrigerated Truck",
  INSULATED_TRUCK: "Insulated Truck",
  NORMAL_CARGO_TRUCK: "Normal Cargo Truck",
  SMALL_DELIVERY_VEHICLE: "Small Delivery Vehicle",
} as const;

export const SENSOR_SCENARIOS = {
  NORMAL: "Normal Conditions",
  TEMP_EXCURSION: "Temperature Excursion",
  HUMIDITY_EXCURSION: "Humidity Excursion",
  BOTH_EXCURSION: "Temperature & Humidity Excursion",
  FLUCTUATION: "Repeated Temperature Fluctuations",
  RECOVERY: "Recovery After Alert",
} as const;

export const FORMAT_CURRENCY = (paise: number): string => {
  const rupees = (paise / 100).toFixed(2);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(parseFloat(rupees));
};

export const FORMAT_DATE = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const FORMAT_DATETIME = (dateString: string): string => {
  return new Date(dateString).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};