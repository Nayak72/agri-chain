from enum import Enum


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    FARMER = "FARMER"
    WAREHOUSE_MANAGER = "WAREHOUSE_MANAGER"
    TRANSPORTER = "TRANSPORTER"
    DRIVER = "DRIVER"
    BUYER = "BUYER"


class ProduceCategory(str, Enum):
    VEGETABLE = "VEGETABLE"
    FRUIT = "FRUIT"


class ProduceType(str, Enum):
    TOMATO = "TOMATO"
    POTATO = "POTATO"
    ONION = "ONION"
    CARROT = "CARROT"
    CABBAGE = "CABBAGE"
    CAULIFLOWER = "CAULIFLOWER"
    SPINACH = "SPINACH"
    CUCUMBER = "CUCUMBER"
    CAPSICUM = "CAPSICUM"
    BRINJAL = "BRINJAL"
    GREEN_CHILLI = "GREEN_CHILLI"
    APPLE = "APPLE"
    BANANA = "BANANA"
    MANGO = "MANGO"
    GRAPES = "GRAPES"
    ORANGE = "ORANGE"
    POMEGRANATE = "POMEGRANATE"
    PAPAYA = "PAPAYA"
    GUAVA = "GUAVA"
    WATERMELON = "WATERMELON"
    PINEAPPLE = "PINEAPPLE"


class QualityGrade(str, Enum):
    GRADE_A = "GRADE_A"
    GRADE_B = "GRADE_B"
    GRADE_C = "GRADE_C"
    REJECTED = "REJECTED"


class PackagingType(str, Enum):
    CRATE = "CRATE"
    BOX = "BOX"
    BAG = "BAG"
    LOOSE = "LOOSE"
    PALLET = "PALLET"


class BatchStatus(str, Enum):
    CREATED = "CREATED"
    HARVESTED = "HARVESTED"
    AT_WAREHOUSE = "AT_WAREHOUSE"
    INSPECTED = "INSPECTED"
    PACKAGED = "PACKAGED"
    DISPATCHED = "DISPATCHED"
    DELIVERED = "DELIVERED"
    REJECTED = "REJECTED"


class WarehouseReceiptStatus(str, Enum):
    PENDING = "PENDING"
    RECEIVED = "RECEIVED"
    REJECTED = "REJECTED"


class InspectionResult(str, Enum):
    PASSED = "PASSED"
    FAILED = "FAILED"


class InventoryStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    RESERVED = "RESERVED"
    DISPATCHED = "DISPATCHED"
    DAMAGED = "DAMAGED"
    REJECTED = "REJECTED"


class PurchaseOrderStatus(str, Enum):
    PLACED = "PLACED"
    ACCEPTED = "ACCEPTED"
    FULFILLED = "FULFILLED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"


class FreightBookingStatus(str, Enum):
    REQUESTED = "REQUESTED"
    QUOTATION_PENDING = "QUOTATION_PENDING"
    QUOTED = "QUOTED"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"


class VehicleCategory(str, Enum):
    REFRIGERATED_TRUCK = "REFRIGERATED_TRUCK"
    INSULATED_TRUCK = "INSULATED_TRUCK"
    NORMAL_CARGO_TRUCK = "NORMAL_CARGO_TRUCK"
    SMALL_DELIVERY_VEHICLE = "SMALL_DELIVERY_VEHICLE"


class VehicleType(str, Enum):
    TRUCK_10T = "10T_TRUCK"
    TRUCK_15T = "15T_TRUCK"
    TRUCK_20T = "20T_TRUCK"
    TRUCK_25T = "25T_TRUCK"
    PICKUP_1T = "1T_PICKUP"
    PICKUP_2T = "2T_PICKUP"
    VAN = "VAN"


class VehicleStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    ASSIGNED = "ASSIGNED"
    MAINTENANCE = "MAINTENANCE"
    RETIRED = "RETIRED"


class DriverStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    ASSIGNED = "ASSIGNED"
    ON_LEAVE = "ON_LEAVE"
    SUSPENDED = "SUSPENDED"


class ShipmentStatus(str, Enum):
    DRIVER_ASSIGNED = "DRIVER_ASSIGNED"
    LOADED = "LOADED"
    DISPATCHED = "DISPATCHED"
    IN_TRANSIT = "IN_TRANSIT"
    ARRIVED_AT_DESTINATION = "ARRIVED_AT_DESTINATION"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    DELIVERED = "DELIVERED"
    PARTIALLY_DELIVERED = "PARTIALLY_DELIVERED"
    DELIVERY_REJECTED = "DELIVERY_REJECTED"
    CANCELLED = "CANCELLED"


