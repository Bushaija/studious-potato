"use client";

import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { usePlanningDetail } from "@/hooks/queries/planning/use-get-planning-details";
import { ArrowLeft, Edit, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ApprovalStatus } from "@/types/planning-approval";
import { useUser } from "@/components/providers/session-provider";

// Lazy load heavy components
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

const ApprovalStatusSection = dynamic(
  () => import("@/components/planning/approval-status-section").then((mod) => ({ default: mod.ApprovalStatusSection })),
  {
    loading: () => (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    ),
  }
);

const ApprovalActionsCard = dynamic(
  () => import("@/components/planning/approval-actions-card").then((mod) => ({ default: mod.ApprovalActionsCard })),
  {
    loading: () => (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    ),
  }
);

import { useCallback } from "react";

export default function PlanningDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const planningId = params.id as string;
  const user = useUser();

  const { data: planning, isLoading, error, refetch } = usePlanningDetail(planningId);
  
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Role and status checks for edit button visibility
  const isDaf = user?.role === "daf";
  const isAccountant = user?.role === "accountant";
  const isDraft = planning?.approvalStatus === "DRAFT";
  const isPending = planning?.approvalStatus === "PENDING";
  const isRejected = planning?.approvalStatus === "REJECTED";
  
  // Show edit button for: DRAFT (non-DAF users), PENDING (accountants only), or REJECTED (accountants only)
  // APPROVED plans cannot be edited
  const canEdit = (isDraft && !isDaf) || (isPending && isAccountant) || (isRejected && isAccountant);

  if (!planningId) {
    router.push("/dashboard/planning");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
          {/* Header Skeleton */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-9 w-32" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
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
            onClick={() => router.push("/dashboard/planning")}
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
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/planning')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Planning List
            </Button>
            
            {canEdit && (
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push(`/dashboard/planning/edit/${planningId}`)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
          
          <div>
            <h1 className="text-2xl font-bold">Planning Details</h1>
            <p className="text-gray-600 mt-1">
              View planning activities and budget information
            </p>
          </div>
        </div>

        {/* Approval Status and Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <ApprovalStatusSection
            approvalStatus={(planning.approvalStatus as ApprovalStatus) || "DRAFT"}
            reviewedBy={planning.reviewedBy}
            reviewedByName={planning.reviewedByName}
            reviewedAt={planning.reviewedAt}
            reviewComments={planning.reviewComments}
            reviewer={planning.reviewer}
          />
          
          <ApprovalActionsCard
            planningId={Number(planningId)}
            approvalStatus={(planning.approvalStatus as ApprovalStatus) || "DRAFT"}
            onRefresh={handleRefresh}
          />
        </div>

        <EnhancedPlanningForm
          mode="view"
          planningId={planningId}
          projectId={planning.projectId}
          facilityId={planning.facilityId}
          reportingPeriodId={planning.reportingPeriodId}
          onCancel={() => router.push("/dashboard/planning")}
          showHeader
        />
      </div>
    </div>
  );
}
