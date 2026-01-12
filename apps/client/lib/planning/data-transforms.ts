import type { PlanningDataEntry, PlanningActivity } from '@/fetchers/planning/types';
import { parseNumericInput } from './formatters';

export interface Category {
  id: number;
  name: string;
  code: string;
  displayOrder: number;
  activities: PlanningActivity[];
}

export function transformActivitiesToCategories(activities: PlanningActivity[]): Category[] {
  const categoryMap = new Map<number, Category>();
  
  activities.forEach(activity => {
    const categoryId = activity.categoryId;
    
    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, {
        id: categoryId,
        name: activity.categoryName,
        code: activity.categoryCode,
        displayOrder: activity.categoryDisplayOrder,
        activities: []
      });
    }
    
    categoryMap.get(categoryId)!.activities.push(activity);
  });
  
  // Sort activities within each category
  categoryMap.forEach(category => {
    category.activities.sort((a, b) => a.displayOrder - b.displayOrder);
  });
  
  // Convert to array and sort by display order
  return Array.from(categoryMap.values())
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function extractFormDataFromPlanningEntry(entry: PlanningDataEntry): Record<string, any> {
  const formData = entry.formData || {};
  
  // Handle both direct activity data and nested activities structure
  if (formData.activities) {
    return formData.activities;
  }
  
  // If formData contains activity IDs as keys directly
  const activityKeys = Object.keys(formData).filter(key => /^\d+$/.test(key));
  if (activityKeys.length > 0) {
    return formData;
  }
  
  return {};
}

export function prepareFormDataForSubmission(
  activities: Record<string, any>,
  metadata?: Record<string, any>
): Record<string, any> {
  const toNumber = (v: any, d = 0) => parseNumericInput(v ?? d);

  const normalizedActivities = Object.keys(activities).reduce((acc, activityId) => {
    const a = activities[activityId];
    if (!a) return acc;

    // Accept both camelCase and snake_case, output snake_case only
    const unit_cost = toNumber(a.unit_cost ?? a.unitCost, 0);
    const frequency = toNumber(a.frequency, 1);
    const q1_count = toNumber(a.q1_count ?? a.q1Count, 0);
    const q2_count = toNumber(a.q2_count ?? a.q2Count, 0);
    const q3_count = toNumber(a.q3_count ?? a.q3Count, 0);
    const q4_count = toNumber(a.q4_count ?? a.q4Count, 0);
    const comments = (a.comments ?? '').toString().trim();

    acc[activityId] = {
      frequency,
      unit_cost,
      q1_count,
      q2_count,
      q3_count,
      q4_count,
      comments,
    };
    return acc;
  }, {} as Record<string, any>);

  return {
    activities: normalizedActivities,
    metadata: metadata || {}
  };
}
