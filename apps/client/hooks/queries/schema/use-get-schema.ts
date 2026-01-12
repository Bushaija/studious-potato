import getSchema from "@/fetchers/schemas/get-schema";
import { useQuery } from "@tanstack/react-query";
import type { GetSchemaRequest } from "@/fetchers/schemas/get-schema";

export function useGetSchema({ id }: GetSchemaRequest) {
  return useQuery({
    queryFn: () => getSchema({ id }),
    queryKey: ["schemas", "detail", id],
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
};



