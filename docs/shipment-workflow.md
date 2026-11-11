# Shipment workflow

A confirmed freight booking and accepted quotation allow a transporter to create a shipment. Creation conditionally claims an available vehicle and driver, creates shipment items, and appends `SHIPMENT_CREATED` in one retrying MongoDB transaction. A concurrent claim on the same vehicle allows only one shipment to succeed.

```text
DRIVER_ASSIGNED → LOADED → DISPATCHED → IN_TRANSIT
                                      ↓
                          ARRIVED_AT_DESTINATION → OUT_FOR_DELIVERY
                                                       ├→ DELIVERED
                                                       ├→ PARTIALLY_DELIVERED
                                                       └→ DELIVERY_REJECTED
```

Cancellation is allowed from `DRIVER_ASSIGNED`, `LOADED`, `DISPATCHED`, or `IN_TRANSIT`. It releases the vehicle and driver; the accepted order's stock reservation remains in place for a replacement shipment. Dispatch sets actual dispatch and expected arrival from the accepted quote. Arrival sets actual arrival; `is_delayed` is computed as `actual_arrival_time > expected_arrival_time`.

Only the assigned driver can append a checkpoint while in transit. The record has name, city, timestamp, and actor. Checkpoints cannot be edited or deleted. The buyer alone confirms or rejects delivery from `OUT_FOR_DELIVERY`. Confirmation requires `delivered + damaged + missing = loaded` within 0.01 kg. The decision writes one report, finalizes the shipment and order, releases assets, and records `DELIVERY_CONFIRMED` or `DELIVERY_REJECTED` in one transaction.
