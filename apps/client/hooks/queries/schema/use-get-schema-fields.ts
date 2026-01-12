import getSchemaFields from "@/fetchers/schemas/get-schema-fields";
import { useQuery } from "@tanstack/react-query";
import type { GetSchemaFieldsRequest } from "@/fetchers/schemas/get-schema-fields";

export function useGetSchemaFields({ id }: GetSchemaFieldsRequest) {
  return useQuery({
    queryFn: () => getSchemaFields({ id }),
    queryKey: ["schemas", "fields", id],
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
}




