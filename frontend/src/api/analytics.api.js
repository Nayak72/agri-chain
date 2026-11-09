import apiClient from './client'

export const analyticsApi = {
  dashboard: () =>
    apiClient.get('/analytics/dashboard'),

  shipments: (params) =>
    apiClient.get('/analytics/shipments', { params }),

  fleet: () =>
    apiClient.get('/analytics/fleet'),

  freight: () =>
    apiClient.get('/analytics/freight'),

  quality: () =>
    apiClient.get('/analytics/quality'),

  coldChain: () =>
    apiClient.get('/analytics/cold-chain'),
}
