import { db } from "@/db";
import { formSchemas, formFields } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formulaEngine } from "../utils/computation.utils";
import { QuarterlyValues, BalancesResponse } from "@/api/routes/execution/execution.types";
import { CalculateValuesResponse } from "@/api/routes/computation/computation.types";


export class ComputationService {
  async calculateValues(
    schemaId: number, 
    data: Record<string, any>, 
    customCalculations?: Array<{ fieldId: string; formula: string; dependencies: string[] }>
  ): Promise<CalculateValuesResponse> {
    const schema = await db.query.formSchemas.findFirst({
      where: eq(formSchemas.id, schemaId),
      with: {
        formFields: {
          where: eq(formFields.fieldType, 'calculated'),
          orderBy: (fields: any, { asc }: any) => [asc(fields.displayOrder)]
        }
      }
    });

    if (!schema) {
      throw new Error("Schema not found");
    }

    const computedValues: Record<string, any> = {};
    const calculationTrace: any[] = [];
    const errors: any[] = [];
    const warnings: any[] = [];

    // Process schema-defined calculated fields
    for (const field of (schema.formFields as any[])) {
      if (field.computationFormula) {
        const startTime = performance.now();
        
        try {
          const result = await formulaEngine.evaluate(
            field.computationFormula,
            { ...data, ...computedValues }
          );
          
          computedValues[field.fieldKey] = result;
          
          calculationTrace.push({
            fieldId: field.fieldKey,
            formula: field.computationFormula,
            inputs: formulaEngine.extractInputs(field.computationFormula, data),
            result,
            executionTime: performance.now() - startTime
          });
        } catch (error) {
          errors.push({
            fieldId: field.fieldKey,
            message: error instanceof Error ? error.message : "Calculation failed",
            code: "CALCULATION_ERROR"
          });
        }
      }
    }

    // Process custom calculations
    if (customCalculations) {
      for (const calc of customCalculations) {
        const startTime = performance.now();
        
        try {
          const result = await formulaEngine.evaluate(
            calc.formula,
            { ...data, ...computedValues }
          );
          
          computedValues[calc.fieldId] = result;
          
          calculationTrace.push({
            fieldId: calc.fieldId,
            formula: calc.formula,
            inputs: formulaEngine.extractInputs(calc.formula, data),
            result,
            executionTime: performance.now() - startTime
          });
        } catch (error) {
          errors.push({
            fieldId: calc.fieldId,
            message: error instanceof Error ? error.message : "Calculation failed",
            code: "CALCULATION_ERROR"
          });
        }
      }
    }

    return {
      computedValues,
      calculationTrace,
      errors,
      warnings
    };
  }

  /*
  async calculatePlanningTotals(planningId: number, data: Record<string, any>) {
    console.log('Input data:', data);
    
    const quarterlyTotals = { q1: 0, q2: 0, q3: 0, q4: 0 };
    const categoryTotals: Record<string, number> = {};
    const computedValues: Record<string, any> = {};
    
    Object.entries(data).forEach(([fieldKey, value]) => {
      const numValue = Number(value) || 0;
      
      const quarterMatch = fieldKey.match(/_q([1-4])$/);
      const isAnnual = fieldKey.includes('_annual');
      
      let category = 'other';
      if (fieldKey.startsWith('personnel_')) {
        category = 'personnel';
      } else if (fieldKey.startsWith('operational_')) {
        category = 'operational';
      } else if (fieldKey.startsWith('supplies_')) {
        category = 'supplies';
      }
      
      if (!categoryTotals[category]) {
        categoryTotals[category] = 0;
      }
      categoryTotals[category] += numValue;
      
      if (quarterMatch && !isAnnual) {
        const quarter = quarterMatch[1] as '1' | '2' | '3' | '4';
        const quarterKey = `q${quarter}` as keyof typeof quarterlyTotals;
        quarterlyTotals[quarterKey] += numValue;
      }
      
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
  }*/

