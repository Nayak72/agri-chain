# AgriChain API Documentation

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication

All protected endpoints require a Bearer JWT token in the `Authorization` header.

```
Authorization: Bearer <access_token>
```

## Endpoints Summary

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/register | Register new user | No |
| POST | /auth/login | Login and get tokens | No |
| POST | /auth/refresh | Refresh access token | No |
| POST | /auth/logout | Logout | Yes |
| GET | /auth/me | Get current user | Yes |

### Users (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /users | List all users |
| GET | /users/{id} | Get user by ID |
| PATCH | /users/{id} | Update user |
| POST | /users/{id}/approve | Approve user |
| POST | /users/{id}/suspend | Suspend user |

### Farms
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /farms | Create farm |
| GET | /farms | List farms |
| GET | /farms/{id} | Get farm |
| PATCH | /farms/{id} | Update farm |

### Produce Catalogue
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /produce | List produce |
| POST | /produce | Create produce (admin) |
| GET | /produce/{id} | Get produce |
| PATCH | /produce/{id} | Update produce (admin) |

### Batches
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /batches | Create batch |
| GET | /batches | List batches |
| GET | /batches/{id} | Get batch |
| PATCH | /batches/{id} | Update batch |
| GET | /batches/{id}/history | Batch ledger history |

### Warehouses
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /warehouses | Create warehouse |
| GET | /warehouses | List warehouses |
| GET | /warehouses/{id} | Get warehouse |
| PATCH | /warehouses/{id} | Update warehouse |

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /warehouses/{id}/receipts | Create receipt |
| POST | /quality-inspections | Create inspection |
| GET | /inventory | List inventory |
| GET | /inventory/movements | List movements |
| POST | /inventory/movements | Create movement |

### Purchase Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /purchase-orders | Create order |
| GET | /purchase-orders | List orders |
| GET | /purchase-orders/{id} | Get order |
| POST | /purchase-orders/{id}/accept | Accept order |
| POST | /purchase-orders/{id}/reject | Reject order |
| POST | /purchase-orders/{id}/cancel | Cancel order |

### Freight Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /freight-bookings | Create booking |
| GET | /freight-bookings | List bookings |
| GET | /freight-bookings/{id} | Get booking |

### Freight Quotations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /freight-quotes | Create quotation |
| GET | /freight-quotes | List quotations |
| GET | /freight-quotes/{id} | Get quotation |
| POST | /freight-quotes/{id}/accept | Accept quotation |

### Vehicles
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /vehicles | Create vehicle |
| GET | /vehicles | List vehicles |
| GET | /vehicles/{id} | Get vehicle |
| PATCH | /vehicles/{id} | Update vehicle |

### Drivers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /drivers | Create driver |
| GET | /drivers | List drivers |
| GET | /drivers/{id} | Get driver |
| PATCH | /drivers/{id} | Update driver |

### Shipments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /shipments | Create shipment |
| GET | /shipments | List shipments |
| GET | /shipments/{id} | Get shipment |
| PATCH | /shipments/{id} | Update shipment |
| POST | /shipments/{id}/assign-vehicle | Assign vehicle |
| POST | /shipments/{id}/assign-driver | Assign driver |
| POST | /shipments/{id}/load | Load shipment |
| POST | /shipments/{id}/dispatch | Dispatch shipment |
| POST | /shipments/{id}/checkpoints | Record checkpoint |
| POST | /shipments/{id}/report-exception | Report exception |
| GET | /shipments/{id}/timeline | Get timeline |

### Sensors
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /sensors/shipments/{id}/simulation/start | Start simulation |
| POST | /sensors/shipments/{id}/simulation/pause | Pause simulation |
| POST | /sensors/shipments/{id}/simulation/resume | Resume simulation |
| POST | /sensors/shipments/{id}/simulation/stop | Stop simulation |
| POST | /sensors/shipments/{id}/simulation/next-reading | Next reading |
| GET | /sensors/shipments/{id}/sensor-readings | List readings |
| GET | /sensors/shipments/{id}/sensor-alerts | List alerts |
| POST | /sensors/sensor-alerts/{id}/acknowledge | Acknowledge alert |
| POST | /sensors/sensor-alerts/{id}/resolve | Resolve alert |

### Delivery
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /delivery/shipments/{id}/delivery-report | Create report |
| GET | /delivery/shipments/{id}/delivery-report | Get report |
| POST | /delivery/shipments/{id}/confirm-delivery | Confirm |
| POST | /delivery/shipments/{id}/reject-delivery | Reject |
| POST | /delivery/shipments/{id}/partial-delivery | Partial |

### Ledger
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /ledger/blocks | List blocks |
| GET | /ledger/blocks/{index} | Get block |
| GET | /ledger/verify | Verify chain |
| GET | /ledger/verify/{type}/{id} | Verify entity |
| GET | /ledger/entities/{type}/{id} | Entity history |
| GET | /ledger/statistics | Ledger stats |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /analytics/dashboard | Dashboard metrics |
| GET | /analytics/shipments | Shipment analytics |
| GET | /analytics/freight | Freight analytics |
| GET | /analytics/fleet | Fleet analytics |
| GET | /analytics/quality | Quality analytics |
| GET | /analytics/cold-chain | Cold-chain analytics |

## Interactive Documentation

Swagger UI: http://localhost:8000/docs
ReDoc: http://localhost:8000/redoc