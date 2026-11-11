import { apiClient, authClient } from './client'

export const authApi = {
  login: (email, password) =>
    authClient.post('/auth/login', { email, password }),

  register: (data) =>
    authClient.post('/auth/register', data),

  me: () =>
    apiClient.get('/auth/me'),
}
