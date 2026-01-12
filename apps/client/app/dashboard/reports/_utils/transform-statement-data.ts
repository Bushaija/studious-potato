/**
 * Transform API statement line data to component format
 * 
 * Converts the Budget vs Actual API response format:
 * {
 *   id: string,
 *   description: string,
 *   revisedBudget: number,
 *   actual: number,
 *   variance: number,
 *   performancePercentage?: number,
 *   formatting: { isTotal, isSubtotal, bold, indentLevel, ... }
 * }
 * 
 * To component format:
 * {
 *   description: string,
 *   note: number | null,
 *   current: number | null,    // actual amounts
 *   previous: number | null,   // budget amounts
 *   variance: number | null,
 *   performancePercentage: number | null,
 *   isTotal: boolean,
 *   isSubtotal: boolean
 * }
 */

export interface BudgetVsActualLine {
  id: string;
  description: string;
  revisedBudget: number;
  actual: number;
  variance: number;
  performancePercentage?: number;
  formatting: {
    bold: boolean;
    italic: boolean;
    indentLevel: number;
    isSection: boolean;
    isSubtotal: boolean;
    isTotal: boolean;
  };
  metadata: {
    lineCode: string;
    eventCodes: number[];
    formula?: string;
    isComputed: boolean;
    displayOrder: number;
  };
}

// Legacy interface for backward compatibility
export interface StatementLine {
  id: string;
  description: string;
  currentPeriodValue?: number | null;
  previousPeriodValue?: number | null;
  changeInCurrentPeriodValue?: number | null; // For working capital: change from previous to current
  changeInPreviousPeriodValue?: number | null; // For working capital: change in previous period
  note?: number | null;
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    indentLevel?: number;
    isSection?: boolean;
    isSubtotal?: boolean;
    isTotal?: boolean;
  };
  metadata?: {
    lineCode?: string;
    eventCodes?: number[];
    formula?: string;
    isComputed?: boolean;
    displayOrder?: number;
  };
}

// Three-column statement line interface for NET_ASSETS_CHANGES
export interface ThreeColumnStatementLine {
  id: string;
  description: string;
  accumulatedSurplus?: number | null;
  adjustments?: number | null;
  total?: number | null;
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    indentLevel?: number;
    isSection?: boolean;
    isSubtotal?: boolean;
    isTotal?: boolean;
  };
  metadata?: {
    lineCode?: string;
    eventCodes?: number[];
    formula?: string;
    isComputed?: boolean;
    displayOrder?: number;
  };
}

// Net Assets row interface for three-column format
export interface NetAssetsRow {
  description: string;
  note: number | null;
  accumulated: number | null;
  adjustments: number | null;
  total: number | null;
  isTotal: boolean;
  isSubtotal: boolean;
}

export interface TransformedRow {
  description: string;
  note: number | null;
  current: number | null;    // actual amounts
  previous: number | null;   // budget amounts  
  variance: number | null;
  performancePercentage: number | null;
  isTotal: boolean;
  isSubtotal: boolean;
}

/**
 * Transform a Budget vs Actual line from API format to component format
 */
export function transformBudgetVsActualLine(line: BudgetVsActualLine): TransformedRow {
  // Get note from the first eventCode if available
  const note = line.metadata?.eventCodes && line.metadata.eventCodes.length > 0 
    ? line.metadata.eventCodes[0] 
    : null;

  return {
    description: line.description,
    note: note,
    current: line.actual,           // actual amounts
    previous: line.revisedBudget,   // budget amounts
    variance: line.variance,
    performancePercentage: line.performancePercentage ?? null,
    isTotal: line.formatting?.isTotal ?? false,
    isSubtotal: line.formatting?.isSubtotal ?? false,
  };
}

/**
 * Transform a single statement line from API format to component format (legacy)
 */
