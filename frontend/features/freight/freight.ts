import { apiClient } from "@/lib/api-client";

export const freightService = {
  listBookings: async (params?: any) => {
    const { data } = await apiClient.get("/freight-bookings", { params });
    return data;
  },
  createBooking: async (payload: any) => {
    const { data } = await apiClient.post("/freight-bookings", payload);
    return data;
  },
  getBooking: async (id: string) => {
    const { data } = await apiClient.get(`/freight-bookings/${id}`);
    return data;
  },
  listQuotes: async (params?: any) => {
    const { data } = await apiClient.get("/freight-quotes", { params });
    return data;
  },
  createQuote: async (payload: any) => {
    const { data } = await apiClient.post("/freight-quotes", payload);
    return data;
  },
  acceptQuote: async (id: string) => {
    const { data } = await apiClient.post(`/freight-quotes/${id}/accept`);
    return data;
  },
};