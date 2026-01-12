"use client";

import * as React from "react";
import { Building2, Home, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetFacilityHierarchy } from "@/hooks/queries/facilities/use-get-facility-hierarchy";

interface FacilityHierarchyTreeProps {
  facilityId: number;
  className?: string;
  showTitle?: boolean;
}

/**
 * Component to visualize facility parent-child relationships in a tree structure
 * 
 * Displays:
 * - Parent hospital (if facility is a health center)
 * - Current facility
 * - Child health centers (if facility is a hospital)
 * - District information
 */
export function FacilityHierarchyTree({
  facilityId,
  className,
  showTitle = true,
}: FacilityHierarchyTreeProps) {
  const { data, isLoading, error, refetch } = useGetFacilityHierarchy(facilityId);

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        {showTitle && (
          <CardHeader>
            <CardTitle>Facility Hierarchy</CardTitle>
            <CardDescription>Loading facility relationships...</CardDescription>
          </CardHeader>
        )}
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading hierarchy...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn("w-full border-destructive", className)}>
        {showTitle && (
          <CardHeader>
            <CardTitle>Facility Hierarchy</CardTitle>
            <CardDescription className="text-destructive">
              Failed to load facility hierarchy
            </CardDescription>
          </CardHeader>
        )}
        <CardContent className="py-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>Unable to load facility hierarchy</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { facility, parentFacility, childFacilities } = data;

  // Get facility type icon
  const getFacilityIcon = (facilityType: "hospital" | "health_center") => {
    return facilityType === "hospital" ? (
      <Building2 className="h-4 w-4" />
    ) : (
      <Home className="h-4 w-4" />
    );
  };

  // Get facility type badge
  const getFacilityTypeBadge = (facilityType: "hospital" | "health_center") => {
    if (facilityType === "hospital") {
      return (
        <Badge 
          variant="outline" 
          className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
        >
          Hospital
        </Badge>
      );
    }
    return (
      <Badge 
        variant="outline" 
        className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
      >
        Health Center
      </Badge>
    );
  };

  return (
    <Card className={cn("w-full", className)}>
      {showTitle && (
        <CardHeader>
          <CardTitle>Facility Hierarchy</CardTitle>
          <CardDescription>
            Organizational structure within {facility.districtName} District
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {/* District Badge */}
        <div className="flex items-center gap-2 pb-2 border-b">
          <Badge variant="secondary" className="text-sm">
            {facility.districtName} District
          </Badge>
        </div>

        {/* Hierarchy Tree */}
        <div className="space-y-3">
          {/* Parent Facility (if exists) */}
          {parentFacility && (
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="mt-1 text-muted-foreground">
                  {getFacilityIcon(parentFacility.facilityType)}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{parentFacility.name}</span>
                    {getFacilityTypeBadge(parentFacility.facilityType)}
                  </div>
                  <p className="text-xs text-muted-foreground">Parent Hospital</p>
                </div>
              </div>

              {/* Connection Line */}
              <div className="flex items-center gap-2 pl-6 text-muted-foreground">
                <div className="w-px h-4 bg-border" />
              </div>
            </div>
          )}

          {/* Current Facility */}
          <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-primary bg-primary/5">
            <div className="mt-1 text-primary">
              {getFacilityIcon(facility.facilityType)}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{facility.name}</span>
                {getFacilityTypeBadge(facility.facilityType)}
                <Badge variant="default" className="text-xs">
                  Current
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {facility.facilityType === "hospital" 
                  ? "District Hospital" 
                  : "Reports to parent hospital"}
              </p>
            </div>
          </div>

          {/* Child Facilities (if exists) */}
          {childFacilities && childFacilities.length > 0 && (
            <div className="space-y-2">
              {/* Connection Line */}
              <div className="flex items-center gap-2 pl-6 text-muted-foreground">
                <div className="w-px h-4 bg-border" />
              </div>

              <div className="pl-6 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <ChevronRight className="h-3 w-3" />
                  <span>{childFacilities.length} Child Health Center{childFacilities.length !== 1 ? "s" : ""}</span>
                </div>

                <div className="flex flex-col gap-2">
                  {childFacilities.map((child, index) => (
                    <div key={child.id} className="space-y-2">
                      <div className="flex items-start gap-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="mt-1 text-muted-foreground">
                          {getFacilityIcon(child.facilityType)}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{child.name}</span>
                            {getFacilityTypeBadge(child.facilityType)}
                          </div>
                        </div>
                      </div>
                      {index < childFacilities.length - 1 && (
                        <div className="flex items-center gap-2 pl-6 text-muted-foreground">
                          <div className="w-px h-2 bg-border/50" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No children message for hospitals */}
          {facility.facilityType === "hospital" && (!childFacilities || childFacilities.length === 0) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 pl-6 text-muted-foreground">
                <div className="w-px h-4 bg-border" />
              </div>
              <div className="pl-6">
                <p className="text-xs text-muted-foreground italic">
                  No child health centers in this district
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
