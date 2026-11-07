import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = Cookies.get("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const isAuthRequest = originalRequest?.url?.includes("/auth/");
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;
      const refreshToken = Cookies.get("refresh_token");
      if (refreshToken) {
        try {
          refreshPromise ??= axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken }, { withCredentials: true })
            .then(({ data }) => data.access_token)
            .finally(() => { refreshPromise = null; });
          const accessToken = await refreshPromise;
          Cookies.set("access_token", accessToken, { expires: 1 / 48 });
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch {
          Cookies.remove("access_token");
          Cookies.remove("refresh_token");
          if (typeof window !== "undefined") window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        }
      } else {
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        if (typeof window !== "undefined") window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      }
    }
    return Promise.reject(error);
  }
);

export { apiClient, API_BASE_URL };

export function parseApiError(error: unknown) {
  const response = (error as AxiosError<{ error?: { code?: string; message?: string; request_id?: string; field_errors?: Array<{ field: string; message: string }> } }>)?.response;
  const apiError = response?.data?.error;
  return {
    code: apiError?.code ?? "UNKNOWN_ERROR",
    message: apiError?.message ?? "Something went wrong",
    fieldErrors: apiError?.field_errors ?? [],
    requestId: apiError?.request_id,
  };
}
