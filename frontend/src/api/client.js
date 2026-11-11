import axios from 'axios'

// In production (via Nginx), API_BASE is relative: /api/v1
// In development (via Vite proxy), it's also /api/v1 (proxied to localhost:8000)
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1'

// In-memory access token store (never in localStorage for security)
let _accessToken = null

export const tokenStore = {
  get: () => _accessToken,
  set: (token) => { _accessToken = token },
  clear: () => { _accessToken = null },
}

// Dedicated client for unauthenticated auth endpoints.
export const authClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Main Axios instance for authenticated API requests
export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStore.get()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
        tokenStore.clear()
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
    }
    return Promise.reject(error)
  }
)

// Separate client for health checks (no auth needed)
export const healthClient = axios.create({
  withCredentials: false,
  timeout: 5000,
})

export default apiClient
