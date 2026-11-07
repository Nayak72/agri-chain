import { apiClient } from "@/lib/api-client";

export const fleetService = {
  listVehicles: async (params?: any) => {
    const { data } = await apiClient.get("/vehicles", { params });
    return data;
  },
  createVehicle: async (payload: any) => {
    const { data } = await apiClient.post("/vehicles", payload);
    return data;
  },
  getVehicle: async (id: string) => {
    const { data } = await apiClient.get(`/vehicles/${id}`);
    return data;
  },
  updateVehicle: async (id: string, payload: any) => {
    const { data } = await apiClient.patch(`/vehicles/${id}`, payload);
    return data;
  },
  listDrivers: async (params?: any) => {
    const { data } = await apiClient.get("/drivers", { params });
    return data;
  },
  createDriver: async (payload: any) => {
    const { data } = await apiClient.post("/drivers", payload);
    return data;
  },
  getDriver: async (id: string) => {
    const { data } = await apiClient.get(`/drivers/${id}`);
    return data;
  },
  updateDriver: async (id: string, payload: any) => {
    const { data } = await apiClient.patch(`/drivers/${id}`, payload);
    return data;
  },
};