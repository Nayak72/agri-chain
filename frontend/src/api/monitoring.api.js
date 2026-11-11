import apiClient from './client'

export const sensorsApi = {
  nextReading: (shipmentId, scenario = 'NORMAL') =>
    apiClient.post(`/sensors/shipments/${shipmentId}/simulation/next-reading`, { scenario }),
  readings: (shipmentId, params) =>
    apiClient.get(`/sensors/shipments/${shipmentId}/sensor-readings`, { params }),
  alerts: (shipmentId, params) =>
    apiClient.get(`/sensors/shipments/${shipmentId}/sensor-alerts`, { params }),
  resolveAlert: (alertId, data = {}) =>
    apiClient.post(`/sensors/sensor-alerts/${alertId}/resolve`, data),
}

export const deliveryApi = {
  reports: (params) => apiClient.get('/delivery/reports', { params }),
  getReport: (shipmentId) =>
    apiClient.get(`/delivery/shipments/${shipmentId}/delivery-report`),
  getReportById: (reportId) =>
    apiClient.get(`/delivery/reports/${reportId}`),
  confirmDelivery: (shipmentId, data) =>
    apiClient.post(`/delivery/shipments/${shipmentId}/confirm-delivery`, data),
  rejectDelivery: (shipmentId, data) =>
    apiClient.post(`/delivery/shipments/${shipmentId}/reject-delivery`, data),
}

export const ledgerApi = {
  blocks: (params) => apiClient.get('/ledger/blocks', { params }),
  verify: () => apiClient.get('/ledger/verify'),
  entityHistory: (entityType, entityId) => apiClient.get(`/ledger/entities/${entityType}/${entityId}`),
}

