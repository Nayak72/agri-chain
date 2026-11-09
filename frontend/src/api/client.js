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

// Dedicated client for unauthenticated auth endpoints (login, refresh)
// Must NOT have the 401 retry interceptor to prevent infinite retry and reload loops
export const authClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Send HttpOnly refresh cookie
  headers: {
    'Content-Type': 'application/json',
  },
})

// Main Axios instance for authenticated API requests
export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
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

// Response interceptor: attempt token refresh on 401
let isRefreshing = false
let failedQueue = []

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (!originalRequest) {
      return Promise.reject(error)
    }

    // Do NOT intercept or retry if the request is an auth endpoint
    const url = originalRequest.url || ''
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh')

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return apiClient(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Attempt silent refresh using HttpOnly cookie via authClient
        const res = await authClient.post('/auth/refresh')
        const newToken = res.data.access_token
        tokenStore.set(newToken)
        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        tokenStore.clear()
        processQueue(refreshError, null)
        // Only redirect to login if we are NOT already on the login page
        // This prevents infinite full-page reload loops
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
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
