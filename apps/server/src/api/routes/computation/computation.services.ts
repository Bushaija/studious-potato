// computationService.calculatePlanningTotals - Debug & Fix

export class ComputationService {
    async calculatePlanningTotals(planningId: number, data: Record<string, any>) {
      console.log('Input data:', data); // Debug log
      
      // Initialize totals
      const quarterlyTotals = { q1: 0, q2: 0, q3: 0, q4: 0 };
      const categoryTotals: Record<string, number> = {};
      const computedValues: Record<string, any> = {};
      
      // Process each field in the data
      Object.entries(data).forEach(([fieldKey, value]) => {
        const numValue = Number(value) || 0;
        
        // Extract quarter and category from field key
        const quarterMatch = fieldKey.match(/_q([1-4])$/);
        const isAnnual = fieldKey.includes('_annual');
        
        // Determine category from field prefix
        let category = 'other';
        if (fieldKey.startsWith('personnel_')) {
          category = 'personnel';
        } else if (fieldKey.startsWith('operational_')) {
          category = 'operational';
        } else if (fieldKey.startsWith('supplies_')) {
          category = 'supplies';
        }
        
        // Add to category totals
        if (!categoryTotals[category]) {
          categoryTotals[category] = 0;
        }
        categoryTotals[category] += numValue;
        
        // Add to quarterly totals (only for quarterly fields, not annual)
        if (quarterMatch && !isAnnual) {
          const quarter = quarterMatch[1] as '1' | '2' | '3' | '4';
          const quarterKey = `q${quarter}` as keyof typeof quarterlyTotals;
          quarterlyTotals[quarterKey] += numValue;
        }
        
        // Create computed values for totals by activity
        const activityMatch = fieldKey.match(/^(\w+_\w+(?:_\w+)*)_q[1-4]$/);
        if (activityMatch) {
          const activityBase = activityMatch[1];
          const totalKey = `${activityBase}_total`;
          
          if (!computedValues[totalKey]) {
            computedValues[totalKey] = 0;
          }
          computedValues[totalKey] += numValue;
        }
      });
      
      // Calculate annual total
      const annualTotal = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
      
      // Add summary computed values
      computedValues['quarterly_average'] = 
        (quarterlyTotals.q1 + quarterlyTotals.q2 + quarterlyTotals.q3 + quarterlyTotals.q4) / 4;
      computedValues['monthly_average'] = annualTotal / 12;
      
      console.log('Calculated results:', { // Debug log
        quarterlyTotals,
        annualTotal,
        categoryTotals,
        computedValues
      });
      
      return {
        quarterlyTotals,
        annualTotal,
        categoryTotals,
        computedValues
      };
    }
    
    // Alternative implementation with better field parsing
    async calculatePlanningTotalsV2(planningId: number, data: Record<string, any>) {
      // Define field patterns for better parsing
      const fieldPatterns = {
        quarterly: /^(.+)_q([1-4])$/,
        annual: /^(.+)_annual$/,
        categories: {
          personnel: /^personnel_/,
          operational: /^operational_/,
          supplies: /^supplies_/
        }
      };
      
      const results = {
        quarterlyTotals: { q1: 0, q2: 0, q3: 0, q4: 0 },
        annualTotal: 0,
        categoryTotals: {} as Record<string, number>,
        computedValues: {} as Record<string, any>
      };
      
      // Group fields by activity for total calculations
      const activityGroups: Record<string, { quarters: number[], annual: number }> = {};
      
      Object.entries(data).forEach(([fieldKey, value]) => {
        const numValue = Number(value) || 0;
        
        // Determine category
        let category = 'other';
        for (const [catName, pattern] of Object.entries(fieldPatterns.categories)) {
          if (pattern.test(fieldKey)) {
            category = catName;
            break;
          }
        }
        
        // Initialize category total
        if (!results.categoryTotals[category]) {
          results.categoryTotals[category] = 0;
        }
        results.categoryTotals[category] += numValue;
        
        // Handle quarterly fields
        const quarterMatch = fieldKey.match(fieldPatterns.quarterly);
        if (quarterMatch) {
          const [, activityBase, quarter] = quarterMatch;
          const quarterKey = `q${quarter}` as keyof typeof results.quarterlyTotals;
          
          results.quarterlyTotals[quarterKey] += numValue;
          
          // Group for activity totals
          if (!activityGroups[activityBase]) {
            activityGroups[activityBase] = { quarters: [0, 0, 0, 0], annual: 0 };
          }
          activityGroups[activityBase].quarters[parseInt(quarter) - 1] = numValue;
        }
        
        // Handle annual fields
        const annualMatch = fieldKey.match(fieldPatterns.annual);
        if (annualMatch) {
          const [, activityBase] = annualMatch;
          if (!activityGroups[activityBase]) {
            activityGroups[activityBase] = { quarters: [0, 0, 0, 0], annual: 0 };
          }
          activityGroups[activityBase].annual = numValue;
        }
      });
      
      // Calculate activity totals
      Object.entries(activityGroups).forEach(([activityBase, values]) => {
        const quarterlyTotal = values.quarters.reduce((sum, val) => sum + val, 0);
        const totalValue = quarterlyTotal + values.annual;
        
        if (totalValue > 0) {
          results.computedValues[`${activityBase}_total`] = totalValue;
        }
      });
      
      // Calculate grand total
      results.annualTotal = Object.values(results.categoryTotals).reduce((sum, val) => sum + val, 0);
      
      // Add derived computations
      const quarterlySum = Object.values(results.quarterlyTotals).reduce((sum, val) => sum + val, 0);
      results.computedValues['quarterly_average'] = quarterlySum / 4;
      results.computedValues['monthly_average'] = results.annualTotal / 12;
      
      return results;
    }
  }
  
  // Debug helper function to test your data
  export function debugCalculation(data: Record<string, any>) {
    console.log('=== DEBUG CALCULATION ===');
    console.log('Input data:', data);
    
    Object.entries(data).forEach(([key, value]) => {
      console.log(`Field: ${key}`);
      console.log(`  Value: ${value}`);
      console.log(`  Quarter match: ${key.match(/_q([1-4])$/)}`);
      console.log(`  Category: ${
        key.startsWith('personnel_') ? 'personnel' :
        key.startsWith('operational_') ? 'operational' :
        key.startsWith('supplies_') ? 'supplies' : 'other'
      }`);
      console.log('---');
    });
  }