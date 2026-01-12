/**
 * Example usage of useHierarchyContext hook
 * 
 * This file demonstrates various use cases for the hierarchy context hook
 */

"use client";

import { useHierarchyContext } from "./use-hierarchy-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Home, CheckCircle, XCircle } from "lucide-react";

/**
 * Example 1: Display user's hierarchy information
 */
export function HierarchyInfoCard() {
  const {
    userRole,
    userFacilityType,
    isHospitalUser,
    canApprove,
    accessibleFacilities,
    isLoading,
  } = useHierarchyContext();

  if (isLoading) {
    return <div>Loading hierarchy information...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Hierarchy Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="font-medium">Role:</span>
          <Badge variant="outline">{userRole || "Unknown"}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium">Facility Type:</span>
          {userFacilityType === "hospital" ? (
            <Badge className="bg-blue-100 text-blue-800">
              <Building2 className="w-3 h-3 mr-1" />
              Hospital
            </Badge>
          ) : userFacilityType === "health_center" ? (
            <Badge className="bg-green-100 text-green-800">
              <Home className="w-3 h-3 mr-1" />
              Health Center
            </Badge>
          ) : (
            <span className="text-muted-foreground">Unknown</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium">Hospital User:</span>
          {isHospitalUser ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <XCircle className="w-4 h-4 text-gray-400" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium">Can Approve:</span>
          {canApprove ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <XCircle className="w-4 h-4 text-gray-400" />
          )}
        </div>

        <div>
          <span className="font-medium">Accessible Facilities:</span>
          <span className="ml-2 text-muted-foreground">
            {accessibleFacilities.length}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Example 2: List accessible facilities
 */
export function AccessibleFacilitiesList() {
  const { accessibleFacilities, isLoading } = useHierarchyContext();

  if (isLoading) {
    return <div>Loading facilities...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accessible Facilities</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {accessibleFacilities.map((facility) => (
            <li
              key={facility.id}
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
            >
              <div className="flex items-center gap-2">
                {facility.facilityType === "hospital" ? (
                  <Building2 className="w-4 h-4 text-blue-600" />
                ) : (
                  <Home className="w-4 h-4 text-green-600" />
                )}
                <span className="font-medium">{facility.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {facility.districtName}
                </span>
                <Badge
                  variant="outline"
                  className={
                    facility.facilityType === "hospital"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-green-50 text-green-700"
                  }
                >
                  {facility.facilityType}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/**
 * Example 3: Conditional rendering based on role
 */
export function RoleBasedContent() {
  const { canApprove, userRole, isLoading } = useHierarchyContext();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!canApprove) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">
            You don't have approval permissions. This section is only available
            for DAF and DG users.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        {userRole === "daf" && (
          <div>
            <h3 className="font-semibold mb-2">DAF Approval Queue</h3>
            <p className="text-sm text-muted-foreground">
              Reports pending your first-level approval
            </p>
          </div>
        )}
        {userRole === "dg" && (
          <div>
            <h3 className="font-semibold mb-2">DG Approval Queue</h3>
            <p className="text-sm text-muted-foreground">
              Reports pending your final approval
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Example 4: Check facility access
 */
export function FacilityAccessChecker({ facilityId }: { facilityId: number }) {
  const { canAccessFacility, isLoading } = useHierarchyContext();

  if (isLoading) {
    return <div>Checking access...</div>;
  }

  const hasAccess = canAccessFacility(facilityId);

  return (
    <div className="flex items-center gap-2">
      {hasAccess ? (
        <>
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-600">You have access</span>
        </>
      ) : (
        <>
          <XCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-600">Access denied</span>
        </>
      )}
    </div>
  );
}

/**
 * Example 5: Hospital-specific features
 */
export function HospitalOnlyFeature() {
  const { isHospitalUser, accessibleFacilities, isLoading } =
    useHierarchyContext();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isHospitalUser) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">
            This feature is only available for hospital users.
          </p>
        </CardContent>
      </Card>
    );
  }

  const childFacilities = accessibleFacilities.filter(
    (f) => f.facilityType === "health_center"
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Child Health Centers</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          As a hospital user, you can access reports from these health centers:
        </p>
        <ul className="space-y-2">
          {childFacilities.map((facility) => (
            <li key={facility.id} className="flex items-center gap-2">
              <Home className="w-4 h-4 text-green-600" />
              <span>{facility.name}</span>
              <span className="text-sm text-muted-foreground">
                ({facility.districtName})
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
