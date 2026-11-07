import { apiClient } from "@/lib/api-client";
import { auth, getToken } from "@/lib/auth";
import { User } from "@/types";

export const authService = {
  login: async (email: string, password: string) => {
    const { data } = await apiClient.post("/auth/login", { email, password });
    if (data.access_token && data.refresh_token) {
      auth.setTokens(data.access_token, data.refresh_token);
    }
    return data;
  },
  register: async (userData: any) => {
    const { data } = await apiClient.post("/auth/register", userData);
    if (data.access_token && data.refresh_token) {
      auth.setTokens(data.access_token, data.refresh_token);
    }
    return data;
  },
  refresh: async (refreshToken: string) => {
    const { data } = await apiClient.post("/auth/refresh", { refresh_token: refreshToken });
    if (data.access_token && data.refresh_token) {
      auth.setTokens(data.access_token, data.refresh_token);
    }
    return data;
  },
  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {}
    auth.removeTokens();
  },
  me: async (): Promise<User> => {
    const { data } = await apiClient.get<User>("/auth/me");
    return data;
  },
  isAuthenticated: () => auth.isAuthenticated(),
};
