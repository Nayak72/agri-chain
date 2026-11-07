import { apiClient } from "@/lib/api-client";

export const produceService = {
  list: async (): Promise<any[]> => {
    const { data } = await apiClient.get("/produce");
    return data;
  },
  get: async (id: string): Promise<any> => {
    const { data } = await apiClient.get(`/produce/${id}`);
    return data;
  },
  create: async (payload: any) => {
    const { data } = await apiClient.post("/produce", payload);
    return data;
  },
  update: async (id: string, payload: any) => {
    const { data } = await apiClient.patch(`/produce/${id}`, payload);
    return data;
  },
};