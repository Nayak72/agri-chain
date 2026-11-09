import { apiClient, authClient } from './client'

export const authApi = {
  login: (email, password) =>
    authClient.post('/auth/login', { email, password }),

  refresh: () =>
    authClient.post('/auth/refresh'),

  logout: () =>
    apiClient.post('/auth/logout'),

  me: () =>
    apiClient.get('/auth/me'),
}
