import { apiClient } from "@/lib/api-client";

export const orderService = {
  list: async (params?: any) => {
    const { data } = await apiClient.get("/purchase-orders", { params });
    return data;
  },
  get: async (id: string) => {
    const { data } = await apiClient.get(`/purchase-orders/${id}`);
    return data;
  },
  create: async (payload: any) => {
    const { data } = await apiClient.post("/purchase-orders", payload);
    return data;
  },
  accept: async (id: string) => {
    const { data } = await apiClient.post(`/purchase-orders/${id}/accept`);
    return data;
  },
  reject: async (id: string) => {
    const { data } = await apiClient.post(`/purchase-orders/${id}/reject`);
    return data;
  },
  cancel: async (id: string) => {
    const { data } = await apiClient.post(`/purchase-orders/${id}/cancel`);
    return data;
  },
};