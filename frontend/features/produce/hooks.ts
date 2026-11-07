import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { asPage, ListParams } from "@/lib/api/contracts";
import { produceApi } from "./api";
import { ProduceInput } from "./types";

export const produceKeys = {
  all: ["produce"] as const,
  lists: () => [...produceKeys.all, "list"] as const,
  list: (params: ListParams) => [...produceKeys.lists(), params] as const,
  detail: (id: string) => [...produceKeys.all, "detail", id] as const,
};

export function useProduceList(params: ListParams = {}) {
  return useQuery({
    queryKey: produceKeys.list(params),
    queryFn: async () => asPage(await produceApi.list(params), params),
  });
}

export function useProduceDetail(id: string) {
  return useQuery({ queryKey: produceKeys.detail(id), queryFn: () => produceApi.get(id), enabled: Boolean(id) });
}

export function useProduceMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProduceInput) => produceApi.create(payload),
    onSuccess: () => client.invalidateQueries({ queryKey: produceKeys.lists() }),
  });
}
