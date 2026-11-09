import apiClient from './client'

export const usersApi = {
  list: (params) => apiClient.get('/users', { params }),
  get: (id) => apiClient.get(`/users/${id}`),
  update: (id, data) => apiClient.patch(`/users/${id}`, data),
  approve: (id) => apiClient.post(`/users/${id}/approve`),
  suspend: (id) => apiClient.post(`/users/${id}/suspend`),
  activate: (id) => apiClient.post(`/users/${id}/activate`),
}