  // async calculatePlanningTotals(planningId: number, data: Record<string, any>) {
  //   // Extract quarterly values from data
  //   const quarterlyTotals = {
  //     q1: this.extractQuarterlyValue(data, 'Q1'),
  //     q2: this.extractQuarterlyValue(data, 'Q2'),
  //     q3: this.extractQuarterlyValue(data, 'Q3'),
  //     q4: this.extractQuarterlyValue(data, 'Q4')
  //   };

  //   const annualTotal = quarterlyTotals.q1 + quarterlyTotals.q2 + 
  //                      quarterlyTotals.q3 + quarterlyTotals.q4;

  //   // Calculate category totals
  //   const categoryTotals = this.aggregateByCategory(data);

  //   // Compute additional values
  //   const computedValues = await this.calculateValues(planningId, data);

  //   return {
  //     quarterlyTotals,
  //     annualTotal,
  //     categoryTotals,
  //     computedValues: computedValues.computedValues
  //   };
  // }

  async calculateExecutionBalances(data: Record<string, any>): Promise<BalancesResponse> {
    const createQuarterlyValues = (prefix: string): QuarterlyValues => {
      const q1 = this.extractValue(data, `${prefix}_Q1`) || 0;
      const q2 = this.extractValue(data, `${prefix}_Q2`) || 0;
      const q3 = this.extractValue(data, `${prefix}_Q3`) || 0;
      const q4 = this.extractValue(data, `${prefix}_Q4`) || 0;
      
      return {
        q1,
        q2,
        q3,
        q4,
        cumulativeBalance: q1 + q2 + q3 + q4
      };
    };

    const receipts = createQuarterlyValues('total_receipts');
    const expenditures = createQuarterlyValues('total_expenditures');
    
    // Calculate surplus (A - B)
    const surplus: QuarterlyValues = {
      q1: receipts.q1 - expenditures.q1,
      q2: receipts.q2 - expenditures.q2,
      q3: receipts.q3 - expenditures.q3,
      q4: receipts.q4 - expenditures.q4,
      cumulativeBalance: receipts.cumulativeBalance - expenditures.cumulativeBalance
    };

    const financialAssets = createQuarterlyValues('financial_assets');
    const financialLiabilities = createQuarterlyValues('financial_liabilities');
    
    // Calculate net financial assets (D - E)
    const netFinancialAssets: QuarterlyValues = {
      q1: financialAssets.q1 - financialLiabilities.q1,
      q2: financialAssets.q2 - financialLiabilities.q2,
      q3: financialAssets.q3 - financialLiabilities.q3,
      q4: financialAssets.q4 - financialLiabilities.q4,
      cumulativeBalance: financialAssets.cumulativeBalance - financialLiabilities.cumulativeBalance
    };

    const closingBalance = createQuarterlyValues('closing_balance');

    return {
      receipts,
      expenditures,
      surplus,
      financialAssets,
      financialLiabilities,
      netFinancialAssets,
      closingBalance,
      isBalanced: false, // Will be set by validation
      validationErrors: []
    };
  }

  async aggregateTotals(data: Record<string, any>[], aggregationRules: any[]) {
    const aggregatedValues: Record<string, number> = {};
    
    for (const rule of aggregationRules) {
      const values = data
        .filter(item => this.matchesFilters(item, rule.filters))
        .map(item => rule.sourceFields.reduce((sum: number, field: string) => sum + (item[field] || 0), 0));

      switch (rule.aggregationType) {
        case 'SUM':
          aggregatedValues[rule.fieldId] = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'AVERAGE':
          aggregatedValues[rule.fieldId] = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
          break;
        case 'COUNT':
          aggregatedValues[rule.fieldId] = values.length;
          break;
        case 'MIN':
          aggregatedValues[rule.fieldId] = values.length > 0 ? Math.min(...values) : 0;
          break;
        case 'MAX':
          aggregatedValues[rule.fieldId] = values.length > 0 ? Math.max(...values) : 0;
          break;
        case 'MEDIAN':
          const sorted = [...values].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          aggregatedValues[rule.fieldId] = sorted.length % 2 === 0 
            ? (sorted[mid - 1] + sorted[mid]) / 2 
            : sorted[mid];
          break;
      }
    }

    return {
      aggregatedValues,
      itemCount: data.length,
      processedFields: aggregationRules.map(r => r.fieldId)
    };
  }

