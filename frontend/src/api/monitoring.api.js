import apiClient from './client'

export const sensorsApi = {
  startSimulation: (shipmentId, data) =>
    apiClient.post(`/sensors/shipments/${shipmentId}/simulation/start`, data),
  pauseSimulation: (shipmentId) =>
    apiClient.post(`/sensors/shipments/${shipmentId}/simulation/pause`),
  resumeSimulation: (shipmentId) =>
    apiClient.post(`/sensors/shipments/${shipmentId}/simulation/resume`),
  stopSimulation: (shipmentId) =>
    apiClient.post(`/sensors/shipments/${shipmentId}/simulation/stop`),
  resetSimulation: (shipmentId) =>
    apiClient.post(`/sensors/shipments/${shipmentId}/simulation/reset`),
  nextReading: (shipmentId) =>
    apiClient.post(`/sensors/shipments/${shipmentId}/simulation/next-reading`),
  readings: (shipmentId, params) =>
    apiClient.get(`/sensors/shipments/${shipmentId}/sensor-readings`, { params }),
  alerts: (shipmentId, params) =>
    apiClient.get(`/sensors/shipments/${shipmentId}/sensor-alerts`, { params }),
  acknowledgeAlert: (alertId, data = {}) =>
    apiClient.post(`/sensors/sensor-alerts/${alertId}/acknowledge`, data),
  resolveAlert: (alertId, data = {}) =>
    apiClient.post(`/sensors/sensor-alerts/${alertId}/resolve`, data),
}

export const deliveryApi = {
  reports: (params) => apiClient.get('/delivery/reports', { params }),
  getReport: (shipmentId) =>
    apiClient.get(`/delivery/shipments/${shipmentId}/delivery-report`),
  getReportById: (reportId) =>
    apiClient.get(`/delivery/reports/${reportId}`),
  createReport: (shipmentId, data) =>
    apiClient.post(`/delivery/shipments/${shipmentId}/delivery-report`, data),
  confirmDelivery: (shipmentId) =>
    apiClient.post(`/delivery/shipments/${shipmentId}/confirm-delivery`),
  rejectDelivery: (shipmentId) =>
    apiClient.post(`/delivery/shipments/${shipmentId}/reject-delivery`),
  partialDelivery: (shipmentId) =>
    apiClient.post(`/delivery/shipments/${shipmentId}/partial-delivery`),
}

export const ledgerApi = {
  blocks: (params) => apiClient.get('/ledger/blocks', { params }),
  verify: () => apiClient.get('/ledger/verify'),
  statistics: () => apiClient.get('/ledger/statistics'),
}

