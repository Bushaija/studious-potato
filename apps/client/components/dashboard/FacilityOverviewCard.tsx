import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FacilityOverviewCardProps {
  facility: {
    id: number;
    name: string;
    facilityType: string;
  };
  reportingPeriod: {
    id: number;
    year: number;
    periodType: string;
    startDate: string;
    endDate: string;
    status: string;
  } | null;
  selectedFacilityId?: number;
  onFacilityChange: (facilityId: number | undefined) => void;
}

export function FacilityOverviewCard({
  facility,
  reportingPeriod,
}: FacilityOverviewCardProps) {
  return (
    <section className="flex items-end w-full">
      <div className="flex justify-between w-full">
        <div className="flex items-start gap-2 w-full">
          <div className="space-y-1 w-full">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {facility.name}
              
            </CardTitle>
            <CardDescription className="capitalize flex justify-between">
              <span>{facility.facilityType.replace("_", " ")}</span>
            </CardDescription>
            {/* {reportingPeriod && (
            <Badge variant={reportingPeriod.status === "ACTIVE" ? "default" : "secondary"}>
              {reportingPeriod.status}
            </Badge>
          )} */}
          </div>
        </div>

        <div className="w-[400px]">
        {reportingPeriod && (
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      FY {reportingPeriod.year} ({reportingPeriod.periodType})
                    </span>
                    <span className="text-xs">
                      {new Date(reportingPeriod.startDate).toLocaleDateString()} -{" "}
                      {new Date(reportingPeriod.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              )}
        </div>
      </div>
      
    </section>
  );
}