class SensorScenario(str, Enum):
    NORMAL = "NORMAL"
    TEMP_EXCURSION = "TEMP_EXCURSION"


class SensorStatus(str, Enum):
    NORMAL = "NORMAL"
    CRITICAL = "CRITICAL"


class AlertSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class AlertStatus(str, Enum):
    ACTIVE = "ACTIVE"
    RESOLVED = "RESOLVED"


class DeliveryStatus(str, Enum):
    PENDING = "PENDING"
    DELIVERED = "DELIVERED"
    PARTIAL = "PARTIAL"
    REJECTED = "REJECTED"


class LedgerEventType(str, Enum):
    USER_APPROVED = "USER_APPROVED"
    PRODUCE_BATCH_CREATED = "PRODUCE_BATCH_CREATED"
    WAREHOUSE_RECEIVED = "WAREHOUSE_RECEIVED"
    PURCHASE_ORDER_CREATED = "PURCHASE_ORDER_CREATED"
    PURCHASE_ORDER_ACCEPTED = "PURCHASE_ORDER_ACCEPTED"
    PURCHASE_ORDER_REJECTED = "PURCHASE_ORDER_REJECTED"
    FREIGHT_BOOKING_CREATED = "FREIGHT_BOOKING_CREATED"
    FREIGHT_QUOTATION_ACCEPTED = "FREIGHT_QUOTATION_ACCEPTED"
    SHIPMENT_CREATED = "SHIPMENT_CREATED"
    CARGO_LOADED = "CARGO_LOADED"
    SHIPMENT_IN_TRANSIT = "SHIPMENT_IN_TRANSIT"
    CHECKPOINT_RECORDED = "CHECKPOINT_RECORDED"
    SHIPMENT_ARRIVED = "SHIPMENT_ARRIVED"
    SENSOR_ALERT_RAISED = "SENSOR_ALERT_RAISED"
    SENSOR_ALERT_RESOLVED = "SENSOR_ALERT_RESOLVED"
    DELIVERY_CONFIRMED = "DELIVERY_CONFIRMED"
    DELIVERY_REJECTED = "DELIVERY_REJECTED"
    SHIPMENT_CANCELLED = "SHIPMENT_CANCELLED"


