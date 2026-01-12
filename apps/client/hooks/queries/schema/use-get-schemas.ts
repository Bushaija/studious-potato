import getSchemas from "@/fetchers/schemas/get-schemas";
import { useQuery } from "@tanstack/react-query";
import type { GetSchemasRequest } from "@/fetchers/schemas/get-schemas";

export function useGetSchemas(filters: GetSchemasRequest = {}) {
  return useQuery({
    queryFn: () => getSchemas(filters),
    queryKey: ["schemas", "list", filters],
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
};



