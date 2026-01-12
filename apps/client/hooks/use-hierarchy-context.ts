"use client";

import { useMemo } from "react";
import { authClient } from "@/lib/auth";
import { useGetAccessibleFacilities } from "./queries/facilities/use-get-accessible-facilities";
import type { UserRole } from "@/types/user";
import type { AccessibleFacility } from "@/fetchers/facilities/get-accessible-facilities";

export interface HierarchyContext {
  /**
   * List of facilities accessible to the current user based on their role and hierarchy
   */
  accessibleFacilities: AccessibleFacility[];
  
  /**
   * Whether the user is at a hospital facility (can access child facilities)
   */
  isHospitalUser: boolean;
  
  /**
   * Whether the user has approval permissions (DAF or DG role)
   */
  canApprove: boolean;
  
  /**
   * The current user's role
   */
  userRole: UserRole | null;
  
  /**
   * The current user's facility ID
   */
  userFacilityId: number | null;
  
  /**
   * The current user's facility type
   */
  userFacilityType: "hospital" | "health_center" | null;
  
  /**
   * Whether the data is currently loading
   */
  isLoading: boolean;
  
  /**
   * Whether there was an error loading the data
   */
  isError: boolean;
  
  /**
   * Check if the user can access a specific facility
   */
  canAccessFacility: (facilityId: number) => boolean;
  
  /**
   * Get accessible facility IDs as an array
   */
  accessibleFacilityIds: number[];
}

/**
 * Hook for accessing facility hierarchy context
 * 
 * Provides information about:
 * - Which facilities the user can access based on their role and hierarchy
 * - Whether the user is at a hospital (can access child facilities)
 * - Whether the user has approval permissions (DAF/DG roles)
 * - User's role and facility information
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { 
 *     accessibleFacilities, 
 *     isHospitalUser, 
 *     canApprove,
 *     canAccessFacility 
 *   } = useHierarchyContext();
 *   
 *   if (canApprove) {
 *     return <ApprovalQueue facilities={accessibleFacilities} />;
 *   }
 *   
 *   return <MyReports />;
 * }
 * ```
 */
export function useHierarchyContext(): HierarchyContext {
  const { data: session, isPending: isSessionLoading } = authClient.useSession();
  
  // Fetch accessible facilities for the current user
  const { 
    data: accessibleFacilities = [], 
    isLoading: isFacilitiesLoading,
    isError 
  } = useGetAccessibleFacilities();

  const isLoading = isSessionLoading || isFacilitiesLoading;

  // Extract user information from session
  const user = session?.user as any;
  const userRole = (user?.role as UserRole) || null;
  const userFacilityId = user?.facilityId || null;
  
  // Determine user's facility type from accessible facilities or session
  const userFacilityType = useMemo(() => {
    if (!userFacilityId) return null;
    
    // Try to find in accessible facilities first
    const userFacility = accessibleFacilities.find(f => f.id === userFacilityId);
    if (userFacility) {
      return userFacility.facilityType;
    }
    
    // Fallback to session data if available
    if (user?.facility?.facilityType) {
      return user.facility.facilityType as "hospital" | "health_center";
    }
    
    return null;
  }, [userFacilityId, accessibleFacilities, user]);

  // Check if user is at a hospital facility
  const isHospitalUser = useMemo(() => {
    return userFacilityType === "hospital";
  }, [userFacilityType]);

  // Check if user has approval permissions
  const canApprove = useMemo(() => {
    return userRole === "daf" || userRole === "dg";
  }, [userRole]);

  // Get accessible facility IDs
  const accessibleFacilityIds = useMemo(() => {
    return accessibleFacilities.map(f => f.id);
  }, [accessibleFacilities]);

  // Function to check if user can access a specific facility
  const canAccessFacility = useMemo(() => {
    return (facilityId: number): boolean => {
      return accessibleFacilityIds.includes(facilityId);
    };
  }, [accessibleFacilityIds]);

  return {
    accessibleFacilities,
    isHospitalUser,
    canApprove,
    userRole,
    userFacilityId,
    userFacilityType,
    isLoading,
    isError,
    canAccessFacility,
    accessibleFacilityIds,
  };
}
