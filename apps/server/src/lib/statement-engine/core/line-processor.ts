import { EventSummary } from "../../../api/routes/financial-reports/data-collection.service";
import { StatementFormulaEngine, FormulaContext } from "./formula-engine";

export interface StatementLineTemplate {
  id: number;
  lineCode: string;
  lineItem: string;
  level: number;
  parentLineId?: number;
  displayOrder: number;
  eventMappings: (string | number)[];
  calculationFormula?: string;
  aggregationMethod: string;
  isTotalLine: boolean;
  isSubtotalLine: boolean;
  displayConditions: Record<string, any>;
  formatRules: Record<string, any>;
  noteNumber?: number;
}

export interface StatementLine {
  id: number;
  lineCode: string;
  lineItem: string;
  level: number;
  parentLineId?: number;
  displayOrder: number;
  currentValue: number;
  priorValue?: number;
  isTotalLine: boolean;
  isSubtotalLine: boolean;
  formatRules: Record<string, any>;
  displayConditions: Record<string, any>;
  children?: StatementLine[];
  noteNumber?: number;
}

export class StatementLineProcessor {
  constructor(private formulaEngine: StatementFormulaEngine) {}

  /**
   * Process a single statement line template into a statement line
   */
  async processLine(
    template: StatementLineTemplate,
    eventLookup: Map<any, EventSummary>,
    lineValues: Map<string, number>,
    context: any
  ): Promise<StatementLine> {
    let currentValue = 0;

    // 1. Calculate value based on template configuration
    if (template.calculationFormula) {
      currentValue = await this.calculateFormulaValue(template, eventLookup, lineValues);
    } else if (template.eventMappings && template.eventMappings.length > 0) {
      currentValue = this.calculateEventMappingValue(template, eventLookup);
    }

    // 2. Apply aggregation method if specified
    if (template.aggregationMethod && template.aggregationMethod !== 'SUM') {
      currentValue = this.applyAggregationMethod(currentValue, template.aggregationMethod, lineValues);
    }

    // 3. Check display conditions
    const shouldDisplay = this.evaluateDisplayConditions(template.displayConditions, lineValues, eventLookup);
    if (!shouldDisplay && currentValue === 0) {
      // Skip line if conditions not met and value is zero
      currentValue = 0;
    }

    // 4. Build statement line
    const statementLine: StatementLine = {
      id: template.id,
      lineCode: template.lineCode,
      lineItem: template.lineItem,
      level: template.level,
      parentLineId: template.parentLineId,
      displayOrder: template.displayOrder,
      currentValue,
      isTotalLine: template.isTotalLine,
      isSubtotalLine: template.isSubtotalLine,
      formatRules: template.formatRules || {},
      displayConditions: template.displayConditions || {},
      noteNumber: template.noteNumber,
    };

    return statementLine;
  }

  /**
   * Calculate value using formula
   */
  private async calculateFormulaValue(
    template: StatementLineTemplate,
    eventLookup: Map<any, EventSummary>,
    lineValues: Map<string, number>
  ): Promise<number> {
    if (!template.calculationFormula) {
      return 0;
    }

    // Build formula context
    const formulaContext: FormulaContext = {
      lineValues,
      eventValues: this.buildEventValuesMap(eventLookup),
      periodComparisons: new Map(), // This would be populated with prior period data
      constants: new Map([
        ['CURRENT_YEAR', new Date().getFullYear()],
        ['PRIOR_YEAR', new Date().getFullYear() - 1],
      ]),
    };

    // Evaluate formula
    const result = await this.formulaEngine.evaluateFormula(
      template.calculationFormula,
      formulaContext
    );

    if (!result.success) {
      console.warn(`Formula evaluation failed for line ${template.lineItem}: ${result.error}`);
      return 0;
    }

    return result.value;
  }

  /**
   * Calculate value using event mappings
   */
  private calculateEventMappingValue(
    template: StatementLineTemplate,
    eventLookup: Map<any, EventSummary>
  ): number {
    if (!template.eventMappings || template.eventMappings.length === 0) {
      return 0;
    }

    let total = 0;
    for (const eventRef of template.eventMappings) {
      let event = eventLookup.get(eventRef);
      if (!event && typeof eventRef === 'number') {
        event = eventLookup.get(String(eventRef));
      }
      if (event) {
        // Debug logging for CASH_EQUIVALENTS_END
        if (event.eventCode === 'CASH_EQUIVALENTS_END') {
          console.log(`[LineProcessor] Line: ${template.lineCode}, Event: ${event.eventCode}, Total Amount: ${event.totalAmount}`);
        }
        total += event.totalAmount;
      }
    }

    return total;
  }

