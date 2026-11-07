# AgriChain Shipment Workflow

## Shipment Lifecycle States

```
BOOKING_REQUESTED → BOOKING_CONFIRMED → VEHICLE_ASSIGNED → DRIVER_ASSIGNED
    ↓                              ↓                    ↓              ↓
CANCELLED                    CANCELLED           LOADING          LOADING
                                                            ↓              ↓
                                                        LOADED         LOADED
                                                            ↓              ↓
                                                        DISPATCHED   DISPATCHED
                                                            ↓              ↓
                                                        IN_TRANSIT   IN_TRANSIT
                                                            ↓              ↓
                                                    AT_CHECKPOINT  AT_CHECKPOINT
                                                            ↓              ↓
                                                    ARRIVED_AT_DESTINATION
                                                            ↓
                                                    OUT_FOR_DELIVERY
                                                            ↓
                                                    DELIVERED / PARTIALLY_DELIVERED / DELIVERY_REJECTED
                                                            ↓
                                                        CANCELLED
```

## Exception Statuses (independent of lifecycle)

- DELAYED
- VEHICLE_BREAKDOWN
- TEMPERATURE_ALERT
- HUMIDITY_ALERT
- CARGO_DAMAGED
- ROUTE_DELAY
- DOCUMENTATION_ISSUE

A shipment can have an overall lifecycle status AND separate exception flags.

## Checkpoint Management

Each checkpoint contains:
- Checkpoint ID
- Shipment ID
- Checkpoint name
- City/location description
- Sequence number
- Arrival timestamp
- Departure timestamp
- Recorded by
- Notes
- Exception details

## Shipment Creation Flow

1. Purchase order is accepted by seller
2. Freight booking is created (linked to PO)
3. Transporter submits quotation
4. Buyer/seller accepts quotation → booking confirmed
5. Transporter creates shipment with vehicle and driver
6. Driver confirms loading → LOADED
7. Driver dispatches → DISPATCHED
8. Driver records checkpoints during transit
9. Driver arrives at destination
10. Buyer confirms delivery → DELIVERED

## Business Rules

- Shipment cannot be dispatched before loading is confirmed
- Shipment cannot be delivered before dispatch
- Cancelled shipment cannot continue through normal transitions
- Completed shipment cannot accept another dispatch event
- Delivery quantity cannot exceed quantity shipped
- Partial delivery preserves outstanding quantity
- Exceptions recorded with actor and timestamp
- Vehicle and driver cannot have conflicting active assignments

## Example Shipment ID

`SHIP-NAS-BLR-001`

Format: `SHIP-{pickup_state_code}-{destination_state_code}-{unique}`