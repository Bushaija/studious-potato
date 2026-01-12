"use client";

import { useState } from "react";
import { useGetFacilityOverview } from "@/hooks/queries/dashboard/use-get-facility-overview";
import { useGetTasks } from "@/hooks/queries/dashboard/use-get-tasks";
import { FacilityOverviewCard } from "@/components/dashboard/FacilityOverviewCard";
import { TasksCard } from "@/components/dashboard/TasksCard";
import { BudgetSummaryCards } from "@/components/dashboard/BudgetSummaryCards";
import { ProjectBreakdownCard } from "@/components/dashboard/ProjectBreakdownCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function AccountantDashboard() {
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | undefined>();

  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
  } = useGetFacilityOverview({ facilityId: selectedFacilityId });

  const {
    data: tasks,
    isLoading: tasksLoading,
    error: tasksError,
  } = useGetTasks({ facilityId: selectedFacilityId });

  const isLoading = overviewLoading || tasksLoading;
  const hasError = overviewError || tasksError;

  if (hasError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load dashboard data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!overview || !tasks) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your facility's budget and pending tasks
        </p>
      </div>

      {/* Facility Info */}
      <FacilityOverviewCard
        facility={overview.facility}
        reportingPeriod={overview.currentReportingPeriod}
        selectedFacilityId={selectedFacilityId}
        onFacilityChange={setSelectedFacilityId}
      />

      {/* Budget Summary Cards */}
      <BudgetSummaryCards budgetSummary={overview.budgetSummary} />

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Project Breakdown */}
        {/* <ProjectBreakdownCard projectBreakdown={overview.projectBreakdown} /> */}

        {/* Tasks & Deadlines */}
        {/* <TasksCard tasks={tasks} /> */}
      </div>
    </div>
  );
}