  /**
   * Apply aggregation method to value
   */
  private applyAggregationMethod(
    value: number,
    method: string,
    lineValues: Map<string, number>
  ): number {
    switch (method.toUpperCase()) {
      case 'SUM':
        return value;
      case 'DIFF':
      case 'DIFFERENCE':
        return value; // value already computed by formula; no-op
      
      case 'AVERAGE':
        // This would need context about how many items are being averaged
        return value;
      
      case 'MAX':
        return value;
      
      case 'MIN':
        return value;
      
      default:
        console.warn(`Unknown aggregation method: ${method}`);
        return value;
    }
  }

  /**
   * Evaluate display conditions for the line
   */
  private evaluateDisplayConditions(
    conditions: Record<string, any>,
    lineValues: Map<string, number>,
    eventLookup: Map<any, EventSummary>
  ): boolean {
    if (!conditions || Object.keys(conditions).length === 0) {
      return true;
    }

    // Simple condition evaluation - can be enhanced for complex conditions
    for (const [key, condition] of Object.entries(conditions)) {
      switch (key) {
        case 'showWhen':
          if (!this.evaluateCondition(condition, lineValues, eventLookup)) {
            return false;
          }
          break;
        
        case 'hideWhen':
          if (this.evaluateCondition(condition, lineValues, eventLookup)) {
            return false;
          }
          break;
        
        case 'hideEmpty':
          if (condition === true) {
            const totalValue = Array.from(lineValues.values()).reduce((sum, val) => sum + val, 0);
            if (totalValue === 0) {
              return false;
            }
          }
          break;
      }
    }

    return true;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: any,
    lineValues: Map<string, number>,
    eventLookup: Map<any, EventSummary>
  ): boolean {
    if (typeof condition === 'string') {
      // Simple string condition like "value > 0"
      return this.evaluateStringCondition(condition, lineValues, eventLookup);
    }

    if (typeof condition === 'object' && condition.field && condition.operator && condition.value !== undefined) {
      // Object condition like { field: "TOTAL_REVENUE", operator: ">", value: 0 }
      const fieldValue = this.getFieldValue(condition.field, lineValues, eventLookup);
      
      switch (condition.operator) {
        case '>':
          return Number(fieldValue) > Number(condition.value);
        case '<':
          return Number(fieldValue) < Number(condition.value);
        case '>=':
          return Number(fieldValue) >= Number(condition.value);
        case '<=':
          return Number(fieldValue) <= Number(condition.value);
        case '==':
          return fieldValue == condition.value;
        case '!=':
          return fieldValue != condition.value;
        case 'contains':
          return String(fieldValue).includes(String(condition.value));
        case 'startsWith':
          return String(fieldValue).startsWith(String(condition.value));
        case 'endsWith':
          return String(fieldValue).endsWith(String(condition.value));
        default:
          console.warn(`Unknown condition operator: ${condition.operator}`);
          return true;
      }
    }

    return true;
  }

  /**
   * Evaluate string condition
   */
  private evaluateStringCondition(
    condition: string,
    lineValues: Map<string, number>,
    eventLookup: Map<any, EventSummary>
  ): boolean {
    try {
      // Replace field references in condition
      let processedCondition = condition;
      
      // Replace line references
      for (const [lineCode, value] of lineValues.entries()) {
        const regex = new RegExp(`\\b${lineCode}\\b`, 'g');
        processedCondition = processedCondition.replace(regex, String(value));
      }
      
      // Replace event references by event CODE only to avoid numeric-id tokens in formulas
      for (const event of eventLookup.values()) {
        const code = (event as any)?.eventCode;
        if (!code) continue;
        const regex = new RegExp(`\\b${code}\\b`, 'g');
        processedCondition = processedCondition.replace(regex, String(event.totalAmount));
      }
      
      // Evaluate the condition
      const result = new Function(`"use strict"; return (${processedCondition})`)();
      return Boolean(result);
    } catch (error) {
      console.warn(`Error evaluating condition "${condition}":`, error);
      return true;
    }
  }

  /**
   * Get field value from line values or event lookup
   */
  private getFieldValue(
    field: string,
    lineValues: Map<string, number>,
    eventLookup: Map<any, EventSummary>
  ): any {
    // Check line values first
    if (lineValues.has(field)) {
      return lineValues.get(field);
    }
    
    // Check event lookup
    let event = eventLookup.get(field);
    if (!event) {
      // Attempt by code explicitly
      for (const v of eventLookup.values()) {
        if ((v as any)?.eventCode === field) {
          event = v;
          break;
        }
      }
    }
    if (event) {
      return event.totalAmount;
    }
    
    return 0;
  }

  /**
   * Build event values map for formula context
   */
  private buildEventValuesMap(eventLookup: Map<any, EventSummary>): Map<string, number> {
    const eventValues = new Map<string, number>();
    for (const event of eventLookup.values()) {
      const code = (event as any)?.eventCode;
      if (code && !eventValues.has(code)) {
        eventValues.set(code, event.totalAmount);
      }
    }
    return eventValues;
  }
}