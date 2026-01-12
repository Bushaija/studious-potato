import { z } from "zod";
import { Plan, Activity } from "@/features/planning/schema/hiv/plan-form-schema";
import { CreatePlanningDataSchema } from "@/app/api/[[...route]]/routes/planning-data/planning-data.schema";

// Import TB and Malaria types for type safety
import { Activity as TBActivity } from "@/features/planning/schema/tb/plan-form-schema";
import { Activity as MalariaActivity } from "@/features/planning/schema/malaria/plan-form-schema";

// Union type to support all program activities
type AnyActivity = Activity | TBActivity | MalariaActivity;

// Derived Type from API schema
export type CreatePlanningData = z.infer<typeof CreatePlanningDataSchema>;

/**
 * Maps the plan form data into an array of Planning Data rows ready for the /planning-data API.
 *
 * @param plan - The complete Plan object coming from the form.
 * @param opts - Additional context needed for each row.
 *   • reportingPeriodId – Active reporting period selected in UI.
 *   • facilityId – Facility for which the plan is being created.
 *   • projectId – Owning project (often returned after creating a new project).
 *   • activitiesMap – Maps a form activity label (id/type/title) to the DB `planningActivityId`.
 *
 * @returns Array of `CreatePlanningData` ready to be sent to the API.
 */
export const mapPlanningPayload = (
  plan: any, // Accept any plan type (HIV, Malaria, or TB)
  opts: {
    reportingPeriodId: number;
    facilityId: number;
    projectId: number;
    activitiesMap: Record<string, number>;
  }
): CreatePlanningData[] => {
  const seen = new Set<string>();
  const rows: CreatePlanningData[] = [];

  plan.activities.forEach((activity: AnyActivity) => {
    // Skip rows without a meaningful mapping key or no counts
    const key = activity.typeOfActivity || activity.activity || "";
    
    // Try multiple key variations for more robust matching
    const possibleKeys = [
      key,
      key.toLowerCase(),
      key.trim(),
      key.trim().toLowerCase(),
      activity.typeOfActivity,
      activity.activity,
    ].filter(Boolean).filter((k): k is string => typeof k === 'string');
    
    let planningActivityId = activity.planningActivityId;
    
    // If no explicit planningActivityId, try to find it via mapping
    if (!planningActivityId) {
      for (const possibleKey of possibleKeys) {
        if (opts.activitiesMap[possibleKey]) {
          planningActivityId = opts.activitiesMap[possibleKey];
          break;
        }
      }
    }

    // Check for counts - TB only has countQ1, HIV/Malaria have all quarters
    const hasCounts =
      (activity.countQ1 || 0) > 0 ||
      ((activity as any).countQ2 || 0) > 0 ||
      ((activity as any).countQ3 || 0) > 0 ||
      ((activity as any).countQ4 || 0) > 0;

    if (!planningActivityId || !hasCounts) {
      return;
    }

    const duplicateKey = `${opts.reportingPeriodId}-${opts.facilityId}-${planningActivityId}`;
    if (seen.has(duplicateKey)) {
      return;
    }
    seen.add(duplicateKey);

    const row = {
      planningActivityId,
      facilityId: opts.facilityId,
      reportingPeriodId: opts.reportingPeriodId,
      projectId: opts.projectId,
      frequency: activity.frequency ?? 0,
      unitCost: activity.unitCost ?? 0,
      countQ1: activity.countQ1 ?? 0,
      countQ2: (activity as any).countQ2 ?? 0, // All programs support Q2-Q4
      countQ3: (activity as any).countQ3 ?? 0,
      countQ4: (activity as any).countQ4 ?? 0,
      comment: activity.comment ?? '',
    } as const;

    // Validate against Zod schema to catch issues early (will throw if invalid)
    rows.push(CreatePlanningDataSchema.parse(row));
  });

  return rows;
};