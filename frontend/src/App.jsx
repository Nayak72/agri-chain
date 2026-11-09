import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/layout/AppShell'

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ForbiddenPage from './pages/ForbiddenPage'
import NotFoundPage from './pages/NotFoundPage'
import PlaceholderPage from './pages/PlaceholderPage'

// Agricultural Modules (Milestone 2)
import FarmsListPage from './pages/farms/FarmsListPage'
import FarmCreatePage from './pages/farms/FarmCreatePage'
import FarmDetailPage from './pages/farms/FarmDetailPage'

import ProduceListPage from './pages/produce/ProduceListPage'
import ProduceCreatePage from './pages/produce/ProduceCreatePage'
import ProduceDetailPage from './pages/produce/ProduceDetailPage'

import BatchesListPage from './pages/batches/BatchesListPage'
import BatchCreatePage from './pages/batches/BatchCreatePage'
import BatchDetailPage from './pages/batches/BatchDetailPage'

import WarehousesListPage from './pages/warehouses/WarehousesListPage'
import WarehouseCreatePage from './pages/warehouses/WarehouseCreatePage'
import WarehouseDetailPage from './pages/warehouses/WarehouseDetailPage'

import InventoryPage from './pages/inventory/InventoryPage'

// Commercial, Freight & Transportation (Milestone 3)
import OrdersListPage from './pages/orders/OrdersListPage'
import OrderCreatePage from './pages/orders/OrderCreatePage'
import OrderDetailPage from './pages/orders/OrderDetailPage'

import FreightBookingsListPage from './pages/freight/FreightBookingsListPage'
import FreightBookingCreatePage from './pages/freight/FreightBookingCreatePage'
import FreightBookingDetailPage from './pages/freight/FreightBookingDetailPage'
import FreightQuotesPage from './pages/freight/FreightQuotesPage'

import TransportersListPage from './pages/transporters/TransportersListPage'

import FleetListPage from './pages/fleet/FleetListPage'
import VehicleCreatePage from './pages/fleet/VehicleCreatePage'

import DriversListPage from './pages/drivers/DriversListPage'
import DriverCreatePage from './pages/drivers/DriverCreatePage'
import DriverDetailPage from './pages/drivers/DriverDetailPage'

import ShipmentsListPage from './pages/shipments/ShipmentsListPage'
import ShipmentCreatePage from './pages/shipments/ShipmentCreatePage'
import ShipmentDetailPage from './pages/shipments/ShipmentDetailPage'

import DeliveriesListPage from './pages/deliveries/DeliveriesListPage'

// Monitoring & Analytics (Milestone 4)
import ColdChainPage from './pages/monitoring/ColdChainPage'
import LedgerPage from './pages/monitoring/LedgerPage'
import AnalyticsPage from './pages/monitoring/AnalyticsPage'

// Admin & Governance (Milestone 5)
import UsersPage from './pages/admin/UsersPage'
import SettingsPage from './pages/admin/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

