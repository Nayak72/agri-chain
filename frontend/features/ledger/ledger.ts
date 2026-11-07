import { apiClient } from "@/lib/api-client";

export const ledgerService = {
  listBlocks: async (params?: any) => {
    const { data } = await apiClient.get("/ledger/blocks", { params });
    return data;
  },
  getBlock: async (index: number) => {
    const { data } = await apiClient.get(`/ledger/blocks/${index}`);
    return data;
  },
  verify: async () => {
    const { data } = await apiClient.get("/ledger/verify");
    return data;
  },
  verifyEntity: async (entityType: string, entityId: string) => {
    const { data } = await apiClient.get(`/ledger/verify/${entityType}/${entityId}`);
    return data;
  },
  getEntityHistory: async (entityType: string, entityId: string) => {
    const { data } = await apiClient.get(`/ledger/entities/${entityType}/${entityId}`);
    return data;
  },
  statistics: async () => {
    const { data } = await apiClient.get("/ledger/statistics");
    return data;
  },
};