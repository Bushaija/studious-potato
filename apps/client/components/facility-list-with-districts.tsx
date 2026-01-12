"use client";

import * as React from "react";
import { Building2, Home, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { AccessibleFacility } from "@/fetchers/facilities/get-accessible-facilities";

interface FacilityListWithDistrictsProps {
  facilities: AccessibleFacility[];
  selectedFacilityId?: number;
  onFacilitySelect?: (facilityId: number) => void;
  className?: string;
  showDistrictBoundaries?: boolean;
}

/**
 * Component to display a list of facilities grouped by district
 * Shows clear district boundaries and facility hierarchy information
 */
export function FacilityListWithDistricts({
  facilities,
  selectedFacilityId,
  onFacilitySelect,
  className,
  showDistrictBoundaries = true,
}: FacilityListWithDistrictsProps) {
  // Group facilities by district
  const facilitiesByDistrict = React.useMemo(() => {
    const groups: Record<string, AccessibleFacility[]> = {};
    
    facilities.forEach(facility => {
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
  }, [facilities]);

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
        Health Center
      </Badge>
    );
  };

  if (facilities.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        No facilities available
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {Object.entries(facilitiesByDistrict).map(([districtName, districtFacilities], districtIndex) => (
        <div key={districtName} className="space-y-3">
          {/* District Header with Boundary */}
          {showDistrictBoundaries && (
            <>
              {districtIndex > 0 && <Separator className="my-6" />}
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-2">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">{districtName} District</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {districtFacilities.length} {districtFacilities.length === 1 ? "facility" : "facilities"}
                  </Badge>
                </div>
              </div>
            </>
          )}

          {/* Facilities List */}
          <div className="space-y-2 pl-2">
            {districtFacilities.map((facility) => {
              const isSelected = facility.id === selectedFacilityId;
              const isClickable = !!onFacilitySelect;

              return (
                <div
                  key={facility.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-all",
                    isSelected && "border-primary bg-primary/5 shadow-sm",
                    !isSelected && "border-border bg-card",
                    isClickable && "cursor-pointer hover:bg-muted/50 hover:border-muted-foreground/30"
                  )}
                  onClick={() => isClickable && onFacilitySelect(facility.id)}
                  role={isClickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (isClickable && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onFacilitySelect(facility.id);
                    }
                  }}
                  aria-label={`${facility.name}, ${facility.facilityType === "hospital" ? "Hospital" : "Health Center"}, ${districtName} District${isSelected ? ", selected" : ""}`}
                >
                  <div className={cn(
                    "mt-1",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}>
                    {getFacilityIcon(facility.facilityType)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "font-medium text-sm",
                        isSelected && "font-semibold text-primary"
                      )}>
                        {facility.name}
                      </span>
                      {getFacilityTypeBadge(facility.facilityType)}
                    </div>
                    {!showDistrictBoundaries && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{districtName} District</span>
                      </div>
                    )}
                    {facility.parentFacilityId && (
                      <p className="text-xs text-muted-foreground">
                        Reports to parent hospital
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