  async performVarianceAnalysis(plannedData: Record<string, any>, actualData: Record<string, any>, analysisType: string, toleranceThreshold: number) {
    const fieldAnalysis = [];
    let totalVariance = 0;
    let significantVariances = 0;
    let overBudgetItems = 0;
    let underBudgetItems = 0;

    // Get all numeric fields that exist in both datasets
    const numericFields = Object.keys(plannedData).filter(key => 
      typeof plannedData[key] === 'number' && typeof actualData[key] === 'number'
    );

    for (const fieldId of numericFields) {
      const planned = plannedData[fieldId];
      const actual = actualData[fieldId];
      const variance = actual - planned;
      const percentageVariance = planned !== 0 ? (variance / Math.abs(planned)) * 100 : 0;
      const isSignificant = Math.abs(percentageVariance) > (toleranceThreshold * 100);

      totalVariance += Math.abs(variance);
      if (isSignificant) significantVariances++;
      if (variance > 0) overBudgetItems++;
      else if (variance < 0) underBudgetItems++;

      fieldAnalysis.push({
        fieldId,
        planned,
        actual,
        variance,
        percentageVariance,
        isSignificant,
        status: variance > planned * toleranceThreshold ? 'over_budget' :
                variance < -planned * toleranceThreshold ? 'under_budget' : 'on_track'
      });
    }

    const averageVariance = numericFields.length > 0 ? totalVariance / numericFields.length : 0;

    // Generate recommendations
    const recommendations = [];
    const highVarianceFields = fieldAnalysis.filter(f => f.isSignificant && f.status === 'over_budget');
    
    if (highVarianceFields.length > 0) {
      recommendations.push({
        fieldId: highVarianceFields[0].fieldId,
        priority: 'high' as const,
        message: `Significant over-budget variance of ${highVarianceFields[0].percentageVariance.toFixed(1)}%`,
        suggestedAction: 'Review spending controls and budget allocation'
      });
    }

    return {
      summary: {
        totalVariance,
        averageVariance,
        significantVariances,
        overBudgetItems,
        underBudgetItems
      },
      fieldAnalysis,
      recommendations
    };
  }

  async calculateFinancialRatios(data: Record<string, any>, ratios: string[]) {
    const results = [];

    for (const ratioName of ratios) {
      let value = 0;
      let formula = '';
      let interpretation = '';
      let benchmark = undefined;
      let status: 'excellent' | 'good' | 'fair' | 'poor' = 'fair';

      switch (ratioName) {
        case 'current_ratio':
          const currentAssets = data.current_assets || 0;
          const currentLiabilities = data.current_liabilities || 1;
          value = currentAssets / currentLiabilities;
          formula = 'Current Assets / Current Liabilities';
          benchmark = 2.0;
          status = value >= 2.0 ? 'excellent' : value >= 1.5 ? 'good' : value >= 1.0 ? 'fair' : 'poor';
          interpretation = 'Measures ability to pay short-term obligations';
          break;

        case 'budget_execution_rate':
          const actualSpending = data.total_expenditures || 0;
          const budgetedAmount = data.total_budget || 1;
          value = actualSpending / budgetedAmount;
          formula = 'Actual Spending / Budgeted Amount';
          benchmark = 0.95;
          status = value >= 0.90 && value <= 1.05 ? 'excellent' : 
                  value >= 0.80 && value <= 1.15 ? 'good' : 
                  value >= 0.70 && value <= 1.25 ? 'fair' : 'poor';
          interpretation = 'Measures how well budget targets are being met';
          break;

        case 'surplus_ratio':
          const surplus = data.surplus || 0;
          const totalReceipts = data.total_receipts || 1;
          value = surplus / totalReceipts;
          formula = 'Surplus / Total Receipts';
          benchmark = 0.05;
          status = value >= 0.05 ? 'excellent' : value >= 0.02 ? 'good' : value >= 0 ? 'fair' : 'poor';
          interpretation = 'Measures financial surplus as percentage of receipts';
          break;
      }

      results.push({
        ratioName,
        value,
        formula,
        interpretation,
        benchmark,
        status
      });
    }

    return results;
  }

