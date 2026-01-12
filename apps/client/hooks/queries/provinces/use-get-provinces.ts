import { useQuery } from "@tanstack/react-query";
import { getProvinces } from "@/fetchers/provinces/get-provinces";

export function useGetProvinces() {
  return useQuery({
    queryKey: ['provinces'],
    queryFn: getProvinces,
  });
}
