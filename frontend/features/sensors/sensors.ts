import { apiClient } from "@/lib/api-client";

export const sensorService = {
  startSimulation: async (shipmentId: string, payload: any) => {
    const { data } = await apiClient.post(`/sensors/shipments/${shipmentId}/simulation/start`, payload);
    return data;
  },
  pauseSimulation: async (shipmentId: string) => {
    const { data } = await apiClient.post(`/sensors/shipments/${shipmentId}/simulation/pause`);
    return data;
  },
  resumeSimulation: async (shipmentId: string) => {
    const { data } = await apiClient.post(`/sensors/shipments/${shipmentId}/simulation/resume`);
    return data;
  },
  stopSimulation: async (shipmentId: string) => {
    const { data } = await apiClient.post(`/sensors/shipments/${shipmentId}/simulation/stop`);
    return data;
  },
  nextReading: async (shipmentId: string) => {
    const { data } = await apiClient.post(`/sensors/shipments/${shipmentId}/simulation/next-reading`);
    return data;
  },
  listReadings: async (shipmentId: string, params?: any) => {
    const { data } = await apiClient.get(`/sensors/shipments/${shipmentId}/sensor-readings`, { params });
    return data;
  },
  listAlerts: async (shipmentId: string, params?: any) => {
    const { data } = await apiClient.get(`/sensors/shipments/${shipmentId}/sensor-alerts`, { params });
    return data;
  },
  acknowledgeAlert: async (alertId: string, payload?: any) => {
    const { data } = await apiClient.post(`/sensors/sensor-alerts/${alertId}/acknowledge`, payload);
    return data;
  },
  resolveAlert: async (alertId: string, payload?: any) => {
    const { data } = await apiClient.post(`/sensors/sensor-alerts/${alertId}/resolve`, payload);
    return data;
  },
};