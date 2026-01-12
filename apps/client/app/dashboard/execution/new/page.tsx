import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Lazy load the heavy form component
const EnhancedExecutionFormAutoLoad = dynamic(
  () => import("@/features/execution/components/v2/enhanced-execution-form-auto-load"),
  {
    loading: () => (
      <div className="mt-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    ),
  }
);

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

function asString(value: string | string[] | undefined, fallback = ""): string {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

export default async function CreateDynamicExecutionPage(props: PageProps) {
  const awaitedSearchParams = typeof (props.searchParams as any)?.then === "function"
    ? await (props.searchParams as Promise<Record<string, string | string[] | undefined>>)
    : ((props.searchParams as Record<string, string | string[] | undefined>) ?? {});

  const rawProgram = asString(awaitedSearchParams.projectId).trim(); // TODO: fix the URL param program to use programName over Id
  const rawFacilityType = asString(awaitedSearchParams.facilityType).trim();
  const rawQuarter = asString(awaitedSearchParams.quarter).trim();

  const allowedPrograms = new Set(["HIV", "Malaria", "TB", "MAL"]); // Accept both Malaria and MAL
  const allowedFacilityTypes = new Set(["hospital", "health_center"]);
  const allowedQuarters = new Set(["Q1", "Q2", "Q3", "Q4"]);

  // Normalize Malaria to MAL for consistency with activity codes
  const normalizedProgram = rawProgram.toUpperCase() === "MALARIA" ? "MAL" : rawProgram;
  const projectType = (allowedPrograms.has(normalizedProgram) ? normalizedProgram : "HIV") as "HIV" | "MAL" | "TB";
  const facilityType = (allowedFacilityTypes.has(rawFacilityType) ? rawFacilityType : "health_center") as "hospital" | "health_center";
  

  // Default to Q1 for new executions if no quarter specified
  const quarter = (allowedQuarters.has(rawQuarter) ? rawQuarter : "Q1") as "Q1" | "Q2" | "Q3" | "Q4";

  return (
    <div className="p-4">
      <EnhancedExecutionFormAutoLoad 
        projectType={projectType} 
        facilityType={facilityType} 
        quarter={quarter}
        mode="create"
        // Pass additional params that might be needed for smart submission  
        projectId={(() => {
          const projectIdParam = asString(awaitedSearchParams.projectId);
          const programParam = asString(awaitedSearchParams.program);
          
          // If projectId is numeric, use it; otherwise use program parameter
          if (/^\d+$/.test(projectIdParam)) {
            return Number(projectIdParam);
          } else if (/^\d+$/.test(programParam)) {
            return Number(programParam);
          }
          return undefined;
        })()}
        facilityId={awaitedSearchParams.facilityId ? Number(awaitedSearchParams.facilityId) : undefined}
        reportingPeriodId={awaitedSearchParams.reportingPeriodId ? Number(awaitedSearchParams.reportingPeriodId) : undefined}
        facilityName={asString(awaitedSearchParams.facilityName) || undefined}
        programName={projectType === 'MAL' ? 'Malaria' : projectType} // Convert MAL back to Malaria for display
      />
    </div>
  );
}