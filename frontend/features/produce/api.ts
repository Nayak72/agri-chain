import { apiClient } from "@/lib/api-client";
import { ListParams, ListPayload } from "@/lib/api/contracts";
import { Produce, ProduceInput } from "./types";

export const produceApi = {
  list: async (params: ListParams = {}) =>
    (await apiClient.get<ListPayload<Produce>>("/produce", { params })).data,
  get: async (id: string) => (await apiClient.get<Produce>(`/produce/${id}`)).data,
  create: async (payload: ProduceInput) => (await apiClient.post<Produce>("/produce", payload)).data,
  update: async (id: string, payload: Partial<ProduceInput>) =>
    (await apiClient.patch<Produce>(`/produce/${id}`, payload)).data,
};
