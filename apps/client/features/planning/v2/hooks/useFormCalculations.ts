import { useMemo } from "react";
import { ActivityFormData, FormSchema } from "../types";

export const useFormCalculations = (formData: ActivityFormData, schema: FormSchema | null) => {
    return useMemo(() => {
      if (!schema || !formData) return {};
  
      const calculations: Record<string, Record<string, number>> = {};
  
      Object.entries(formData).forEach(([activityId, activityData]) => {
        calculations[activityId] = {};
  
        // Find calculated fields in schema
        const calculatedFields = schema.sections
          .flatMap(section => section.fields)
          .filter(field => field.type === 'calculated' && field.computationFormula);
  
        calculatedFields.forEach(field => {
          if (!field.computationFormula) return;
  
          try {
            // Simple formula evaluation (in production, use a proper expression parser)
            let formula = field.computationFormula;
            
            // Replace variables with actual values
            Object.keys(activityData).forEach(key => {
              const value = activityData[key] || 0;
              formula = formula.replace(new RegExp(key, 'g'), String(value));
            });
  
            // Replace calculated field references
            Object.keys(calculations[activityId]).forEach(calcKey => {
              formula = formula.replace(new RegExp(calcKey, 'g'), String(calculations[activityId][calcKey]));
            });
  
            // Simple evaluation (use proper math parser in production)
            const result = evaluateFormula(formula);
            calculations[activityId][field.key] = result;
          } catch (error) {
            calculations[activityId][field.key] = 0;
          }
        });
      });
  
      return calculations;
    }, [formData, schema]);
  };

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
  