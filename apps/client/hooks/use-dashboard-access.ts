/**
 * React hook for dashboard access control
 */

import { useMemo } from "react";
import { authClient } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import {
  getDashboardAccessRights,
  getDefaultTab,
  getDefaultDistrictId,
  getDefaultProvinceId,
  type DashboardAccessRights,
} from "@/lib/dashboard-access-control";

async function fetchFacilityWithDistrict(facilityId: number) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/facilities/${facilityId}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch facility");
  }
  return response.json();
}

export function useDashboardAccess() {
  const { data: session, isPending } = authClient.useSession();
  
  // Fetch facility data with district information if user has a facilityId
  const userFacilityId = (session?.user as any)?.facilityId;
  const { data: facilityData, isLoading: isLoadingFacility } = useQuery({
    queryKey: ["facility", userFacilityId],
    queryFn: () => fetchFacilityWithDistrict(userFacilityId),
    enabled: Boolean(userFacilityId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const accessRights: DashboardAccessRights = useMemo(() => {
    if (!session?.user) {
      return getDashboardAccessRights(null);
    }

    const userAny = session.user as any;
    
    console.log("[useDashboardAccess] Session user:", {
      user: session.user,
      facility: userAny.facility,
      facilityId: userAny.facilityId,
      facilityData,
    });

    // Get facility info - prefer fetched data with district info
    const facility = facilityData
      ? {
          id: facilityData.id,
          name: facilityData.name,
          facilityType: facilityData.facilityType,
          districtId: facilityData.districtId,
          district: facilityData.district,
        }
      : userAny.facility
      ? {
          id: userAny.facility.id,
          name: userAny.facility.name,
          facilityType: userAny.facility.facilityType,
          districtId: userAny.facility.districtId,
          district: userAny.facility.district,
        }
      : userAny.facilityId
      ? {
          id: userAny.facilityId,
          name: "User Facility",
          facilityType: "unknown",
          districtId: undefined,
          district: undefined,
        }
      : undefined;

    console.log("[useDashboardAccess] Facility info:", facility);

    const rights = getDashboardAccessRights(session.user as any, facility);
    
    console.log("[useDashboardAccess] Access rights:", rights);

    return rights;
  }, [session, facilityData]);

  const defaultTab = useMemo(() => getDefaultTab(accessRights), [accessRights]);

  const defaultDistrictId = useMemo(
    () => getDefaultDistrictId(accessRights),
    [accessRights]
  );

  const defaultProvinceId = useMemo(
    () => getDefaultProvinceId(accessRights),
    [accessRights]
  );

  return {
    accessRights,
    defaultTab,
    defaultDistrictId,
    defaultProvinceId,
    user: session?.user,
    isLoading: isPending || isLoadingFacility,
  };
}
