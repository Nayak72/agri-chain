import { apiClient, authClient } from './client'

export const authApi = {
  login: (email, password) =>
    authClient.post('/auth/login', { email, password }),

  register: (data) =>
    authClient.post('/auth/register', data),

  refresh: () =>
    authClient.post('/auth/refresh'),

  logout: () =>
    apiClient.post('/auth/logout'),

  me: () =>
    apiClient.get('/auth/me'),
}