// Role constants
const ALL_ROLES = ['admin', 'farmer', 'warehouse_manager', 'transporter', 'driver', 'buyer']
const ADMIN_ONLY = ['admin']
const AGRI_ROLES = ['admin', 'farmer', 'warehouse_manager']
const COMMERCE_ROLES = ['admin', 'buyer', 'farmer']
const TRANSPORT_ROLES = ['admin', 'transporter', 'driver']

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Protected shell */}
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              {/* Dashboard */}
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Agriculture */}
              <Route path="/farms" element={
                <ProtectedRoute allowedRoles={['admin', 'farmer']}>
                  <FarmsListPage />
                </ProtectedRoute>
              } />
              <Route path="/farms/new" element={
                <ProtectedRoute allowedRoles={['admin', 'farmer']}>
                  <FarmCreatePage />
                </ProtectedRoute>
              } />
              <Route path="/farms/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'farmer']}>
                  <FarmDetailPage />
                </ProtectedRoute>
              } />

              <Route path="/produce" element={
                <ProtectedRoute allowedRoles={['admin', 'farmer', 'warehouse_manager', 'buyer']}>
                  <ProduceListPage />
                </ProtectedRoute>
              } />
              <Route path="/produce/new" element={
                <ProtectedRoute allowedRoles={['admin', 'farmer']}>
                  <ProduceCreatePage />
                </ProtectedRoute>
              } />
              <Route path="/produce/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'farmer', 'warehouse_manager', 'buyer']}>
                  <ProduceDetailPage />
                </ProtectedRoute>
              } />

              <Route path="/batches" element={
                <ProtectedRoute allowedRoles={['admin', 'farmer', 'warehouse_manager']}>
                  <BatchesListPage />
                </ProtectedRoute>
              } />
              <Route path="/batches/new" element={
                <ProtectedRoute allowedRoles={['admin', 'farmer']}>
                  <BatchCreatePage />
                </ProtectedRoute>
              } />
              <Route path="/batches/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'farmer', 'warehouse_manager']}>
                  <BatchDetailPage />
                </ProtectedRoute>
              } />

              {/* Warehouses & Inventory */}
              <Route path="/warehouses" element={
                <ProtectedRoute allowedRoles={['admin', 'warehouse_manager']}>
                  <WarehousesListPage />
                </ProtectedRoute>
              } />
              <Route path="/warehouses/new" element={
                <ProtectedRoute allowedRoles={['admin', 'warehouse_manager']}>
                  <WarehouseCreatePage />
                </ProtectedRoute>
              } />
              <Route path="/warehouses/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'warehouse_manager']}>
                  <WarehouseDetailPage />
                </ProtectedRoute>
              } />

              <Route path="/inventory" element={
                <ProtectedRoute allowedRoles={['admin', 'warehouse_manager']}>
                  <InventoryPage />
                </ProtectedRoute>
              } />

              {/* Commercial */}
              <Route path="/purchase-orders" element={
                <ProtectedRoute allowedRoles={['admin', 'buyer', 'farmer']}>
                  <OrdersListPage />
                </ProtectedRoute>
              } />
              <Route path="/purchase-orders/new" element={
                <ProtectedRoute allowedRoles={['admin', 'buyer']}>
                  <OrderCreatePage />
                </ProtectedRoute>
              } />
              <Route path="/purchase-orders/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'buyer', 'farmer']}>
                  <OrderDetailPage />
                </ProtectedRoute>
              } />

              <Route path="/freight-bookings" element={
                <ProtectedRoute allowedRoles={['admin', 'buyer', 'farmer']}>
                  <FreightBookingsListPage />
                </ProtectedRoute>
              } />
              <Route path="/freight-bookings/new" element={
                <ProtectedRoute allowedRoles={['admin', 'buyer', 'farmer']}>
                  <FreightBookingCreatePage />
                </ProtectedRoute>
              } />
              <Route path="/freight-bookings/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'buyer', 'farmer', 'transporter']}>
                  <FreightBookingDetailPage />
                </ProtectedRoute>
              } />

              <Route path="/freight-quotes" element={
                <ProtectedRoute allowedRoles={['admin', 'transporter']}>
                  <FreightQuotesPage />
                </ProtectedRoute>
              } />

              {/* Transport */}
              <Route path="/transporters" element={
                <ProtectedRoute allowedRoles={['admin', 'transporter']}>
                  <TransportersListPage />
                </ProtectedRoute>
              } />

              <Route path="/fleet" element={
                <ProtectedRoute allowedRoles={['admin', 'transporter']}>
                  <FleetListPage />
                </ProtectedRoute>
              } />
              <Route path="/fleet/new" element={
                <ProtectedRoute allowedRoles={['admin', 'transporter']}>
                  <VehicleCreatePage />
                </ProtectedRoute>
              } />

              <Route path="/drivers" element={
                <ProtectedRoute allowedRoles={['admin', 'transporter']}>
                  <DriversListPage />
                </ProtectedRoute>
              } />
              <Route path="/drivers/new" element={
                <ProtectedRoute allowedRoles={['admin', 'transporter']}>
                  <DriverCreatePage />
                </ProtectedRoute>
              } />
              <Route path="/drivers/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'transporter']}>
                  <DriverDetailPage />
                </ProtectedRoute>
              } />

              <Route path="/shipments" element={
                <ProtectedRoute allowedRoles={ALL_ROLES}>
                  <ShipmentsListPage />
                </ProtectedRoute>
              } />
              <Route path="/shipments/new" element={
                <ProtectedRoute allowedRoles={['admin', 'transporter']}>
                  <ShipmentCreatePage />
                </ProtectedRoute>
              } />
              <Route path="/shipments/:id" element={
                <ProtectedRoute allowedRoles={ALL_ROLES}>
                  <ShipmentDetailPage />
                </ProtectedRoute>
              } />

              <Route path="/deliveries" element={
                <ProtectedRoute allowedRoles={['admin', 'driver', 'buyer']}>
                  <DeliveriesListPage />
                </ProtectedRoute>
              } />
              <Route path="/deliveries/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'driver', 'buyer']}>
                  <DeliveriesListPage />
                </ProtectedRoute>
              } />

              {/* Monitoring */}
              <Route path="/cold-chain" element={
                <ProtectedRoute allowedRoles={ALL_ROLES}>
                  <ColdChainPage />
                </ProtectedRoute>
              } />

              <Route path="/ledger" element={
                <ProtectedRoute allowedRoles={ALL_ROLES}>
                  <LedgerPage />
                </ProtectedRoute>
              } />

              <Route path="/analytics" element={
                <ProtectedRoute allowedRoles={['admin', 'transporter', 'farmer', 'buyer']}>
                  <AnalyticsPage />
                </ProtectedRoute>
              } />

              {/* Admin */}
              <Route path="/users" element={
                <ProtectedRoute allowedRoles={ADMIN_ONLY}>
                  <UsersPage />
                </ProtectedRoute>
              } />
              <Route path="/users/:id" element={
                <ProtectedRoute allowedRoles={ADMIN_ONLY}>
                  <UsersPage />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute allowedRoles={ADMIN_ONLY}>
                  <SettingsPage />
                </ProtectedRoute>
              } />

              {/* Access denied */}
              <Route path="/forbidden" element={<ForbiddenPage />} />

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

