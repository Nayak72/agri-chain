import { apiClient } from "@/lib/api-client";

export const inventoryService = {
  list: async (params?: any) => {
    const { data } = await apiClient.get("/inventory", { params });
    return data;
  },
  movements: async (params?: any) => {
    const { data } = await apiClient.get("/inventory/movements", { params });
    return data;
  },
  createMovement: async (payload: any) => {
    const { data } = await apiClient.post("/inventory/movements", payload);
    return data;
  },
};