PRODUCE_HANDLING_PROFILES = {
    ProduceType.TOMATO: {
        "min_temp_c": 7, "max_temp_c": 13,
        "min_humidity_pct": 85, "max_humidity_pct": 95,
        "shelf_life_days": 14,
        "special_handling": "Chilling sensitive below 7°C"
    },
    ProduceType.POTATO: {
        "min_temp_c": 7, "max_temp_c": 10,
        "min_humidity_pct": 85, "max_humidity_pct": 95,
        "shelf_life_days": 180,
        "special_handling": "Avoid light exposure"
    },
    ProduceType.ONION: {
        "min_temp_c": 0, "max_temp_c": 4,
        "min_humidity_pct": 65, "max_humidity_pct": 75,
        "shelf_life_days": 180,
        "special_handling": "Good ventilation required"
    },
    ProduceType.CARROT: {
        "min_temp_c": 0, "max_temp_c": 2,
        "min_humidity_pct": 95, "max_humidity_pct": 100,
        "shelf_life_days": 120,
        "special_handling": "Remove tops before storage"
    },
    ProduceType.CABBAGE: {
        "min_temp_c": 0, "max_temp_c": 2,
        "min_humidity_pct": 95, "max_humidity_pct": 100,
        "shelf_life_days": 90,
        "special_handling": "Handle gently to avoid bruising"
    },
    ProduceType.CAULIFLOWER: {
        "min_temp_c": 0, "max_temp_c": 2,
        "min_humidity_pct": 95, "max_humidity_pct": 100,
        "shelf_life_days": 21,
        "special_handling": "Highly perishable, rapid cooling required"
    },
    ProduceType.SPINACH: {
        "min_temp_c": 0, "max_temp_c": 2,
        "min_humidity_pct": 95, "max_humidity_pct": 100,
        "shelf_life_days": 10,
        "special_handling": "Extremely perishable, keep moist"
    },
    ProduceType.CUCUMBER: {
        "min_temp_c": 10, "max_temp_c": 13,
        "min_humidity_pct": 85, "max_humidity_pct": 95,
        "shelf_life_days": 14,
        "special_handling": "Chilling sensitive below 10°C"
    },
    ProduceType.CAPSICUM: {
        "min_temp_c": 7, "max_temp_c": 10,
        "min_humidity_pct": 85, "max_humidity_pct": 95,
        "shelf_life_days": 21,
        "special_handling": "Chilling sensitive below 7°C"
    },
    ProduceType.BRINJAL: {
        "min_temp_c": 10, "max_temp_c": 13,
        "min_humidity_pct": 85, "max_humidity_pct": 95,
        "shelf_life_days": 14,
        "special_handling": "Chilling sensitive below 10°C"
    },
    ProduceType.GREEN_CHILLI: {
        "min_temp_c": 7, "max_temp_c": 10,
        "min_humidity_pct": 85, "max_humidity_pct": 95,
        "shelf_life_days": 14,
        "special_handling": "Chilling sensitive below 7°C"
    },
    ProduceType.APPLE: {
        "min_temp_c": -1, "max_temp_c": 1,
        "min_humidity_pct": 90, "max_humidity_pct": 95,
        "shelf_life_days": 180,
        "special_handling": "Ethylene producer, separate from sensitive items"
    },
    ProduceType.BANANA: {
        "min_temp_c": 13, "max_temp_c": 15,
        "min_humidity_pct": 85, "max_humidity_pct": 95,
        "shelf_life_days": 21,
        "special_handling": "Chilling sensitive below 13°C, ethylene producer"
    },
    ProduceType.MANGO: {
        "min_temp_c": 10, "max_temp_c": 13,
        "min_humidity_pct": 85, "max_humidity_pct": 95,
        "shelf_life_days": 21,
        "special_handling": "Chilling sensitive below 10°C"
    },
    ProduceType.GRAPES: {
        "min_temp_c": -1, "max_temp_c": 1,
        "min_humidity_pct": 90, "max_humidity_pct": 95,
        "shelf_life_days": 56,
        "special_handling": "Handle gently, SO2 pads for long storage"
    },
    ProduceType.ORANGE: {
        "min_temp_c": 4, "max_temp_c": 7,
        "min_humidity_pct": 85, "max_humidity_pct": 95,
        "shelf_life_days": 56,
        "special_handling": "Good ventilation required"
    },
    ProduceType.POMEGRANATE: {
        "min_temp_c": 5, "max_temp_c": 7,
        "min_humidity_pct": 85, "max_humidity_pct": 95,
        "shelf_life_days": 84,
        "special_handling": "Handle gently to avoid bruising"
    },
    ProduceType.PAPAYA: {
        "min_temp_c": 7, "max_temp_c": 10,
        "min_humidity_pct": 85, "max_humidity_pct": 95,
        "shelf_life_days": 14,
        "special_handling": "Chilling sensitive below 7°C"
    },
    ProduceType.GUAVA: {
        "min_temp_c": 5, "max_temp_c": 8,
        "min_humidity_pct": 85, "max_humidity_pct": 95,
        "shelf_life_days": 14,
        "special_handling": "Consume soon after ripening"
    },
    ProduceType.WATERMELON: {
        "min_temp_c": 10, "max_temp_c": 15,
        "min_humidity_pct": 85, "max_humidity_pct": 95,
        "shelf_life_days": 21,
        "special_handling": "Chilling sensitive below 10°C"
    },
    ProduceType.PINEAPPLE: {
        "min_temp_c": 7, "max_temp_c": 10,
        "min_humidity_pct": 85, "max_humidity_pct": 95,
        "shelf_life_days": 21,
        "special_handling": "Chilling sensitive below 7°C"
    },
}

VEHICLE_CAPACITY_KG = {
    VehicleType.TRUCK_10T: 10000,
    VehicleType.TRUCK_15T: 15000,
    VehicleType.TRUCK_20T: 20000,
    VehicleType.TRUCK_25T: 25000,
    VehicleType.PICKUP_1T: 1000,
    VehicleType.PICKUP_2T: 2000,
    VehicleType.VAN: 1500,
}

VEHICLE_REFRIGERATION = {
    VehicleCategory.REFRIGERATED_TRUCK: True,
    VehicleCategory.INSULATED_TRUCK: True,
    VehicleCategory.NORMAL_CARGO_TRUCK: False,
    VehicleCategory.SMALL_DELIVERY_VEHICLE: False,
}

VEHICLE_TEMP_RANGES = {
    VehicleCategory.REFRIGERATED_TRUCK: (-20, 20),
    VehicleCategory.INSULATED_TRUCK: (0, 15),
    VehicleCategory.NORMAL_CARGO_TRUCK: None,
    VehicleCategory.SMALL_DELIVERY_VEHICLE: None,
}
