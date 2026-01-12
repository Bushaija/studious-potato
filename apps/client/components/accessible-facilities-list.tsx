"use client";

import * as React from "react";
import { Building2, Home, MapPin, Loader2, AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useHierarchyContext } from "@/hooks/use-hierarchy-context";

interface AccessibleFacilitiesListProps {
  className?: string;
  showTitle?: boolean;
  onFacilityClick?: (facilityId: number) => void;
}

/**
 * Component to display all facilities accessible to the current user
 * Groups facilities by district and shows hierarchy relationships
 */
export function AccessibleFacilitiesList({
  className,
  showTitle = true,
  onFacilityClick,
}: AccessibleFacilitiesListProps) {
  const { 
    accessibleFacilities, 
    isLoading, 
    isError,
    userFacilityId,
    isHospitalUser,
  } = useHierarchyContext();

  // Group facilities by district
  const facilitiesByDistrict = React.useMemo(() => {
    const groups: Record<string, typeof accessibleFacilities> = {};
    
    accessibleFacilities.forEach(facility => {
      const districtName = facility.districtName;
      if (!groups[districtName]) {
        groups[districtName] = [];
      }
      groups[districtName].push(facility);
    });

    // Sort facilities within each district: hospitals first, then health centers
    Object.keys(groups).forEach(district => {
      groups[district].sort((a, b) => {
        if (a.facilityType === b.facilityType) {
          return a.name.localeCompare(b.name);
        }
        return a.facilityType === "hospital" ? -1 : 1;
      });
    });

    return groups;
  }, [accessibleFacilities]);

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
          className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 text-xs"
        >
          Hospital
        </Badge>
      );
    }
    return (
      <Badge 
        variant="outline" 
        className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 text-xs"
      >
        HC
      </Badge>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        {showTitle && (
          <CardHeader>
            <CardTitle>Accessible Facilities</CardTitle>
            <CardDescription>Loading your accessible facilities...</CardDescription>
          </CardHeader>
        )}
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading facilities...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card className={cn("w-full border-destructive", className)}>
        {showTitle && (
          <CardHeader>
            <CardTitle>Accessible Facilities</CardTitle>
            <CardDescription className="text-destructive">
              Failed to load accessible facilities
            </CardDescription>
          </CardHeader>
        )}
        <CardContent className="py-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>Unable to load facilities</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (accessibleFacilities.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        {showTitle && (
          <CardHeader>
            <CardTitle>Accessible Facilities</CardTitle>
            <CardDescription>No facilities available</CardDescription>
          </CardHeader>
        )}
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">
            You don't have access to any facilities
          </p>
        </CardContent>
      </Card>
    );
  }

  // Count child facilities for hospitals
  const getChildCount = (hospitalId: number) => {
    return accessibleFacilities.filter(
      f => f.parentFacilityId === hospitalId && f.facilityType === "health_center"
    ).length;
  };

  return (
    <Card className={cn("w-full", className)}>
      {showTitle && (
        <CardHeader>
          <CardTitle>Accessible Facilities</CardTitle>
          <CardDescription>
            {isHospitalUser 
              ? "You can access your hospital and all child health centers in your district"
              : "You can access your facility"}
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{accessibleFacilities.length}</Badge>
            <span className="text-muted-foreground">
              {accessibleFacilities.length === 1 ? "Facility" : "Facilities"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{Object.keys(facilitiesByDistrict).length}</Badge>
            <span className="text-muted-foreground">
              {Object.keys(facilitiesByDistrict).length === 1 ? "District" : "Districts"}
            </span>
          </div>
        </div>

        {/* Facilities grouped by district */}
        <div className="space-y-6">
          {Object.entries(facilitiesByDistrict).map(([districtName, facilities]) => (
            <div key={districtName} className="space-y-3">
              {/* District Header */}
              <div className="flex items-center gap-2 pb-2 border-b">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">{districtName} District</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {facilities.length} {facilities.length === 1 ? "facility" : "facilities"}
                </Badge>
              </div>

              {/* Facilities List */}
              <div className="space-y-2">
                {facilities.map((facility) => {
                  const isCurrentFacility = facility.id === userFacilityId;
                  const childCount = facility.facilityType === "hospital" ? getChildCount(facility.id) : 0;
                  const isClickable = !!onFacilityClick;

                  const content = (
                    <div
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                        isCurrentFacility && "border-primary bg-primary/5",
                        !isCurrentFacility && "border-border bg-card",
                        isClickable && "cursor-pointer hover:bg-muted/50"
                      )}
                      onClick={() => isClickable && onFacilityClick(facility.id)}
                      role={isClickable ? "button" : undefined}
                      tabIndex={isClickable ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (isClickable && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          onFacilityClick(facility.id);
                        }
                      }}
                    >
                      <div className={cn(
                        "mt-1",
                        isCurrentFacility ? "text-primary" : "text-muted-foreground"
                      )}>
                        {getFacilityIcon(facility.facilityType)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "font-medium text-sm",
                            isCurrentFacility && "font-semibold"
                          )}>
                            {facility.name}
                          </span>
                          {getFacilityTypeBadge(facility.facilityType)}
                          {isCurrentFacility && (
                            <Badge variant="default" className="text-xs">
                              Your Facility
                            </Badge>
                          )}
                        </div>
                        {childCount > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ChevronRight className="h-3 w-3" />
                            <span>{childCount} child health center{childCount !== 1 ? "s" : ""}</span>
                          </div>
                        )}
                        {facility.parentFacilityId && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ChevronRight className="h-3 w-3" />
                            <span>Reports to parent hospital</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );

                  return <div key={facility.id}>{content}</div>;
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
