import apiClient from './client'

export const ordersApi = {
  list: (params) => apiClient.get('/purchase-orders', { params }),
  get: (id) => apiClient.get(`/purchase-orders/${id}`),
  create: (data) => apiClient.post('/purchase-orders', data),
  accept: (id) => apiClient.post(`/purchase-orders/${id}/accept`),
  reject: (id) => apiClient.post(`/purchase-orders/${id}/reject`),
  cancel: (id) => apiClient.post(`/purchase-orders/${id}/cancel`),
}

export const freightBookingsApi = {
  list: (params) => apiClient.get('/freight-bookings', { params }),
  get: (id) => apiClient.get(`/freight-bookings/${id}`),
  create: (data) => apiClient.post('/freight-bookings', data),
  update: (id, data) => apiClient.patch(`/freight-bookings/${id}`, data),
}

export const freightQuotesApi = {
  list: (params) => apiClient.get('/freight-quotes', { params }),
  get: (id) => apiClient.get(`/freight-quotes/${id}`),
  create: (data) => apiClient.post('/freight-quotes', data),
  accept: (id) => apiClient.post(`/freight-quotes/${id}/accept`),
}

export const transportersApi = {
  list: (params) => apiClient.get('/transporters', { params }),
  get: (id) => apiClient.get(`/transporters/${id}`),
  create: (data) => apiClient.post('/transporters', data),
  approve: (id) => apiClient.post(`/transporters/${id}/approve`),
}

export const fleetApi = {
  listVehicles: (params) => apiClient.get('/vehicles', { params }),
  getVehicle: (id) => apiClient.get(`/vehicles/${id}`),
  createVehicle: (data) => apiClient.post('/vehicles', data),
  updateVehicle: (id, data) => apiClient.patch(`/vehicles/${id}`, data),
}

export const driversApi = {
  list: (params) => apiClient.get('/drivers', { params }),
  get: (id) => apiClient.get(`/drivers/${id}`),
  create: (data) => apiClient.post('/drivers', data),
  update: (id, data) => apiClient.patch(`/drivers/${id}`, data),
}

export const shipmentsApi = {
  list: (params) => apiClient.get('/shipments', { params }),
  get: (id) => apiClient.get(`/shipments/${id}`),
  create: (data) => apiClient.post('/shipments', data),
  timeline: (id) => apiClient.get(`/shipments/${id}/timeline`),
  assignVehicle: (id, vehicleId) => apiClient.post(`/shipments/${id}/assign-vehicle`, { vehicle_id: vehicleId }),
  assignDriver: (id, driverId) => apiClient.post(`/shipments/${id}/assign-driver`, { driver_id: driverId }),
  load: (id, data) => apiClient.post(`/shipments/${id}/load`, data),
  dispatch: (id) => apiClient.post(`/shipments/${id}/dispatch`),
}

export const checkpointsApi = {
  list: (params) => apiClient.get('/checkpoints', { params }),
  get: (id) => apiClient.get(`/checkpoints/${id}`),
  create: (data) => apiClient.post('/checkpoints', data),
  update: (id, data) => apiClient.patch(`/checkpoints/${id}`, data),
}


