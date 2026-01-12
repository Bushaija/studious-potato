"use client";

import * as React from "react";
import { Building2, Home, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ReportFacilityContextProps {
  facilityName: string;
  facilityType: "hospital" | "health_center";
  districtName: string;
  className?: string;
  compact?: boolean;
}

/**
 * Component to display facility context information in report views
 * Shows facility name, type, and district in a clear, accessible format
 */
export function ReportFacilityContext({
  facilityName,
  facilityType,
  districtName,
  className,
  compact = false,
}: ReportFacilityContextProps) {
  // Get facility type icon
  const getFacilityIcon = () => {
    return facilityType === "hospital" ? (
      <Building2 className="h-4 w-4" />
    ) : (
      <Home className="h-4 w-4" />
    );
  };

  // Get facility type badge
  const getFacilityTypeBadge = () => {
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

  // Compact view for inline display
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 flex-wrap", className)}>
        <div className="flex items-center gap-1.5 text-sm">
          {getFacilityIcon()}
          <span className="font-medium">{facilityName}</span>
        </div>
        {getFacilityTypeBadge()}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{districtName}</span>
        </div>
      </div>
    );
  }

  // Full card view
  return (
    <Card className={cn("w-full border-2 border-black", className)}>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 text-muted-foreground">
              {getFacilityIcon()}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Facility</p>
                <p className="font-semibold text-base">{facilityName}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {getFacilityTypeBadge()}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{districtName} District</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
