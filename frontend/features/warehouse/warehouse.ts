import { apiClient } from "@/lib/api-client";

export const warehouseService = {
  list: async (params?: any) => {
    const { data } = await apiClient.get("/warehouses", { params });
    return data;
  },
  create: async (payload: any) => {
    const { data } = await apiClient.post("/warehouses", payload);
    return data;
  },
  get: async (id: string) => {
    const { data } = await apiClient.get(`/warehouses/${id}`);
    return data;
  },
  update: async (id: string, payload: any) => {
    const { data } = await apiClient.patch(`/warehouses/${id}`, payload);
    return data;
  },
};