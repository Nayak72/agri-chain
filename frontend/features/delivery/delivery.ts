import { apiClient } from "@/lib/api-client";

export const deliveryService = {
  createReport: async (shipmentId: string, payload: any) => {
    const { data } = await apiClient.post(`/delivery/shipments/${shipmentId}/delivery-report`, payload);
    return data;
  },
  getReport: async (shipmentId: string) => {
    const { data } = await apiClient.get(`/delivery/shipments/${shipmentId}/delivery-report`);
    return data;
  },
  confirmDelivery: async (shipmentId: string) => {
    const { data } = await apiClient.post(`/delivery/shipments/${shipmentId}/confirm-delivery`);
    return data;
  },
  rejectDelivery: async (shipmentId: string) => {
    const { data } = await apiClient.post(`/delivery/shipments/${shipmentId}/reject-delivery`);
    return data;
  },
  partialDelivery: async (shipmentId: string) => {
    const { data } = await apiClient.post(`/delivery/shipments/${shipmentId}/partial-delivery`);
    return data;
  },
};