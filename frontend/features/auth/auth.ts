import { apiClient } from "@/lib/api-client";
import { setToken, removeToken, getToken } from "@/lib/auth";
import { User } from "@/types";

export const authService = {
  login: async (email: string, password: string) => {
    const { data } = await apiClient.post("/auth/login", { email, password });
    setToken(data.access_token);
    return data;
  },
  register: async (userData: any) => {
    const { data } = await apiClient.post("/auth/register", userData);
    setToken(data.access_token);
    return data;
  },
  refresh: async (refreshToken: string) => {
    const { data } = await apiClient.post("/auth/refresh", { refresh_token: refreshToken });
    setToken(data.access_token);
    return data;
  },
  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {}
    removeToken();
  },
  me: async (): Promise<User> => {
    const { data } = await apiClient.get("/auth/me");
    return data.user;
  },
  isAuthenticated: () => !!getToken(),
};