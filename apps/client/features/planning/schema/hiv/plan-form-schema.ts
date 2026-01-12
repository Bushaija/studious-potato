import { z } from "zod";
// Note: constants moved to centralized API. Keep placeholder type.

// Base schema for a single activity row
const baseActivitySchema = z.object({
  id: z.string().optional(),
  activityCategory: z.string(),
  typeOfActivity: z.string(),
  activity: z.string().optional(),
  frequency: z
    .number()
    .min(0, { message: "Frequency cannot be negative" })
    .max(99999999.99, { message: "Frequency exceeds allowed maximum" })
    .optional(),
  unitCost: z
    .number()
    .min(0, { message: "Unit cost cannot be negative" })
    .max(999999999999999.99, {
      message: "Unit cost exceeds allowed maximum",
    })
    .optional(),
  countQ1: z
    .number()
    .int({ message: "Count Q1 must be a whole number" })
    .min(0, "Count Q1 cannot be negative")
    .optional()
    .default(0),
  countQ2: z
    .number()
    .int({ message: "Count Q2 must be a whole number" })
    .min(0, "Count Q2 cannot be negative")
    .optional()
    .default(0),
  countQ3: z
    .number()
    .int({ message: "Count Q3 must be a whole number" })
    .min(0, "Count Q3 cannot be negative")
    .optional()
    .default(0),
  countQ4: z
    .number()
    .int({ message: "Count Q4 must be a whole number" })
    .min(0, "Count Q4 cannot be negative")
    .optional()
    .default(0),
  amountQ1: z.number().optional(),
  amountQ2: z.number().optional(),
  amountQ3: z.number().optional(),
  amountQ4: z.number().optional(),
  totalBudget: z.number().optional(),
  comment: z.string().max(1000, { message: "Comment must be at most 1000 characters" }).optional(),
  planningActivityId: z.number().int().positive().optional(),
  planningDataId: z.number().int().positive().optional(),
  facilityId: z.number().int().positive().optional(),
  reportingPeriodId: z.number().int().positive().optional(),
});

export const activitySchema = baseActivitySchema;

export const planSchema = z.object({
  activities: z.array(activitySchema).min(1, "At least one activity is required"),
  generalTotalBudget: z.number().min(0, "General total budget must be a positive number").optional()
});

export type Activity = z.infer<typeof activitySchema>;
export type Plan = z.infer<typeof planSchema>;


// Export both activity categories for use
export const ACTIVITY_CATEGORIES: Record<string, any> = {};

// Helper to create a skeleton activity
export const createEmptyActivity = (
  activityCategory: string,
  typeOfActivity: string,
  activity?: string
): Activity => ({
  activityCategory,
  typeOfActivity,
  activity: activity || "",
  frequency: undefined,
  unitCost: undefined,
  countQ1: 0,
  countQ2: 0,
  countQ3: 0,
  countQ4: 0,
  amountQ1: 0,
  amountQ2: 0,
  amountQ3: 0,
  amountQ4: 0,
  totalBudget: 0,
  comment: "",
  planningActivityId: undefined,
  planningDataId: undefined,
});

// Calculate amount for a quarter
export const calculateQuarterAmount = (
  frequency: number | undefined,
  unitCost: number | undefined,
  count: number
): number => {
  return (frequency || 0) * (unitCost || 0) * count;
};

// Calculate total budget for an activity
export const calculateTotalBudget = (activity: Activity): number => {
  const amountQ1 = calculateQuarterAmount(
    activity.frequency,
    activity.unitCost,
    activity.countQ1 || 0
  );
  const amountQ2 = calculateQuarterAmount(
    activity.frequency,
    activity.unitCost,
    activity.countQ2 || 0
  );
  const amountQ3 = calculateQuarterAmount(
    activity.frequency,
    activity.unitCost,
    activity.countQ3 || 0
  );
  const amountQ4 = calculateQuarterAmount(
    activity.frequency,
    activity.unitCost,
    activity.countQ4 || 0
  );

  return amountQ1 + amountQ2 + amountQ3 + amountQ4;
};

// Generate default activities for a new plan
export const generateDefaultActivities = (isHospital = false): Activity[] => {
  const activities: Activity[] = [];
  const categoriesSource: Record<string, { activity: string; typeOfActivity: string }[]> = {};

  Object.entries(categoriesSource).forEach(([category, entries]) => {
    (entries as { activity: string; typeOfActivity: string }[]).forEach(entry => {
      activities.push(createEmptyActivity(
        category, 
        entry.typeOfActivity,
        entry.activity
      ));
    });
  });

  return activities;
}; 