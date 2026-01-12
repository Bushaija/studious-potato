"use client";

import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { usePlanningDetail } from "@/hooks/queries/planning/use-get-planning-details";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useCallback } from "react";

// Lazy load the heavy form component
const EnhancedPlanningForm = dynamic(
  () => import("@/features/planning/v3/enhanced-planning-form").then((mod) => ({ default: mod.EnhancedPlanningForm })),
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

export default function EditPlanningPage() {
  const params = useParams();
  const router = useRouter();
  const planningId = params.id as string;

  // Load planning data to get projectId, facilityId, and reportingPeriodId
  const { data: planning, isLoading, error } = usePlanningDetail(planningId);

  const handleSuccess = useCallback((data: any) => {
    console.log('🎉 [EditPlanningPage] onSuccess called with data:', data);
    toast.success('Planning updated successfully!');
    router.push(`/dashboard/planning`);
  }, [router]);

  const handleCancel = useCallback(() => {
    router.push(`/dashboard/planning`);
  }, [router]);

  if (!planningId) {
    router.push("/dashboard/test-plan/list");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
          {/* Header Skeleton */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-9 w-48" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>

          {/* Form Skeleton */}
          <Card>
            <CardHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table Skeleton */}
          <Card className="mt-4">
            <CardHeader>
              <Skeleton className="h-6 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !planning) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading planning data</p>
          <button 
            onClick={() => router.push("/dashboard/test-plan/list")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/planning')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Planning List
            </Button>
          </div>
          
          <div>
            <h1 className="text-2xl font-bold">Edit Planning</h1>
            <p className="text-gray-600 mt-1">
              Update planning activities and budget information
            </p>
          </div>
        </div>

        <EnhancedPlanningForm
          mode="edit"
          planningId={planningId}
          projectId={planning.projectId}
          facilityId={planning.facilityId}
          reportingPeriodId={planning.reportingPeriodId}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}

