"use client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { api } from "@/lib/axios";
export function useGet<T>(
  key: QueryKey,
  url: string,
  enabled = true,
  options?: { refetchOnMount?: boolean | "always" },
) {
  return useQuery({
    queryKey: key,
    queryFn: async () => (await api.get<T>(url)).data,
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: options?.refetchOnMount,
  });
}
function useWrite<TData, TBody>(
  method: "post" | "put" | "patch" | "delete",
  url: string,
  invalidate: QueryKey[] = [],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: TBody) =>
      (await api.request<TData>({ url, method, data: body })).data,
    onSuccess: async () => {
      await Promise.all(
        invalidate.map((k) => qc.invalidateQueries({ queryKey: k })),
      );
    },
  });
}
export const usePost = <TData, TBody>(
  url: string,
  invalidate: QueryKey[] = [],
) => useWrite<TData, TBody>("post", url, invalidate);
export const usePut = <TData, TBody>(
  url: string,
  invalidate: QueryKey[] = [],
) => useWrite<TData, TBody>("put", url, invalidate);
export const usePatch = <TData, TBody>(
  url: string,
  invalidate: QueryKey[] = [],
) => useWrite<TData, TBody>("patch", url, invalidate);
export const useDelete = <TData, TBody = undefined>(
  url: string,
  invalidate: QueryKey[] = [],
) => useWrite<TData, TBody>("delete", url, invalidate);
