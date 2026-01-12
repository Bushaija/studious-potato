import getFacilityByName from "@/fetchers/facilities/get-facility-by-name";
import { useQuery } from "@tanstack/react-query";

export function useGetFacilityByName({ facilityName }: { facilityName?: string }) {
  return useQuery({
    queryFn: () => getFacilityByName({ facilityName: facilityName as string }),
    queryKey: ["facilities", "by-name", facilityName],
    enabled: typeof facilityName === "string" && facilityName.length > 0,
  });
};