export function transformStatementLine(line: StatementLine): TransformedRow {
  // Get note from either the note field or the first eventCode
  const note = line.note ?? 
               (line.metadata?.eventCodes && line.metadata.eventCodes.length > 0 
                 ? line.metadata.eventCodes[0] 
                 : null);

  // Check if this is a working capital line (Changes in receivables/payables)
  const isWorkingCapitalLine = line.metadata?.lineCode === 'CHANGES_RECEIVABLES' || 
                                line.metadata?.lineCode === 'CHANGES_PAYABLES';

  let currentValue = line.currentPeriodValue ?? null;
  let previousValue = line.previousPeriodValue ?? null;

  // For working capital lines, use the pre-calculated change values if available
  if (isWorkingCapitalLine) {
    if (line.changeInCurrentPeriodValue !== undefined && line.changeInCurrentPeriodValue !== null) {
      // Use the pre-calculated change from the API
      currentValue = line.changeInCurrentPeriodValue;
      previousValue = line.changeInPreviousPeriodValue ?? 0;
    } else if (currentValue !== null && previousValue !== null) {
      // Fallback: Calculate the change if not provided by API
      const change = currentValue - previousValue;
      currentValue = change;
      previousValue = 0;
    } else if (currentValue !== null && previousValue === null) {
      // If there's no previous period data at all, treat it as change from 0
      previousValue = 0;
    }
  }

  return {
    description: line.description,
    note: note,
    current: currentValue,
    previous: previousValue,
    variance: null,
    performancePercentage: null,
    isTotal: line.formatting?.isTotal ?? false,
    isSubtotal: line.formatting?.isSubtotal ?? false,
  };
}

/**
 * Transform an array of Budget vs Actual lines from API format to component format
 */
export function transformBudgetVsActualData(lines: BudgetVsActualLine[]): TransformedRow[] {
  return lines.map(transformBudgetVsActualLine);
}

/**
 * Transform an array of statement lines from API format to component format (legacy)
 */
export function transformStatementData(lines: StatementLine[]): TransformedRow[] {
  return lines.map(transformStatementLine);
}

/**
 * Transform Budget vs Actual data with additional filtering or processing
 */
export function transformBudgetVsActualDataWithOptions(
  lines: BudgetVsActualLine[],
  options?: {
    excludeHeaders?: boolean;
    excludeZeroValues?: boolean;
    includeOnlyTotals?: boolean;
  }
): TransformedRow[] {
  let filteredLines = lines;

  if (options?.excludeHeaders) {
    filteredLines = filteredLines.filter(line => 
      !line.formatting?.isSection && line.description.trim() !== ''
    );
  }

  if (options?.excludeZeroValues) {
    filteredLines = filteredLines.filter(line => 
      (line.actual !== 0) || (line.revisedBudget !== 0)
    );
  }

  if (options?.includeOnlyTotals) {
    filteredLines = filteredLines.filter(line => 
      line.formatting?.isTotal || line.formatting?.isSubtotal
    );
  }

  return transformBudgetVsActualData(filteredLines);
}

/**
 * Transform statement data with additional filtering or processing (legacy)
 */
export function transformStatementDataWithOptions(
  lines: StatementLine[],
  options?: {
    excludeHeaders?: boolean;
    excludeZeroValues?: boolean;
    includeOnlyTotals?: boolean;
  }
): TransformedRow[] {
  let filteredLines = lines;

  if (options?.excludeHeaders) {
    filteredLines = filteredLines.filter(line => 
      !line.formatting?.isSection && line.description.trim() !== ''
    );
  }

  if (options?.excludeZeroValues) {
    filteredLines = filteredLines.filter(line => 
      (line.currentPeriodValue !== 0 && line.currentPeriodValue !== null) ||
      (line.previousPeriodValue !== 0 && line.previousPeriodValue !== null)
    );
  }

  if (options?.includeOnlyTotals) {
    filteredLines = filteredLines.filter(line => 
      line.formatting?.isTotal || line.formatting?.isSubtotal
    );
  }

  return transformStatementData(filteredLines);
}

/**
 * Transform a Net Assets line from API format to component format (three-column)
 * Maps accumulatedSurplus → accumulated, adjustments → adjustments, total → total
 */
export function transformNetAssetsLine(line: ThreeColumnStatementLine): NetAssetsRow {
  // Get note from the first eventCode if available
  const note = line.metadata?.eventCodes && line.metadata.eventCodes.length > 0 
    ? line.metadata.eventCodes[0] 
    : null;

  return {
    description: line.description,
    note: note,
    accumulated: line.accumulatedSurplus ?? null,
    adjustments: line.adjustments ?? null,
    total: line.total ?? null,
    isTotal: line.formatting?.isTotal ?? false,
    isSubtotal: line.formatting?.isSubtotal ?? false,
  };
}

/**
 * Transform an array of Net Assets lines from API format to component format (three-column)
 */
export function transformNetAssetsData(lines: ThreeColumnStatementLine[]): NetAssetsRow[] {
  return lines.map(transformNetAssetsLine);
}
