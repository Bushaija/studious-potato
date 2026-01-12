"use client";

import dynamic from "next/dynamic";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { useGetCurrentReportingPeriod } from "@/hooks/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from "@/components/ui/skeleton";

import { ArrowLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Lazy load the planning creation tabs
const PlanningCreationTabs = dynamic(
  () => import("@/features/planning/components/planning-creation-tabs").then((mod) => ({ default: mod.PlanningCreationTabs })),
  {
    loading: () => (
      <Card className="mt-4">
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
    ),
  }
);

export default function CreatePlanningPage() {
  const { data: currentReportingPeriod } = useGetCurrentReportingPeriod();
  const searchParams = useSearchParams();
  const router = useRouter();

  const projectId = searchParams.get('projectId');
  const facilityId = searchParams.get('facilityId');
  const facilityName = searchParams.get('facilityName');
  const program = searchParams.get('program');
  const projectTypeParam = searchParams.get('projectType');
  const facilityType = searchParams.get('facilityType');
  const reportingPeriodId = searchParams.get('reportingPeriodId');

  // Convert program ID to program type string
  const getProgramType = (programParam: string | null): 'HIV' | 'TB' | 'Malaria' => {
    if (!programParam) return 'HIV';

    // If it's already a valid program type, return it
    if (['HIV', 'TB', 'Malaria'].includes(programParam)) {
      return programParam as 'HIV' | 'TB' | 'Malaria';
    }

    // If it's a numeric ID, convert it to program type
    const programId = parseInt(programParam, 10);
    switch (programId) {
      case 1:
        return 'HIV';
      case 2:
        return 'TB';
      case 3:
        return 'Malaria';
      default:
        return 'HIV';
    }
  };

  const isValidProjectType = (pt: string | null): pt is 'HIV' | 'TB' | 'Malaria' => {
    return pt === 'HIV' || pt === 'TB' || pt === 'Malaria';
  };

  // Prefer explicit projectType from query if valid; otherwise derive from program
  const programType = isValidProjectType(projectTypeParam)
    ? (projectTypeParam as 'HIV' | 'TB' | 'Malaria')
    : getProgramType(program);

  // Prefer numeric program as projectId when provided; fallback to explicit projectId; default 1
  const programAsProjectId = program && /^\d+$/.test(program) ? parseInt(program, 10) : null;
  const projectIdNum = programAsProjectId ?? (projectId ? parseInt(projectId, 10) : 1);
  const facilityIdNum = facilityId ? parseInt(facilityId, 10) : 2;
  const reportingPeriodIdNum = reportingPeriodId ? parseInt(reportingPeriodId, 10) : 1;

  const hasDialogData = facilityName && program && facilityType;


  // Handle success from both manual and upload modes
  const handleSuccess = useCallback((data: any) => {
    const { planningId, mode } = data;

    if (planningId) {
      // Show success toast
      toast.success(
        mode === 'upload'
          ? 'Planning data uploaded successfully!'
          : 'Planning created successfully!'
      );

      // Redirect to planning details page
      router.push(`/dashboard/planning/details/${planningId}`);
    } else {
      // Fallback to planning list if no planningId
      toast.success('Planning created successfully!');
      router.push('/dashboard/planning');
    }
  }, [router]);

  // Handle cancel/back navigation
  const handleCancel = useCallback(() => {
    router.push('/dashboard/planning');
  }, [router]);

  return (
    <div className="container mx-auto p-4 md:p-8 h-full">
      {/* Page Header - Back Navigation */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Planning List
          </Button>
        </div>
      </div>

      {/* Show a brief info message when coming from dialog */}
      {hasDialogData && (
        <div>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div>
                {/* <h1 className="text-2xl font-semibold">Create New Planning</h1> */}
                <h1 className="text-xl font-semibold capitalize">{facilityName}{" "}{"New Plan"}</h1>
                <div className="flex h-5 items-center space-x-4 mt-2">
                  <div className="text-gray-600 mt-1 font-normal">{programType}{" "}{"Program"}</div>
                  <Separator orientation="vertical" />
                  <div className="text-gray-600 font-normal"> {facilityType === 'health_center' ? 'Health Center' : 'Hospital'}</div>
                  <Separator orientation="vertical" />
                  <div className="text-gray-600 mt-1 font-normal">{currentReportingPeriod?.year - 1} - {currentReportingPeriod?.year}</div>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
        </div >
      )}

      {/* Tabbed Planning Creation Interface */}
      <PlanningCreationTabs
        projectId={projectIdNum}
        facilityId={facilityIdNum}
        reportingPeriodId={reportingPeriodIdNum}
        facilityName={facilityName || undefined}
        program={programType}
        facilityType={facilityType as 'hospital' | 'health_center' || 'hospital'}
        projectType={programType}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        defaultTab="manual"
      />
    </div>
  );
}