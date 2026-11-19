import apiClient from './client'

export const usersApi = {
  list: (params) => apiClient.get('/users', { params }),
  get: (id) => apiClient.get(`/users/${id}`),
  auditHistory: (id) => apiClient.get(`/users/${id}/audit-history`),
  update: (id, data) => apiClient.patch(`/users/${id}`, data),
  approve: (id) => apiClient.post(`/users/${id}/approve`),
  suspend: (id, reason) => apiClient.post(`/users/${id}/suspend`, { reason }),
  activate: (id, reason) => apiClient.post(`/users/${id}/activate`, { reason }),
}

