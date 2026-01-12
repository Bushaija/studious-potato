import { Plan, Activity } from '@/features/planning/schema/hiv/plan-form-schema';

// This type can be refined to match the backend's expected input structure precisely.
export type PlanSubmissionData = {
  facilityName: string;
  facilityType: string;
  district: string;
  province: string;
  period: string;
  program: string;
  isHospital: boolean;
  createdBy: string;
  submittedBy: string;
  activities: Omit<Activity, 'id' | 'amountQ1' | 'amountQ2' | 'amountQ3' | 'amountQ4' | 'totalBudget'>[];
};

/**
 * Filters and validates activities before submission.
 * @param activities - The full list of activities from the form.
 * @returns An array of valid activities ready for the backend.
 */
function filterValidActivities(activities: Activity[]): Activity[] {
  const validActivities = activities.filter(activity => {
    const hasFrequency = activity.frequency && activity.frequency > 0;
    const hasUnitCost = activity.unitCost && activity.unitCost > 0;
    const hasCounts = (activity.countQ1 || 0) > 0 || 
                     (activity.countQ2 || 0) > 0 || 
                     (activity.countQ3 || 0) > 0 || 
                     (activity.countQ4 || 0) > 0;
    return hasFrequency && hasUnitCost && hasCounts;
  });

  if (validActivities.length === 0) {
    throw new Error('Please fill in at least one activity with frequency, unit cost, and quarterly counts.');
  }
  
  
  return validActivities;
}

/**
 * Prepares the final data payload for the API.
 * @param data - The form data and metadata.
 * @returns The clean data object for submission.
 */
function prepareSubmissionData(data: Plan, metadata: any, isHospital: boolean): PlanSubmissionData {
  const validActivities = filterValidActivities(data.activities);

  return {
    facilityName: metadata.facilityName,
    facilityType: metadata.facilityType,
    district: metadata.district,
    province: metadata.province,
    period: metadata.period,
    program: metadata.program,
    isHospital: isHospital,
    createdBy: metadata.createdBy,
    submittedBy: metadata.submittedBy,
    activities: validActivities.map((activity, index) => ({
      activityCategory: activity.activityCategory,
      typeOfActivity: activity.typeOfActivity,
      activity: activity.activity || "",
      frequency: Number(activity.frequency) || 1,
      unitCost: Number(activity.unitCost) || 0,
      countQ1: Number(activity.countQ1) || 0,
      countQ2: Number(activity.countQ2) || 0,
      countQ3: Number(activity.countQ3) || 0,
      countQ4: Number(activity.countQ4) || 0,
      comment: activity.comment || "",
      sortOrder: index
    }))
  };
}

/**
 * Submits the plan data to the API.
 * @param data - The form data (the plan).
 * @param metadata - The plan's metadata.
 * @param isEdit - Flag for edit mode (PUT request).
 * @returns The response data from the API.
 */
export async function submitPlan(planData: Plan, metadata: any, isHospital: boolean, isEdit: boolean = false) {
  const cleanData = prepareSubmissionData(planData, metadata, isHospital);
  

  const response = await fetch('/api/plan', {
    method: isEdit ? 'PUT' : 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(cleanData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    

    if (errorData?.errors) {
      const errorMessages = Object.entries(errorData.errors)
        .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
        .join('\n');
      throw new Error(`Validation failed:\n${errorMessages}`);
    }
    
    throw new Error(errorData?.message || `HTTP ${response.status}: Failed to save plan`);
  }

  const responseData = await response.json();
  

  return responseData;
} 