  private extractQuarterlyValue(data: Record<string, any>, quarter: string): number {
    // Try different naming conventions for quarterly data
    const possibleKeys = [
      `${quarter.toLowerCase()}`,
      `quarter_${quarter.charAt(1)}`,
      `q${quarter.charAt(1)}`,
      `${quarter}_total`
    ];

    for (const key of possibleKeys) {
      if (data[key] && typeof data[key] === 'number') {
        return data[key];
      }
    }

    return 0;
  }

  private extractValue(data: Record<string, any>, key: string): number {
    return data[key] || 0;
  }

  private aggregateByCategory(data: Record<string, any>): Record<string, number> {
    const categoryTotals: Record<string, number> = {};
    
    // Group fields by category patterns
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'number') {
        const category = this.extractCategoryFromKey(key);
        categoryTotals[category] = (categoryTotals[category] || 0) + data[key];
      }
    });

    return categoryTotals;
  }

  private extractCategoryFromKey(key: string): string {
    // Extract category from field key patterns
    const parts = key.split('_');
    if (parts.length > 1) {
      return parts[0]; // First part as category
    }
    return 'general';
  }

  private matchesFilters(item: Record<string, any>, filters?: Record<string, any>): boolean {
    if (!filters) return true;
    
    return Object.entries(filters).every(([key, value]) => item[key] === value);
  }

  async calculatePlanningTotals(planningId: number, data: Record<string, any>) {
    console.log('Input data:', data); 
    
    const quarterlyTotals = { q1: 0, q2: 0, q3: 0, q4: 0 };
    const categoryTotals: Record<string, number> = {};
    const computedValues: Record<string, any> = {};
    
    Object.entries(data).forEach(([fieldKey, value]) => {
      console.log(`Processing field: ${fieldKey}, value: ${value}`); // Debug
      
      const numValue = Number(value) || 0;
      
      // Check for quarterly pattern
      const quarterMatch = fieldKey.match(/_q([1-4])$/);
      const isAnnual = fieldKey.includes('_annual');
      
      console.log(`  Quarter match: ${quarterMatch}, isAnnual: ${isAnnual}`); // Debug
      
      // Determine category
      let category = 'other';
      if (fieldKey.startsWith('personnel_')) {
        category = 'personnel';
      } else if (fieldKey.startsWith('operational_')) {
        category = 'operational';
      } else if (fieldKey.startsWith('supplies_')) {
        category = 'supplies';
      }
      
      console.log(`  Category: ${category}`); // Debug
      
      // Add to category totals
      if (!categoryTotals[category]) {
        categoryTotals[category] = 0;
      }
      categoryTotals[category] += numValue;
  
      // Add to quarterly totals (only for quarterly fields, not annual)
      if (quarterMatch && !isAnnual) {
        const quarter = quarterMatch[1] as '1' | '2' | '3' | '4';
        const quarterKey = `q${quarter}` as keyof typeof quarterlyTotals;
        console.log(`  Adding ${numValue} to ${quarterKey}`); // Debug
        quarterlyTotals[quarterKey] += numValue;
      }
      
      // Create computed values for activity totals
      const activityMatch = fieldKey.match(/^(\w+_\w+(?:_\w+)*)_q[1-4]$/);
      if (activityMatch) {
        const activityBase = activityMatch[1];
        const totalKey = `${activityBase}_total`;
        console.log(`  Activity match: ${activityBase} -> ${totalKey}`); // Debug
        
        if (!computedValues[totalKey]) {
          computedValues[totalKey] = 0;
        }
        computedValues[totalKey] += numValue;
      }
    });
    
    // Calculate annual total
    const annualTotal = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
    
    // Add summary computed values
    const quarterSum = quarterlyTotals.q1 + quarterlyTotals.q2 + quarterlyTotals.q3 + quarterlyTotals.q4;
    computedValues['quarterly_average'] = quarterSum / 4;
    computedValues['monthly_average'] = annualTotal / 12;
    
    console.log('Final calculated results:', {
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

export const computationService = new ComputationService();