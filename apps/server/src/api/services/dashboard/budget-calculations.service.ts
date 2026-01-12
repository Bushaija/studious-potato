/**
 * Budget Calculation Service
 * 
 * Provides utility functions for calculating budget metrics from form data entries.
 * Handles both planning (allocated budget) and execution (spent budget) data structures.
 */

interface FormDataEntry {
  formData: any;
  entityType?: string;
}

/**
 * Calculate allocated budget from planning form data entries
 * 
 * Planning data structure: { activities: { [key]: { total_budget: number } } }
 * 
 * @param planningEntries - Array of planning form data entries
 * @returns Total allocated budget amount
 */
export function calculateAllocatedBudget(planningEntries: FormDataEntry[]): number {
  return planningEntries.reduce((sum, entry) => {
    if (!entry.formData?.activities) {
      return sum;
    }

    // Handle activities as object (most common structure)
    if (typeof entry.formData.activities === 'object' && !Array.isArray(entry.formData.activities)) {
      const activities = Object.values(entry.formData.activities);
      const entryTotal = activities.reduce((actSum: number, activity: any) => {
        if (activity && typeof activity === 'object') {
          // Primary field: total_budget
          if (typeof activity.total_budget === 'number') {
            return actSum + activity.total_budget;
          }
          // Fallback fields
          if (typeof activity.budget === 'number') {
            return actSum + activity.budget;
          }
          if (typeof activity.amount === 'number') {
            return actSum + activity.amount;
          }
        }
        return actSum;
      }, 0);
      return sum + entryTotal;
    }

    // Handle activities as array (alternative structure)
    if (Array.isArray(entry.formData.activities)) {
      const entryTotal = entry.formData.activities.reduce((actSum: number, activity: any) => {
        if (activity && typeof activity === 'object') {
          if (typeof activity.total_budget === 'number') {
            return actSum + activity.total_budget;
          }
          if (typeof activity.budget === 'number') {
            return actSum + activity.budget;
          }
          if (typeof activity.amount === 'number') {
            return actSum + activity.amount;
          }
        }
        return actSum;
      }, 0);
      return sum + entryTotal;
    }

    return sum;
  }, 0);
}

/**
 * Calculate spent budget from execution form data entries
 * 
 * Execution data structure: { rollups: { bySection: { [key]: { total: number } } } }
 * 
 * @param executionEntries - Array of execution form data entries
 * @returns Total spent budget amount
 */
export function calculateSpentBudget(executionEntries: FormDataEntry[]): number {
  return executionEntries.reduce((sum, entry) => {
    // Primary structure: rollups.bySection
    if (entry.formData?.rollups?.bySection) {
      const sections = Object.values(entry.formData.rollups.bySection);
      const entryTotal = sections.reduce((secSum: number, section: any) => {
        if (section && typeof section === 'object' && typeof section.total === 'number') {
          return secSum + section.total;
        }
        return secSum;
      }, 0);
      return sum + entryTotal;
    }

    // Fallback: activities with cumulative_balance (alternative execution structure)
    if (entry.formData?.activities) {
      const activities = Array.isArray(entry.formData.activities)
        ? entry.formData.activities
        : Object.values(entry.formData.activities);

      const entryTotal = activities.reduce((actSum: number, activity: any) => {
        if (activity && typeof activity === 'object') {
          if (typeof activity.cumulative_balance === 'number') {
            return actSum + activity.cumulative_balance;
          }
          if (typeof activity.spent === 'number') {
            return actSum + activity.spent;
          }
          if (typeof activity.executed === 'number') {
            return actSum + activity.executed;
          }
        }
        return actSum;
      }, 0);
      return sum + entryTotal;
    }

    return sum;
  }, 0);
}

/**
 * Calculate budget utilization percentage
 * 
 * @param allocated - Total allocated budget
 * @param spent - Total spent budget
 * @returns Utilization percentage rounded to 2 decimal places (0 if allocated is 0)
 */
export function calculateUtilization(allocated: number, spent: number): number {
  if (allocated === 0) {
    return 0;
  }
  
  const utilization = (spent / allocated) * 100;
  return Math.round(utilization * 100) / 100;
}

/**
 * Calculate remaining budget
 * 
 * @param allocated - Total allocated budget
 * @param spent - Total spent budget
 * @returns Remaining budget amount
 */
export function calculateRemaining(allocated: number, spent: number): number {
  return allocated - spent;
}

/**
 * Calculate budget metrics for a set of planning and execution entries
 * 
 * @param planningEntries - Array of planning form data entries
 * @param executionEntries - Array of execution form data entries
 * @returns Object containing all budget metrics
 */
export function calculateBudgetMetrics(
  planningEntries: FormDataEntry[],
  executionEntries: FormDataEntry[]
) {
  const totalAllocated = calculateAllocatedBudget(planningEntries);
  const totalSpent = calculateSpentBudget(executionEntries);
  const remaining = calculateRemaining(totalAllocated, totalSpent);
  const utilizationPercentage = calculateUtilization(totalAllocated, totalSpent);

  return {
    totalAllocated,
    totalSpent,
    remaining,
    utilizationPercentage,
  };
}
