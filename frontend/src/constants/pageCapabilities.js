import { matchPath } from 'react-router-dom'

// More specific paths come first; values are capabilities issued by /auth/me.
const pages = [
  ['/dashboard', 'dashboard'],
  ['/farms/new', 'farm-create'], ['/farms/:id', 'farm-detail'], ['/farms', 'farms'],
  ['/produce/new', 'produce-create'], ['/produce/:id', 'produce'], ['/produce', 'produce'],
  ['/batches/new', 'batch-create'], ['/batches/:id', 'batches'], ['/batches', 'batches'],
  ['/warehouses/new', 'warehouse-create'], ['/warehouses/:id', 'warehouses'], ['/warehouses', 'warehouses'],
  ['/inventory', 'inventory'],
  ['/purchase-orders/new', 'order-create'], ['/purchase-orders/:id', 'orders'], ['/purchase-orders', 'orders'],
  ['/freight-bookings/new', 'booking-create'], ['/freight-bookings/:id', 'bookings'], ['/freight-bookings', 'bookings'],
  ['/freight-quotes', 'quotes'], ['/transporters', 'transporters'],
  ['/fleet/new', 'fleet'], ['/fleet', 'fleet'], ['/drivers/new', 'drivers'], ['/drivers/:id', 'drivers'], ['/drivers', 'drivers'],
  ['/shipments/new', 'shipment-create'], ['/shipments/:id', 'shipments'], ['/shipments', 'shipments'],
  ['/deliveries/:id', 'deliveries'], ['/deliveries', 'deliveries'], ['/cold-chain', 'cold-chain'],
  ['/ledger', 'ledger'], ['/analytics', 'analytics'], ['/users/:id', 'users'], ['/users', 'users'], ['/settings', 'settings'],
]

export function pageCapabilityForPath(pathname) {
  const page = pages.find(([path]) => matchPath({ path, end: true }, pathname))
  return page ? `page:${page[1]}` : null
}
