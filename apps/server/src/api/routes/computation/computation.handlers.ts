import * as HttpStatusCodes from "stoker/http-status-codes";
import type { AppRouteHandler } from "@/api/lib/types";
import { computationService } from "@/api/lib/services/computation.service";
import { validationService } from "@/api/lib/services/validation.service";
import { formulaEngine } from "@/api/lib/utils/computation.utils";
import type { 
  CalculateValuesRoute,
  AggregateTotalsRoute,
  VarianceAnalysisRoute,
  ValidateFormulaRoute,
  CalculateFinancialRatiosRoute,
  OptimizeFormulasRoute
} from "./computation.routes";


export const calculateValues: AppRouteHandler<CalculateValuesRoute> = async (c) => {
  const body = await c.req.json();
  
  try {
    const result = await computationService.calculateValues(
      body.schemaId,
      body.data,
      body.calculations
    );

    return c.json(result);
  } catch (error) {
    return c.json(
      { 
        message: "Failed to calculate values",
        errors: [error instanceof Error ? error.message : "Unknown error"]
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const aggregateTotals: AppRouteHandler<AggregateTotalsRoute> = async (c) => {
  const body = await c.req.json();
  
  try {
    const result = await computationService.aggregateTotals(
      body.data,
      body.aggregationRules
    );

    return c.json(result);
  } catch (error) {
    return c.json(
      { message: "Failed to aggregate totals" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const varianceAnalysis: AppRouteHandler<VarianceAnalysisRoute> = async (c) => {
  const body = await c.req.json();
  
  try {
    const result = await computationService.performVarianceAnalysis(
      body.plannedData,
      body.actualData,
      body.analysisType,
      body.toleranceThreshold
    );

    return c.json(result);
  } catch (error) {
    return c.json(
      { message: "Failed to perform variance analysis" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const validateFormula: AppRouteHandler<ValidateFormulaRoute> = async (c) => {
  const body = await c.req.json();
  
  try {
    const result = await validationService.validateFormula(
      body.formula,
      body.context
    );

    return c.json(result);
  } catch (error) {
    return c.json(
      { message: "Failed to validate formula" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const calculateFinancialRatios: AppRouteHandler<CalculateFinancialRatiosRoute> = async (c) => {
  const body = await c.req.json();
  
  try {
    const result = await computationService.calculateFinancialRatios(
      body.data,
      body.ratios
    );

    // Calculate overall assessment
    const overallScore = result.reduce((sum: number, ratio: any) => {
      const score = ratio.status === 'excellent' ? 4 : 
                   ratio.status === 'good' ? 3 :
                   ratio.status === 'fair' ? 2 : 1;
      return sum + score;
    }, 0) / result.length;

    const riskLevel = overallScore >= 3.5 ? 'low' : 
                     overallScore >= 2.5 ? 'medium' : 'high';

    // Generate key insights
    const keyInsights = [];
    const poorRatios = result.filter((r: any )=> r.status === 'poor');
    const excellentRatios = result.filter((r: any) => r.status === 'excellent');

    if (poorRatios.length > 0) {
      keyInsights.push(`${poorRatios.length} ratios need immediate attention`);
    }
    if (excellentRatios.length > result.length / 2) {
      keyInsights.push("Strong overall financial performance");
    }
    if (result.some((r: any) => r.ratioName === 'budget_execution_rate' && r.value < 0.8)) {
      keyInsights.push("Budget execution is below target");
    }

    return c.json({
      ratios: result,
      summary: {
        overallScore,
        riskLevel,
        keyInsights,
      },
    });
  } catch (error) {
    return c.json(
      { message: "Failed to calculate financial ratios" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const optimizeFormulas: AppRouteHandler<OptimizeFormulasRoute> = async (c) => {
  const body = await c.req.json();
  
  try {
    const optimizedFormulas = [];
    const recommendations = [];

    for (const formula of body.formulas) {
      // Analyze formula complexity
      const complexity = formulaEngine.analyzeComplexity(formula.formula);
      
      // Generate optimization suggestions
      const optimizations = await formulaEngine.suggestOptimizations(
        formula.formula,
        body.optimizationGoals
      );

      if (optimizations.length > 0) {
        const bestOptimization = optimizations[0]; // Take the best suggestion
        
        optimizedFormulas.push({
          fieldId: formula.fieldId,
          originalFormula: formula.formula,
          optimizedFormula: bestOptimization.optimizedFormula,
          improvementType: bestOptimization.type,
          performanceGain: bestOptimization.performanceGain,
          risks: bestOptimization.risks,
        });
      }
    }

    // Generate general recommendations
    if (optimizedFormulas.length === 0) {
      recommendations.push("All formulas are already well-optimized");
    } else {
      recommendations.push(`${optimizedFormulas.length} formulas can be optimized`);
      
      const highImpactOptimizations = optimizedFormulas.filter(f => f.performanceGain > 0.2);
      if (highImpactOptimizations.length > 0) {
        recommendations.push("Focus on high-impact optimizations first");
      }
    }

    return c.json({
      optimizedFormulas,
      recommendations,
    });
  } catch (error) {
    return c.json(
      { message: "Failed to optimize formulas" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};