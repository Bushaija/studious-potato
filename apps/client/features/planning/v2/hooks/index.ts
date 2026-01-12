import { useEffect, useMemo, useState } from "react";
import { Category, ProgramFilter, mockCategories, ActivityFormData, FormSchema } from "../types";

export const useProgramFilter = () => {
  const [filter, setFilter] = useState<ProgramFilter>({
    program: 'HIV',
    facilityType: 'hospital'
  });

  const updateFilter = (updates: Partial<ProgramFilter>) => {
    setFilter(prev => ({ ...prev, ...updates }));
  };

  return { filter, updateFilter };
};

// Hook for fetching activities based on filter
export const useActivitiesData = (filter: ProgramFilter) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activities, setActivities] = useState<Category[]>([]);

  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Filter activities based on program/facility type
      const filteredCategories = mockCategories.map(category => ({
        ...category,
        activities: category.activities.filter(activity => {
          // Apply filtering logic here
          return true; // Simplified for demo
        })
      }));
      
      setActivities(filteredCategories);
      setIsLoading(false);
    };

    fetchActivities();
  }, [filter]);

  return { activities, isLoading };
};

export const useDynamicColumns = (schema: FormSchema | null) => {
  return useMemo(() => {
    if (!schema) return [];

    const columns: Array<{
      key: string;
      label: string;
      type: string;
      width: string;
      required: boolean;
      validation?: any;
      readonly: boolean;
      computationFormula?: string;
    }> = [];

    // Process each section to extract fields that should appear as columns
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        // Skip activity_name and activity_type as they're handled separately
        if (field.key === 'activity_name' || field.key === 'activity_type') return;
        
        let width = '90px'; // default
        if (field.type === 'textarea') width = '180px';
        if (field.key === 'unit_cost') width = '100px';
        if (field.type === 'calculated') width = '100px';

        columns.push({
          key: field.key,
          label: field.label,
          type: field.type,
          width,
          required: field.required || false,
          validation: field.validation,
          readonly: field.readonly || field.type === 'calculated',
          computationFormula: field.computationFormula
        });
      });
    });

    return columns;
  }, [schema]);
};

// Hook for form calculations
export const useFormCalculations = (formData: ActivityFormData, schema: FormSchema | null) => {
  return useMemo(() => {
    if (!schema || !formData) return {};

    const calculations: Record<string, Record<string, number>> = {};

    Object.entries(formData).forEach(([activityId, activityData]) => {
      calculations[activityId] = {};

      // Find calculated fields in schema and sort by dependency order
      
      const calculatedFields = schema.sections
        .flatMap(section => section.fields)
        .filter(field => field.type === 'calculated' && field.computationFormula);

      // Process quarterly amounts first, then total budget
      const quarterlyFields = calculatedFields.filter(f => f.key.includes('_amount') && !f.key.includes('total'));
      const totalFields = calculatedFields.filter(f => f.key.includes('total'));

      // Calculate quarterly amounts first
      quarterlyFields.forEach(field => {
        if (!field.computationFormula) return;

        try {
          const formula = field.computationFormula;
          const unitCost = Number(activityData.unit_cost) || 0;
          const frequency = Number(activityData.frequency) || 0;
          
          // Extract quarter from field key (q1_amount -> q1_count)
          const quarter = field.key.replace('_amount', '_count');
          const count = Number(activityData[quarter]) || 0;
          
          // Calculate: unit_cost * frequency * count (frequency is already in the base calculation)
          const result = unitCost * count * frequency;
          calculations[activityId][field.key] = result;
        } catch (error) {
          calculations[activityId][field.key] = 0;
        }
      });

      // Then calculate totals
      totalFields.forEach(field => {
        if (!field.computationFormula) return;

        try {
          // For total_budget: sum all quarterly amounts
          if (field.key === 'total_budget') {
            const q1Amount = calculations[activityId]['q1_amount'] || 0;
            const q2Amount = calculations[activityId]['q2_amount'] || 0;
            const q3Amount = calculations[activityId]['q3_amount'] || 0;
            const q4Amount = calculations[activityId]['q4_amount'] || 0;
            
            calculations[activityId][field.key] = q1Amount + q2Amount + q3Amount + q4Amount;
          }
        } catch (error) {
          calculations[activityId][field.key] = 0;
        }
      });
    });

    return calculations;
  }, [formData, schema]);
};


// Simple formula evaluator (replace with proper math library in production)
const evaluateFormula = (formula: string): number => {
  try {
    // Basic safety check - only allow numbers, operators, and parentheses
    if (!/^[0-9+\-*/().\s]+$/.test(formula)) {
      throw new Error('Invalid formula');
    }
    return Function(`"use strict"; return (${formula})`)();
  } catch {
    return 0;
  }
};
