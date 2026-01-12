import { useMemo } from 'react';
import { calculateActivityAmounts } from '@/lib/planning/calculations';

interface ActivityFormData {
  [activityId: string]: {
    frequency?: number;
    unit_cost?: number;  // Using snake_case to match your backend
    q1_count?: number;
    q2_count?: number;
    q3_count?: number;
    q4_count?: number;
    comments?: string;
  };
}

export function useFormCalculations(
  formData: ActivityFormData,
  schema: any,
  activities: any[] = []
): Record<string, Record<string, number>> {
  return useMemo(() => {
    const calculations: Record<string, Record<string, number>> = {};
    
    // Create activity lookup for isAnnualOnly flag
    const activityLookup = new Map();
    activities.forEach(activity => {
      activityLookup.set(activity.id.toString(), activity);
    });
    
    Object.keys(formData).forEach(activityId => {
      const activityData = formData[activityId];
      const activity = activityLookup.get(activityId);
      
      if (!activityData) {
        calculations[activityId] = {
          q1Amount: 0,
          q2Amount: 0,
          q3Amount: 0,
          q4Amount: 0,
          totalAmount: 0
        };
        return;
      }
      
      // Ensure all values are numbers - using snake_case field names
      const frequency = Number(activityData.frequency) || 1;
      const unitCost = Number(activityData.unit_cost) || 0;
      const q1Count = Number(activityData.q1_count) || 0;
      const q2Count = Number(activityData.q2_count) || 0;
      const q3Count = Number(activityData.q3_count) || 0;
      const q4Count = Number(activityData.q4_count) || 0;
      const isAnnualOnly = activity?.isAnnualOnly || false;
      
      // Calculate amounts
      const calc = calculateActivityAmounts(
        frequency,
        unitCost,
        q1Count,
        q2Count,
        q3Count,
        q4Count,
        isAnnualOnly
      );
      
      calculations[activityId] = {
        q1Amount: calc.q1Amount,
        q2Amount: calc.q2Amount,
        q3Amount: calc.q3Amount,
        q4Amount: calc.q4Amount,
        totalAmount: calc.totalAmount
      };
    });
    
    return calculations;
  }, [formData, activities]); // Removed schema from dependencies
}