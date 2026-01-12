"use client";

import { ReadonlyPlanningForm } from "@/features/planning/v3/readonly-planning-form";
import { PlanningDetailsSkeleton } from "./planning-details-skeleton";

interface PlanningDetailsViewProps {
  planningId: string;
  onBack: () => void;
}

export function PlanningDetailsView({ planningId, onBack }: PlanningDetailsViewProps) {
  return (
    <ReadonlyPlanningForm 
      planningId={planningId}
      onBack={onBack}
      showHeader={true}
    />
  );
}

