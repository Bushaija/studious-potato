import { z } from "zod";
// centralized activities

// NOTE: Hooks cannot be used in this schema module. We'll use the static constant for schema generation.
// If dynamic categories are required, move that logic into a React component and call the hook there.
const activities = {};

// Base schema for a single activity row
const baseActivitySchema = z.object({
  id: z.string().optional(),
  activityCategory: z.string(),
  typeOfActivity: z.string(),
  activity: z.string().optional(),
  frequency: z
    .number()
    .min(0, { message: "Frequency cannot be negative" })
    .optional(),
  unitCost: z
    .number()
    .min(0, { message: "Unit cost cannot be negative" })
    .optional(),
  countQ1: z.number().int().min(0).optional(),
  countQ2: z.number().int().min(0).optional(),
  countQ3: z.number().int().min(0).optional(),
  countQ4: z.number().int().min(0).optional(),
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
  
  // Required fields - no defaults, user must input
  frequency: undefined,        // Will be validated as required
  unitCost: undefined,        // Will be validated as required
  
  // Optional quarter counts - can be 0 or undefined
  countQ1: undefined,         // Let user decide if they want to enter data
  countQ2: undefined,
  countQ3: undefined,
  countQ4: undefined,
  
  // Calculated fields - always 0 initially
  amountQ1: 0,
  amountQ2: 0,
  amountQ3: 0,
  amountQ4: 0,
  totalBudget: 0,
  
  // Optional fields
  comment: "",
  planningActivityId: undefined,
  planningDataId: undefined,
});

// Calculate amount for a quarter
export const calculateQuarterAmount = (
  frequency: number,
  unitCost: number | undefined,
  count: number
): number => {
  return frequency * (unitCost || 0) * count;
};

// Calculate total budget for an activity
export const calculateTotalBudget = (activity: Activity): number => {
  const amountQ1 = calculateQuarterAmount(
    activity.frequency || 0,
    activity.unitCost,
    activity.countQ1 || 0
  );
  const amountQ2 = calculateQuarterAmount(
    activity.frequency || 0,
    activity.unitCost,
    activity.countQ2 || 0
  );
  const amountQ3 = calculateQuarterAmount(
    activity.frequency || 0,
    activity.unitCost,
    activity.countQ3 || 0
  );
  const amountQ4 = calculateQuarterAmount(
    activity.frequency || 0,
    activity.unitCost,
    activity.countQ4 || 0
  );

  return amountQ1 + amountQ2 + amountQ3 + amountQ4;
};

// Generate default activities for a new plan
export const generateDefaultActivities = (): Activity[] => {
  const result: Activity[] = [];

  // ACTIVITY_CATEGORIES is expected to be an object whose keys are category names
  // and values are arrays of activity descriptors.
  const categoriesSource: Record<string, { activity: string; typeOfActivity: string }[]> = {};

  Object.entries(categoriesSource).forEach(([category, entries]) => {
    entries.forEach((entry) => {
      result.push(
        createEmptyActivity(category, entry.typeOfActivity, entry.activity)
      );
    });
  });

  return result;
}; 