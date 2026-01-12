"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useCheckExistingExecution from "@/hooks/queries/executions/use-check-existing-execution";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SmartExecutionRouterProps {
  projectId?: number;
  facilityId?: number;
  reportingPeriodId?: number;
  children: React.ReactNode;
}

export function SmartExecutionRouter({ 
  projectId, 
  facilityId, 
  reportingPeriodId, 
  children 
}: SmartExecutionRouterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [redirectionInfo, setRedirectionInfo] = useState<{
    executionId: number;
    shouldNavigateToEdit: boolean;
  } | null>(null);

  // Check if we have the necessary parameters for checking existing data
  const canCheck = Boolean(
    projectId && 
    facilityId && 
    reportingPeriodId
  );

  const { data: existingExecution, isLoading, error } = useCheckExistingExecution(
    {
      projectId: String(projectId || ""),
      facilityId: String(facilityId || ""),
      reportingPeriodId: String(reportingPeriodId || ""),
    }
  );

  useEffect(() => {
    if (existingExecution?.exists && existingExecution?.entry?.id && canCheck) {
      const responseData = existingExecution;
      const executionId = responseData.entry.id;
      
      // Check if we're already on an edit page
      const currentPath = window.location.pathname;
      const isOnEditPage = currentPath.includes(`/edit/${executionId}`);
      
      // Check if we're working on a non-first quarter
      const currentQuarter = searchParams?.get("quarter") || "Q1";
      const isNotFirstQuarter = currentQuarter !== "Q1";
      
      // If we should be in edit mode but we're on new page, suggest redirect
      if (!isOnEditPage && (isNotFirstQuarter || responseData.exists)) {
        setRedirectionInfo({
          executionId,
          shouldNavigateToEdit: true,
        });
      }
    }
  }, [existingExecution, canCheck, searchParams]);

  const handleRedirectToEdit = () => {
    if (redirectionInfo?.executionId) {
      const baseUrl = "/dashboard/execution/edit";
      const currentParams = new URLSearchParams(searchParams?.toString() || "");
      
      // Add executionId to the edit URL
      currentParams.set("executionId", String(redirectionInfo.executionId));
      
      const editUrl = `${baseUrl}/${redirectionInfo.executionId}?${currentParams.toString()}`;
      router.push(editUrl);
    }
  };

  const handleContinueAnyway = () => {
    setShouldRedirect(false);
    setRedirectionInfo(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Checking for existing execution...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error checking for existing execution: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  // Show redirect suggestion if we found an existing execution
  if (redirectionInfo?.shouldNavigateToEdit && !shouldRedirect) {
    return (
      <div className="space-y-4 p-6">
        <Alert>
          <AlertDescription className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">📋 Existing Execution Found</h3>
              <p>
                We found an existing execution record for this combination. 
                Since you're working on a different quarter, it's recommended to edit the existing record 
                instead of creating a new one.
              </p>
              <div className="text-sm bg-blue-50 p-3 rounded-md">
                <strong>What this means:</strong>
                <ul className="mt-1 ml-4 list-disc">
                  <li>Your existing Q1 data will be preserved</li>
                  <li>New quarter data will be added to the same record</li>
                  <li>All quarters will be visible in the form</li>
                </ul>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleRedirectToEdit} className="flex-1">
                📝 Edit Existing Execution
              </Button>
              <Button variant="outline" onClick={handleContinueAnyway}>
                ➕ Continue with New Execution
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Render children normally if no redirect needed or user chose to continue
  return <>{children}</>;
}
