export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface Farm {
  id: string;
  farmer_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  area_hectares?: number;
  certifications: string[];
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProduceItem {
  id: string;
  produce_type: string;
  name: string;
  category: string;
  unit: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  batch_id: string;
  produce_type: string;
  farmer_id: string;
  farm_id: string;
  harvest_date: string;
  harvest_location: string;
  initial_quantity_kg: number;
  available_quantity_kg: number;
  reserved_quantity_kg: number;
  dispatched_quantity_kg: number;
  accepted_quantity_kg: number;
  rejected_quantity_kg: number;
  quality_grade: string;
  packaging_type: string;
  estimated_shelf_life_end: string;
  handling_requirements?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: string;
  name: string;
  manager_id: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  capacity_kg: number;
  cold_storage_capacity_kg: number;
  temperature_range_min?: number;
  temperature_range_max?: number;
  has_refrigeration: boolean;
  certifications: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  produce_type: string;
  batch_id?: string;
  requested_quantity_kg: number;
  unit_price_paise: number;
  total_amount_paise: number;
  preferred_delivery_date: string;
  pickup_address: string;
  delivery_address: string;
  handling_requirements?: string;
  status: string;
  accepted_quantity_kg: number;
  fulfilled_quantity_kg: number;
  created_at: string;
  updated_at: string;
}

export interface FreightBooking {
  id: string;
  booking_id: string;
  purchase_order_id: string;
  batch_ids: string[];
  cargo_quantity_kg: number;
  total_cargo_weight_kg: number;
  package_count: number;
  pickup_address: string;
  pickup_city: string;
  pickup_state: string;
  destination_address: string;
  destination_city: string;
  destination_state: string;
  requested_pickup_date: string;
  required_delivery_date: string;
  preferred_vehicle_category: string;
  refrigeration_required: boolean;
  temperature_min?: number;
  temperature_max?: number;
  packaging_details?: string;
  special_handling_instructions?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Shipment {
  id: string;
  shipment_id: string;
  booking_id: string;
  purchase_order_id: string;
  farmer_id: string;
  buyer_id: string;
  transporter_id: string;
  vehicle_id: string;
  driver_id: string;
  batch_ids: string[];
  cargo_quantity_kg: number;
  total_cargo_weight_kg: number;
  package_count: number;
  pickup_address: string;
  pickup_city: string;
  pickup_state: string;
  destination_address: string;
  destination_city: string;
  destination_state: string;
  planned_dispatch_time?: string;
  expected_arrival_time?: string;
  actual_dispatch_time?: string;
  actual_arrival_time?: string;
  status: string;
  exception_flags: string[];
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  vehicle_id: string;
  transporter_id: string;
  registration_number: string;
  category: string;
  vehicle_type: string;
  max_payload_kg: number;
  available_capacity_kg: number;
  refrigeration_available: boolean;
  temperature_min?: number;
  temperature_max?: number;
  status: string;
  registration_expiry: string;
  insurance_expiry: string;
  fitness_expiry: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  driver_id: string;
  transporter_id: string;
  name: string;
  phone: string;
  email?: string;
  license_number: string;
  license_expiry: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  experience_years: number;
  status: string;
  current_assignment?: string;
  created_at: string;
  updated_at: string;
}

export interface Checkpoint {
  id: string;
  checkpoint_id: string;
  shipment_id: string;
  name: string;
  city: string;
  state: string;
  sequence: number;
  actual_arrival?: string;
  actual_departure?: string;
  status: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SensorReading {
  id: string;
  reading_id: string;
  session_id: string;
  shipment_id: string;
  simulated_device_id: string;
  temperature: number;
  humidity: number;
  timestamp: string;
  source: string;
  is_simulated: boolean;
  configured_temp_min?: number;
  configured_temp_max?: number;
  configured_humidity_min?: number;
  configured_humidity_max?: number;
  status: string;
  created_at: string;
}

export interface SensorAlert {
  id: string;
  alert_id: string;
  shipment_id: string;
  alert_type: string;
  severity: string;
  observed_value: number;
  configured_min?: number;
  configured_max?: number;
  status: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  corrective_action?: string;
  created_at: string;
  updated_at: string;
}

export interface LedgerBlock {
  id: string;
  index: number;
  block_id: string;
  timestamp: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  actor_id: string;
  actor_role: string;
  event_summary: string;
  payload_hash: string;
  previous_hash: string;
  hash: string;
  hash_algorithm: string;
  schema_version: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ApiError {
  error: string;
  details?: any;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface SensorScenarioConfig {
  value: string;
  label: string;
}