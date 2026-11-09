import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/layout/AppShell'

// Public Pages
import LandingPage from './pages/public/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/public/RegisterPage'
import PendingApprovalPage from './pages/public/PendingApprovalPage'
import DashboardPage from './pages/DashboardPage'
import ForbiddenPage from './pages/ForbiddenPage'
import NotFoundPage from './pages/NotFoundPage'

// Agricultural Modules
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

// Commercial, Freight & Transportation
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
import DeliveryDetailPage from './pages/deliveries/DeliveryDetailPage'

// Monitoring & Analytics
import ColdChainPage from './pages/monitoring/ColdChainPage'
import LedgerPage from './pages/monitoring/LedgerPage'
import AnalyticsPage from './pages/monitoring/AnalyticsPage'

// Admin & Governance
import UsersPage from './pages/admin/UsersPage'
import UserDetailPage from './pages/admin/UserDetailPage'
import SettingsPage from './pages/admin/SettingsPage'

// Role constants
import { ROLES, ALL_ROLES, ADMIN_ONLY, AGRI_ROLES, COMMERCE_ROLES, TRANSPORT_ROLES } from './constants/roles'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/pending-approval" element={<PendingApprovalPage />} />

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
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.FARMER]}>
                  <FarmsListPage />
                </ProtectedRoute>
              } />
              <Route path="/farms/new" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.FARMER]}>
                  <FarmCreatePage />
                </ProtectedRoute>
              } />
              <Route path="/farms/:id" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.FARMER]}>
                  <FarmDetailPage />
                </ProtectedRoute>
              } />

              <Route path="/produce" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.FARMER, ROLES.WAREHOUSE_MANAGER, ROLES.BUYER]}>
                  <ProduceListPage />
                </ProtectedRoute>
              } />
              <Route path="/produce/new" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.FARMER]}>
                  <ProduceCreatePage />
                </ProtectedRoute>
              } />
              <Route path="/produce/:id" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.FARMER, ROLES.WAREHOUSE_MANAGER, ROLES.BUYER]}>
                  <ProduceDetailPage />
                </ProtectedRoute>
              } />

              <Route path="/batches" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.FARMER, ROLES.WAREHOUSE_MANAGER]}>
                  <BatchesListPage />
                </ProtectedRoute>
              } />
              <Route path="/batches/new" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.FARMER]}>
                  <BatchCreatePage />
                </ProtectedRoute>
              } />
              <Route path="/batches/:id" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.FARMER, ROLES.WAREHOUSE_MANAGER]}>
                  <BatchDetailPage />
                </ProtectedRoute>
              } />

              {/* Warehouses & Inventory */}
              <Route path="/warehouses" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.WAREHOUSE_MANAGER]}>
                  <WarehousesListPage />
                </ProtectedRoute>
              } />
              <Route path="/warehouses/new" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.WAREHOUSE_MANAGER]}>
                  <WarehouseCreatePage />
                </ProtectedRoute>
              } />
              <Route path="/warehouses/:id" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.WAREHOUSE_MANAGER]}>
                  <WarehouseDetailPage />
                </ProtectedRoute>
              } />

              <Route path="/inventory" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.WAREHOUSE_MANAGER]}>
                  <InventoryPage />
                </ProtectedRoute>
              } />

              {/* Commercial */}
              <Route path="/purchase-orders" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.BUYER, ROLES.FARMER]}>
                  <OrdersListPage />
                </ProtectedRoute>
              } />
              <Route path="/purchase-orders/new" element={
                <ProtectedRoute allowedRoles={[ROLES.BUYER]}>
                  <OrderCreatePage />
                </ProtectedRoute>
              } />
              <Route path="/purchase-orders/:id" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.BUYER, ROLES.FARMER]}>
                  <OrderDetailPage />
                </ProtectedRoute>
              } />

              <Route path="/freight-bookings" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.BUYER, ROLES.FARMER]}>
                  <FreightBookingsListPage />
                </ProtectedRoute>
              } />
              <Route path="/freight-bookings/new" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.BUYER, ROLES.FARMER]}>
                  <FreightBookingCreatePage />
                </ProtectedRoute>
              } />
              <Route path="/freight-bookings/:id" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.BUYER, ROLES.FARMER, ROLES.TRANSPORTER]}>
                  <FreightBookingDetailPage />
                </ProtectedRoute>
              } />

              <Route path="/freight-quotes" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.TRANSPORTER, ROLES.BUYER, ROLES.FARMER]}>
                  <FreightQuotesPage />
                </ProtectedRoute>
              } />

              {/* Transport */}
              <Route path="/transporters" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.TRANSPORTER]}>
                  <TransportersListPage />
                </ProtectedRoute>
              } />

              <Route path="/fleet" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.TRANSPORTER]}>
                  <FleetListPage />
                </ProtectedRoute>
              } />
              <Route path="/fleet/new" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.TRANSPORTER]}>
                  <VehicleCreatePage />
                </ProtectedRoute>
              } />

              <Route path="/drivers" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.TRANSPORTER]}>
                  <DriversListPage />
                </ProtectedRoute>
              } />
              <Route path="/drivers/new" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.TRANSPORTER]}>
                  <DriverCreatePage />
                </ProtectedRoute>
              } />
              <Route path="/drivers/:id" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.TRANSPORTER]}>
                  <DriverDetailPage />
                </ProtectedRoute>
              } />

              <Route path="/shipments" element={
                <ProtectedRoute allowedRoles={ALL_ROLES}>
                  <ShipmentsListPage />
                </ProtectedRoute>
              } />
              <Route path="/shipments/new" element={
                <ProtectedRoute allowedRoles={[ROLES.TRANSPORTER]}>
                  <ShipmentCreatePage />
                </ProtectedRoute>
              } />
              <Route path="/shipments/:id" element={
                <ProtectedRoute allowedRoles={ALL_ROLES}>
                  <ShipmentDetailPage />
                </ProtectedRoute>
              } />

              <Route path="/deliveries" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DRIVER, ROLES.BUYER, ROLES.TRANSPORTER]}>
                  <DeliveriesListPage />
                </ProtectedRoute>
              } />
              <Route path="/deliveries/:id" element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DRIVER, ROLES.BUYER, ROLES.TRANSPORTER]}>
                  <DeliveryDetailPage />
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
                <ProtectedRoute allowedRoles={ALL_ROLES}>
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
                  <UserDetailPage />
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
