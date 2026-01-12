import getFacilities from "@/fetchers/facilities/get-facilities";
import { useQuery } from "@tanstack/react-query";

export function useGetFacilities() {
  return useQuery({
    queryFn: () => getFacilities(),
    queryKey: ["facilities"],
  });
}


