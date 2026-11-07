import { apiClient } from "@/lib/api-client";

export const shipmentService = {
  list: async (params?: any) => {
    const { data } = await apiClient.get("/shipments", { params });
    return data;
  },
  get: async (id: string) => {
    const { data } = await apiClient.get(`/shipments/${id}`);
    return data;
  },
  create: async (payload: any) => {
    const { data } = await apiClient.post("/shipments", payload);
    return data;
  },
  assignVehicle: async (id: string, vehicleId: string) => {
    const { data } = await apiClient.post(`/shipments/${id}/assign-vehicle`, { vehicle_id: vehicleId });
    return data;
  },
  assignDriver: async (id: string, driverId: string) => {
    const { data } = await apiClient.post(`/shipments/${id}/assign-driver`, { driver_id: driverId });
    return data;
  },
  load: async (id: string, payload: any) => {
    const { data } = await apiClient.post(`/shipments/${id}/load`, payload);
    return data;
  },
  dispatch: async (id: string) => {
    const { data } = await apiClient.post(`/shipments/${id}/dispatch`);
    return data;
  },
  timeline: async (id: string) => {
    const { data } = await apiClient.get(`/shipments/${id}/timeline`);
    return data;
  },
  reportException: async (id: string, payload: any) => {
    const { data } = await apiClient.post(`/shipments/${id}/report-exception`, payload);
    return data;
  },
};