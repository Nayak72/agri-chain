import { apiClient } from "@/lib/api-client";

export const analyticsService = {
  dashboard: async () => {
    const { data } = await apiClient.get("/analytics/dashboard");
    return data;
  },
  shipments: async (params?: any) => {
    const { data } = await apiClient.get("/analytics/shipments", { params });
    return data;
  },
  freight: async () => {
    const { data } = await apiClient.get("/analytics/freight");
    return data;
  },
  fleet: async () => {
    const { data } = await apiClient.get("/analytics/fleet");
    return data;
  },
  quality: async () => {
    const { data } = await apiClient.get("/analytics/quality");
    return data;
  },
  coldChain: async () => {
    const { data } = await apiClient.get("/analytics/cold-chain");
    return data;
  },
};