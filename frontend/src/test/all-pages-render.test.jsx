import React from 'react'
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AuthContext from '../context/AuthContext'

// Import all pages to verify there are zero ReferenceErrors across the entire application
import DashboardPage from '../pages/DashboardPage'
import LoginPage from '../pages/LoginPage'
import ForbiddenPage from '../pages/ForbiddenPage'
import NotFoundPage from '../pages/NotFoundPage'
import ColdChainPage from '../pages/monitoring/ColdChainPage'
import LedgerPage from '../pages/monitoring/LedgerPage'
import AnalyticsPage from '../pages/monitoring/AnalyticsPage'
import FarmsListPage from '../pages/farms/FarmsListPage'
import FarmCreatePage from '../pages/farms/FarmCreatePage'
import FarmDetailPage from '../pages/farms/FarmDetailPage'
import ProduceListPage from '../pages/produce/ProduceListPage'
import ProduceCreatePage from '../pages/produce/ProduceCreatePage'
import ProduceDetailPage from '../pages/produce/ProduceDetailPage'
import BatchesListPage from '../pages/batches/BatchesListPage'
import BatchCreatePage from '../pages/batches/BatchCreatePage'
import BatchDetailPage from '../pages/batches/BatchDetailPage'
import WarehousesListPage from '../pages/warehouses/WarehousesListPage'
import WarehouseCreatePage from '../pages/warehouses/WarehouseCreatePage'
import WarehouseDetailPage from '../pages/warehouses/WarehouseDetailPage'
import InventoryPage from '../pages/inventory/InventoryPage'
import OrdersListPage from '../pages/orders/OrdersListPage'
import OrderCreatePage from '../pages/orders/OrderCreatePage'
import OrderDetailPage from '../pages/orders/OrderDetailPage'
import FreightBookingsListPage from '../pages/freight/FreightBookingsListPage'
import FreightBookingCreatePage from '../pages/freight/FreightBookingCreatePage'
import FreightBookingDetailPage from '../pages/freight/FreightBookingDetailPage'
import FreightQuotesPage from '../pages/freight/FreightQuotesPage'
import TransportersListPage from '../pages/transporters/TransportersListPage'
import FleetListPage from '../pages/fleet/FleetListPage'
import VehicleCreatePage from '../pages/fleet/VehicleCreatePage'
import DriversListPage from '../pages/drivers/DriversListPage'
import DriverCreatePage from '../pages/drivers/DriverCreatePage'
import DriverDetailPage from '../pages/drivers/DriverDetailPage'
import ShipmentsListPage from '../pages/shipments/ShipmentsListPage'
import ShipmentCreatePage from '../pages/shipments/ShipmentCreatePage'
import ShipmentDetailPage from '../pages/shipments/ShipmentDetailPage'
import DeliveriesListPage from '../pages/deliveries/DeliveriesListPage'
import DeliveryDetailPage from '../pages/deliveries/DeliveryDetailPage'
import UsersPage from '../pages/admin/UsersPage'
import UserDetailPage from '../pages/admin/UserDetailPage'
import SettingsPage from '../pages/admin/SettingsPage'

beforeAll(() => {
  if (typeof global.ResizeObserver === 'undefined') {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const mockAuthValue = {
  user: { id: 'usr-admin-1', email: 'admin@agrichain.com', role: 'ADMIN', full_name: 'Admin Governance' },
  can: () => true,
}

function renderPage(Component, initialPath = '/') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="*" element={<Component />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

describe('Full Application Page Component Smoke Audit', () => {
  const pages = [
    { name: 'DashboardPage', component: DashboardPage },
    { name: 'LoginPage', component: LoginPage },
    { name: 'ForbiddenPage', component: ForbiddenPage },
    { name: 'NotFoundPage', component: NotFoundPage },
    { name: 'ColdChainPage', component: ColdChainPage },
    { name: 'LedgerPage', component: LedgerPage },
    { name: 'AnalyticsPage', component: AnalyticsPage },
    { name: 'FarmsListPage', component: FarmsListPage },
    { name: 'FarmCreatePage', component: FarmCreatePage },
    { name: 'FarmDetailPage', component: FarmDetailPage },
    { name: 'ProduceListPage', component: ProduceListPage },
    { name: 'ProduceCreatePage', component: ProduceCreatePage },
    { name: 'ProduceDetailPage', component: ProduceDetailPage },
    { name: 'BatchesListPage', component: BatchesListPage },
    { name: 'BatchCreatePage', component: BatchCreatePage },
    { name: 'BatchDetailPage', component: BatchDetailPage },
    { name: 'WarehousesListPage', component: WarehousesListPage },
    { name: 'WarehouseCreatePage', component: WarehouseCreatePage },
    { name: 'WarehouseDetailPage', component: WarehouseDetailPage },
    { name: 'InventoryPage', component: InventoryPage },
    { name: 'OrdersListPage', component: OrdersListPage },
    { name: 'OrderCreatePage', component: OrderCreatePage },
    { name: 'OrderDetailPage', component: OrderDetailPage },
    { name: 'FreightBookingsListPage', component: FreightBookingsListPage },
    { name: 'FreightBookingCreatePage', component: FreightBookingCreatePage },
    { name: 'FreightBookingDetailPage', component: FreightBookingDetailPage },
    { name: 'FreightQuotesPage', component: FreightQuotesPage },
    { name: 'TransportersListPage', component: TransportersListPage },
    { name: 'FleetListPage', component: FleetListPage },
    { name: 'VehicleCreatePage', component: VehicleCreatePage },
    { name: 'DriversListPage', component: DriversListPage },
    { name: 'DriverCreatePage', component: DriverCreatePage },
    { name: 'DriverDetailPage', component: DriverDetailPage },
    { name: 'ShipmentsListPage', component: ShipmentsListPage },
    { name: 'ShipmentCreatePage', component: ShipmentCreatePage },
    { name: 'ShipmentDetailPage', component: ShipmentDetailPage },
    { name: 'DeliveriesListPage', component: DeliveriesListPage },
    { name: 'DeliveryDetailPage', component: DeliveryDetailPage },
    { name: 'UsersPage', component: UsersPage },
    { name: 'UserDetailPage', component: UserDetailPage },
    { name: 'SettingsPage', component: SettingsPage },
  ]

  pages.forEach(({ name, component: Component }) => {
    it(`renders ${name} without ReferenceError or lifecycle crashes`, () => {
      const { container } = renderPage(Component)
      expect(container).toBeInTheDocument()
    })
  })
})

