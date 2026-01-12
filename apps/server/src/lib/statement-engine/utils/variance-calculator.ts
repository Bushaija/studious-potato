/**
 * Variance Calculator Utility
 * Handles variance calculations for financial statement comparisons
 */

export interface VarianceResult {
  absolute: number;
  percentage: number;
  trend: 'increase' | 'decrease' | 'stable';
}

export interface FormattedVariance {
  absolute: string;
  percentage: string;
  trend: string;
  isSignificant: boolean;
}

export class VarianceCalculator {
  /**
   * Calculate line variance for statement display
   */
  static calculateLineVariance(currentValue: number, previousValue: number): VarianceResult {
    const absolute = currentValue - previousValue;
    
    // Handle percentage calculation when previous value is zero
    let percentage: number;
    
    if (previousValue === 0) {
      if (currentValue === 0) {
        percentage = 0; // No change
      } else {
        // When previous is 0 and current is not 0, show as 100% increase/decrease
        percentage = currentValue > 0 ? 100 : -100;
      }
    } else {
      percentage = (absolute / Math.abs(previousValue)) * 100;
    }
    
    // Determine trend
    let trend: 'increase' | 'decrease' | 'stable';
    if (Math.abs(absolute) < 0.01) {
      trend = 'stable';
    } else if (absolute > 0) {
      trend = 'increase';
    } else {
      trend = 'decrease';
    }
    
    return {
      absolute,
      percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
      trend
    };
  }

  /**
   * Calculate basic variance (legacy method for compatibility)
   */
  static calculateVariance(currentValue: number, previousValue: number): VarianceResult {
    return this.calculateLineVariance(currentValue, previousValue);
  }

  /**
   * Format variance for display
   */
  static formatVariance(
    variance: VarianceResult,
    options: {
      showCurrency?: boolean;
      currencySymbol?: string;
      decimalPlaces?: number;
    } = {}
  ): FormattedVariance {
    const { showCurrency = false, currencySymbol = '$', decimalPlaces = 2 } = options;
    
    // Format absolute value
    const absoluteFormatted = showCurrency 
      ? `${currencySymbol}${Math.abs(variance.absolute).toFixed(decimalPlaces)}`
      : Math.abs(variance.absolute).toFixed(decimalPlaces);
    
    // Format percentage
    const percentageFormatted = `${variance.percentage.toFixed(1)}%`;
    
    // Format trend
    const trendFormatted = variance.trend === 'increase' ? '↑' : 
                          variance.trend === 'decrease' ? '↓' : '→';
    
    // Determine significance
    const isSignificant = Math.abs(variance.percentage) >= 10; // 10% threshold
    
    return {
      absolute: absoluteFormatted,
      percentage: percentageFormatted,
      trend: trendFormatted,
      isSignificant
    };
  }

  /**
   * Get variance significance level
   */
  static getVarianceSignificance(variance: VarianceResult): 'low' | 'medium' | 'high' | 'critical' {
    const absPercentage = Math.abs(variance.percentage);
    
    if (absPercentage >= 50) {
      return 'critical';
    } else if (absPercentage >= 25) {
      return 'high';
    } else if (absPercentage >= 10) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Calculate variances for multiple event codes in batch
   */
  static calculateBatchVariances(
    currentPeriodTotals: Map<string, number>,
    previousPeriodTotals: Map<string, number>
  ): Map<string, VarianceResult> {
    const variances = new Map<string, VarianceResult>();
    
    // Get all unique event codes from both periods
    const allEventCodes = new Set([
      ...currentPeriodTotals.keys(),
      ...previousPeriodTotals.keys()
    ]);
    
    for (const eventCode of allEventCodes) {
      const currentValue = currentPeriodTotals.get(eventCode) || 0;
      const previousValue = previousPeriodTotals.get(eventCode) || 0;
      
      const variance = this.calculateLineVariance(currentValue, previousValue);
      variances.set(eventCode, variance);
    }
    
    return variances;
  }

  /**
   * Calculate variance summary statistics
   */
  static calculateVarianceSummary(variances: Map<string, VarianceResult>): {
    totalVariances: number;
    significantVariances: number;
    averagePercentageChange: number;
    totalAbsoluteChange: number;
    increaseCount: number;
    decreaseCount: number;
    stableCount: number;
  } {
    const varianceArray = Array.from(variances.values());
    
    const significantVariances = varianceArray.filter(v => 
      this.getVarianceSignificance(v) !== 'low'
    ).length;
    
    const averagePercentageChange = varianceArray.length > 0
      ? varianceArray.reduce((sum, v) => sum + v.percentage, 0) / varianceArray.length
      : 0;
    
    const totalAbsoluteChange = varianceArray.reduce((sum, v) => sum + Math.abs(v.absolute), 0);
    
    const increaseCount = varianceArray.filter(v => v.trend === 'increase').length;
    const decreaseCount = varianceArray.filter(v => v.trend === 'decrease').length;
    const stableCount = varianceArray.filter(v => v.trend === 'stable').length;
    
    return {
      totalVariances: varianceArray.length,
      significantVariances,
      averagePercentageChange: Math.round(averagePercentageChange * 100) / 100,
      totalAbsoluteChange,
      increaseCount,
      decreaseCount,
      stableCount
    };
  }
}