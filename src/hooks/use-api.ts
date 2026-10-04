"use client";
import {
  useInfiniteQuery,
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
    retry: false,
  });
}

export function useInfiniteGet<T>(
  key: QueryKey,
  buildUrl: (offset: number) => string,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: key,
    queryFn: async ({ pageParam }) =>
      (await api.get<T>(buildUrl(pageParam))).data,
    initialPageParam: 0,
    getNextPageParam: (lastPage: any) =>
      lastPage?.nextOffset == null ? undefined : lastPage.nextOffset,
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
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
