"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useGetExecutionById } from "@/hooks/queries/executions/use-get-execution-by-id";
import { useExecutionActivities } from "@/hooks/queries/executions/use-execution-activities";
import { ExecutionDetailsHeader } from "./execution-details-header";
import { ExecutionDetailsSkeleton } from "./execution-details-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load the heavy form component
const EnhancedExecutionForm = dynamic(
  () => import("@/features/execution/components/v2/enhanced-execution-form").then((mod) => ({ default: mod.EnhancedExecutionForm })),
  {
    loading: () => (
      <div className="mt-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
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

interface ExecutionDetailsViewProps {
  executionId: number;
  onBack: () => void;
  onEdit: () => void;
}

function toQuarterLabel(v: string | null | undefined): "Q1" | "Q2" | "Q3" | "Q4" {
  const q = String(v || "Q1").toUpperCase();
  return (["Q1", "Q2", "Q3", "Q4"].includes(q) ? q : "Q1") as any;
}

export function ExecutionDetailsView({ executionId, onBack, onEdit }: ExecutionDetailsViewProps) {
  const searchParams = useSearchParams();
  const { data: executionResponse, isLoading, error } = useGetExecutionById({ id: executionId });

  console.log("[CLIENT EXECUTION DATA]: ", executionResponse)
  // Extract the main execution data from the response
  const execution = executionResponse?.entry;

  // Get the activities schema to create ID-to-code mapping
  // Only fetch activities if we have execution data
  // Use corrected UI context for activities query
  const activitiesQuery = useExecutionActivities({
    projectType: executionResponse?.ui?.context?.projectType || execution?.formData?.context?.projectType || execution?.schema?.projectType || "HIV",
    facilityType: executionResponse?.ui?.context?.facilityType || execution?.formData?.context?.facilityType || execution?.schema?.facilityType || "health_center",
    enabled: !!execution // Only run this query when execution data is available
  });

  const projectType = useMemo(() => {
    // Use the corrected UI context first (from server-side context resolution)
    const fromUIContext = executionResponse?.ui?.context?.projectType;
    const fromProject = execution?.project?.projectType;
    const fromContext = execution?.formData?.context?.projectType;
    const fromSchema = execution?.schema?.projectType;
    const fromMetadata = execution?.metadata?.projectType;
    const fromUrl = searchParams?.get("program");

    const val = (fromUIContext || fromProject || fromContext || fromSchema || fromMetadata || fromUrl || "HIV").toString();
    // Normalize "Malaria" to "MAL" for consistency with activity codes
    const normalized = val === "Malaria" ? "MAL" : val;
    const result = (["HIV", "MAL", "TB"].includes(normalized) ? normalized : "HIV") as "HIV" | "MAL" | "TB";
    return result;
  }, [executionResponse, execution, searchParams]);

  const facilityType = useMemo(() => {
    // Use the corrected UI context first (from server-side context resolution)
    const fromUIContext = executionResponse?.ui?.context?.facilityType;
    const fromContext = execution?.formData?.context?.facilityType;
    const fromSchema = execution?.schema?.facilityType;
    const fromFacility = execution?.facility?.facilityType;
    const fromMetadata = execution?.metadata?.facilityType;
    const fromUrl = searchParams?.get("facilityType");

    const val = (fromUIContext || fromContext || fromSchema || fromFacility || fromMetadata || fromUrl || "health_center").toString();
    const result = (["hospital", "health_center"].includes(val) ? val : "health_center") as "hospital" | "health_center";
    return result;
  }, [executionResponse, execution, searchParams]);

  const quarter = useMemo(() => {
    // Use the corrected UI context first (from server-side context resolution)
    const fromUIContext = executionResponse?.ui?.context?.quarter;
    const fromContext = execution?.formData?.context?.quarter;
    const fromMetadata = execution?.metadata?.quarter;
    const fromUrl = searchParams?.get("quarter");

    const result = toQuarterLabel((fromUIContext || fromContext || fromMetadata || fromUrl) as any);
    return result;
  }, [executionResponse, execution, searchParams]);

  const initialData = useMemo(() => {
    // Use the activities object from formData
    const activities = execution?.formData?.activities;
    const activitiesSchema = activitiesQuery.data;

    if (!activities || typeof activities !== 'object' || !activitiesSchema) return undefined;

    // Create ID-to-code mapping from the activities schema as fallback
    const idToCodeMapping: Record<string, string> = {};

    // Extract all activities from the hierarchical schema and create the mapping
    Object.values(activitiesSchema).forEach((categoryData: any) => {
      if (categoryData.subCategories) {
        // Category with subcategories (like B)
        Object.values(categoryData.subCategories).forEach((subCategoryData: any) => {
          if (subCategoryData.items) {
            subCategoryData.items.forEach((item: any) => {
              if (item.id && item.code) {
                idToCodeMapping[String(item.id)] = item.code;
              }
            });
          }
        });
      } else if (categoryData.items) {
        // Category with direct items (like A, D, E, G)
        categoryData.items.forEach((item: any) => {
          if (item.id && item.code) {
            idToCodeMapping[String(item.id)] = item.code;
          }
        });
      }
    });

    // Transform the activities object to the expected format
    const mapped = Object.entries(activities).reduce((acc: Record<string, any>, [idOrCode, activity]: [string, any]) => {
      // Helper function to safely convert to number
      const toNumber = (val: any): number => {
        if (val === null || val === undefined || val === '') return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
      };

      // The saved data already contains the activity code! Use it directly
      const activityCode = activity.code || idToCodeMapping[idOrCode] || idOrCode;

      // Helper to extract VAT fields - handle both object format {q1: x, q2: y} and direct values
      const extractVATField = (field: any) => {
        if (!field || typeof field !== 'object') return undefined;
        // If it's an object with quarter keys, return it as-is
        if (Object.keys(field).length > 0) return field;
        return undefined;
      };

      acc[activityCode] = {
        q1: toNumber(activity.q1),
        q2: toNumber(activity.q2),
        q3: toNumber(activity.q3),
        q4: toNumber(activity.q4),
        comment: String(activity.comment || ""),
        // Include payment tracking data
        paymentStatus: activity.paymentStatus || "unpaid",
        amountPaid: toNumber(activity.amountPaid),
        // Include VAT tracking data (if present) - preserve quarter-based structure
        ...(extractVATField(activity.netAmount) && { netAmount: activity.netAmount }),
        ...(extractVATField(activity.vatAmount) && { vatAmount: activity.vatAmount }),
        ...(extractVATField(activity.vatCleared) && { vatCleared: activity.vatCleared }),
      };
      return acc;
    }, {});


    return mapped;
  }, [execution, activitiesQuery.data]);

  // Loading state - wait for both execution data and activities schema
  if (isLoading || (execution && activitiesQuery.isLoading)) {
    return (
      <div className="space-y-6">
        <ExecutionDetailsSkeleton />
      </div>
    );
  }

  // Error state
  if (error || !execution || (execution && activitiesQuery.error)) {
    return (
      <div className="space-y-6">
        <ExecutionDetailsHeader
          execution={null}
          onBack={onBack}
          onEdit={onEdit}
          correctedContext={undefined}
        />
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to load execution details. The execution may not exist or you may not have permission to view it.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with facility info, actions, and metadata */}
      <ExecutionDetailsHeader
        execution={execution}
        onBack={onBack}
        onEdit={onEdit}
        correctedContext={executionResponse?.ui?.context}
      />

      {/* Context Correction Warning 
      {executionResponse?.metadata?.contextWarnings && executionResponse.metadata.contextWarnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Context corrections were applied:</p>
              <ul className="text-sm space-y-1">
                {executionResponse.metadata.contextWarnings.map((warning: string, index: number) => (
                  <li key={index} className="text-muted-foreground">• {warning}</li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                The system automatically uses the correct project and facility information from the database.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}*/}

      {/* Execution Form in ReadOnly Mode */}
      <Card>
        <CardContent className="p-0">
          <EnhancedExecutionForm
            projectType={projectType}
            facilityType={facilityType}
            quarter={quarter}
            mode="readOnly"
            executionId={executionId}
            initialData={initialData}
            projectId={execution?.projectId}
            facilityId={execution?.facilityId}
            reportingPeriodId={execution?.reportingPeriodId}
            facilityName={execution?.facility?.name || execution?.metadata?.facilityName}
            programName={projectType}
            schemaId={execution?.schemaId}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default ExecutionDetailsView;