import { apiClient } from "@/lib/api-client";

export const batchService = {
  list: async (params?: any) => {
    const { data } = await apiClient.get("/batches", { params });
    return data;
  },
  get: async (id: string): Promise<any> => {
    const { data } = await apiClient.get(`/batches/${id}`);
    return data;
  },
  create: async (payload: any) => {
    const { data } = await apiClient.post("/batches", payload);
    return data;
  },
  update: async (id: string, payload: any) => {
    const { data } = await apiClient.patch(`/batches/${id}`, payload);
    return data;
  },
  history: async (id: string) => {
    const { data } = await apiClient.get(`/batches/${id}/history`);
    return data;
  },
};