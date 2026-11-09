import apiClient from './client'

export const farmsApi = {
  list: (params) => apiClient.get('/farms', { params }),
  get: (id) => apiClient.get(`/farms/${id}`),
  create: (data) => apiClient.post('/farms', data),
  update: (id, data) => apiClient.patch(`/farms/${id}`, data),
}

export const produceApi = {
  list: (params) => apiClient.get('/produce', { params }),
  get: (id) => apiClient.get(`/produce/${id}`),
  create: (data) => apiClient.post('/produce', data),
  update: (id, data) => apiClient.patch(`/produce/${id}`, data),
}

export const batchesApi = {
  list: (params) => apiClient.get('/batches', { params }),
  get: (id) => apiClient.get(`/batches/${id}`),
  create: (data) => apiClient.post('/batches', data),
  update: (id, data) => apiClient.patch(`/batches/${id}`, data),
}

export const warehousesApi = {
  list: (params) => apiClient.get('/warehouses', { params }),
  get: (id) => apiClient.get(`/warehouses/${id}`),
  create: (data) => apiClient.post('/warehouses', data),
  update: (id, data) => apiClient.patch(`/warehouses/${id}`, data),
}

export const inventoryApi = {
  list: (params) => apiClient.get('/inventory', { params }),
  movements: (params) => apiClient.get('/inventory/movements', { params }),
  createMovement: (data) => apiClient.post('/inventory/movements', data),
}

