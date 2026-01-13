"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useExecutionFormContext } from "@/features/execution/execution-form-context";
import { Lock, Calculator, Info } from "lucide-react";
import { PaymentStatusControl, PaymentStatus } from "@/features/execution/components/payment-status-control";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { isVATApplicable, getVATCategory, type VATApplicableCategory } from "@/features/execution/utils/vat-applicable-expenses";
import { VATClearanceControl } from "@/features/execution/components/vat-clearance-control";
import { PayableClearanceControl } from "@/features/execution/components/payable-clearance-control";
import { PriorYearAdjustmentDialog, type AdjustmentItem } from "@/features/execution/components/prior-year-adjustment-dialog";
import { getOpeningBalanceWithMapping } from "@/features/execution/utils/activity-code-mapper";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

// Helper function to format values professionally
function formatValue(value: number | undefined | null): string {
  if (value === undefined || value === null || value === 0) {
    return "—";
  }
  return value.toLocaleString();
}

// Helper function to format VAT receivable values (always show numbers, including 0)
function formatVATReceivableValue(value: number | undefined | null): string {
  if (value === undefined || value === null) {
    return "0";
  }
  return value.toLocaleString();
}

// Helper function to extract section code from activity ID
// Example: "MAL_EXEC_HEALTH_CENTER_D_1" -> "D"
function extractSectionCode(activityId: string): string | null {
  const parts = activityId.split('_');
  // Look for single letter sections (A, B, C, D, E, F, G, X)
  for (const part of parts) {
    if (part.length === 1 && /[A-GX]/.test(part)) {
      return part;
    }
  }
  return null;
}

// Helper function to check if an activity is in Section B (Expenditures)
function isSectionBExpense(activityId: string): boolean {
  return activityId.includes('_B_');
}

// Helper function to check if an activity is auto-calculated (Section D or E)
function isAutoCalculatedField(activityId: string): boolean {
  // Cash at Bank (D_1) and all Payables (E_*) are auto-calculated
  return activityId.includes('_D_1') || activityId.includes('_E_');
}

// Helper function to check if a section is Section E (Financial Liabilities)
function isSectionE(sectionId: string): boolean {
  return sectionId === 'E';
}

// Helper function to check if a section is Section D (Financial Assets)
function isSectionD(sectionId: string): boolean {
  return sectionId === 'D';
}

// Helper function to check if an item is a VAT receivable
function isVATReceivableItem(itemTitle: string): boolean {
  return itemTitle.toLowerCase().includes('vat receivable');
}

// Helper function to clean up VAT receivable display names
// Example: "VAT Receivable 1: Communication - airtime" -> "Communication - airtime"
function cleanVATReceivableName(itemTitle: string): string {
  if (!isVATReceivableItem(itemTitle)) return itemTitle;

  // Remove "VAT Receivable X: " prefix
  const match = itemTitle.match(/VAT Receivable \d+:\s*(.+)/i);
  return match ? match[1] : itemTitle;
}

// Helper function to extract VAT category from VAT receivable title
// Example: "VAT Receivable 1: Communication - All" -> "communication_all"
function extractVATCategoryFromTitle(itemTitle: string): VATApplicableCategory | null {
  const titleLower = itemTitle.toLowerCase();
  if (titleLower.includes('communication')) return 'communication_all';
  if (titleLower.includes('maintenance')) return 'maintenance';
  if (titleLower.includes('fuel')) return 'fuel';
  if (titleLower.includes('supplies') || titleLower.includes('office')) return 'office_supplies';
  return null;
}

// Helper function to find the expense activity code for a VAT category
// This searches Section B for the expense that generates this VAT receivable
function findExpenseCodeForVATCategory(
  vatCategory: VATApplicableCategory,
  activities: any,
  projectType: string,
  facilityType: string
): string | null {
  const sectionB = activities?.B;
  if (!sectionB?.subCategories) return null;

  // Search through B-04 (Overheads) subcategory
  const overheads = sectionB.subCategories['B-04'];
  if (!overheads?.items) return null;

  // Map VAT category to expense name pattern
  const namePatterns: Record<VATApplicableCategory, string[]> = {
    'communication_all': ['communication - all', 'communication-all', 'communication all'],
    'maintenance': ['maintenance'],
    'fuel': ['fuel'],
    'office_supplies': ['office supplies', 'supplies'],
  };

  const patterns = namePatterns[vatCategory];
  if (!patterns) return null;

  // Find the matching expense item
  for (const item of overheads.items) {
    if (item.isTotalRow || item.isComputed) continue;

    const itemNameLower = item.name.toLowerCase();
    if (patterns.some(pattern => itemNameLower.includes(pattern))) {
      return item.code;
    }
  }

  return null;
}

// Helper function to check if an activity is Section X (Miscellaneous Adjustments)
function isSectionXMiscellaneous(activityId: string): boolean {
  return activityId.includes('_X_');
}

// Helper function to check if an activity is Section G (Closing Balance)
function isSectionG(sectionId: string): boolean {
  return sectionId === 'G';
}

// Helper function to check if an item is a prior year adjustment item
function isPriorYearAdjustmentItem(itemId: string, itemTitle: string): 'cash' | 'payable' | 'receivable' | null {
  // Check if it's in G-01 subcategory (prior year adjustments)
  if (!itemId.includes('_G_') && !itemId.includes('_G-01_')) return null;
  
  const titleLower = itemTitle.toLowerCase();
  if (titleLower === 'cash' || titleLower.includes('cash adjustment')) return 'cash';
  if (titleLower === 'payable' || titleLower.includes('payable adjustment')) return 'payable';
  if (titleLower === 'receivable' || titleLower.includes('receivable adjustment')) return 'receivable';
  
  return null;
}

// Helper function to check if a subcategory is the Prior Year Adjustments subcategory (G-01)
function isPriorYearAdjustmentSubcategory(subcategoryId: string): boolean {
  return subcategoryId.includes('G-01');
}

// Helper function to check if an activity is Section D "Other Receivables" (auto-calculated from Section X)
function isOtherReceivablesField(activityId: string): boolean {
  // Other Receivables can be identified by:
  // 1. Activity code containing '_D_D-01_5' (subcategory D-01, display order 5)
  // 2. Activity code containing '_D_4' (legacy format)
  // 3. Activity name containing 'other receivable' (checked elsewhere)
  return activityId.includes('_D_D-01_5') || activityId.includes('_D_4');
}

// Helper function to render expense input cell (VAT or regular)
function renderExpenseInputCell(
  ctx: any,
  item: any,
  q: typeof QUARTERS[number],
  editable: boolean,
  value: number | undefined
) {
  const key = q.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
  const quarterKey = key;

  // Check if this is Section X (Miscellaneous Adjustments)
  const isSectionX = isSectionXMiscellaneous(item.id);

  // Check if this is a VAT-applicable expense
  const isVAT = isVATApplicable(item.id, item.title);

  if (isVAT && editable) {
    // Render VAT expense with enhanced payment status control
    const netAmount = ctx.formData[item.id]?.netAmount?.[quarterKey] || 0;
    const vatAmount = ctx.formData[item.id]?.vatAmount?.[quarterKey] || 0;

    const paymentStatusData = ctx.formData[item.id]?.paymentStatus;
    const amountPaidData = ctx.formData[item.id]?.amountPaid;

    const paymentStatus = typeof paymentStatusData === 'object' && paymentStatusData !== null
      ? (paymentStatusData[quarterKey] ?? "unpaid")
      : (paymentStatusData ?? "unpaid");

    const amountPaid = typeof amountPaidData === 'object' && amountPaidData !== null
      ? (Number(amountPaidData[quarterKey]) || 0)
      : (Number(amountPaidData) || 0);

    return (
      <div className="flex items-center justify-center gap-2">
        {/* Net Amount Input */}
        <Input
          key={`${item.id}-${key}-net-${netAmount}`}
          className="h-8 w-32 text-center"
          defaultValue={netAmount}
          type="number"
          step="0.01"
          inputMode="decimal"
          placeholder="Net amount"
          onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
            const newNetAmount = Number(e.target.value || 0);
            const currentVATAmount = ctx.formData[item.id]?.vatAmount?.[quarterKey] || 0;
            ctx.updateVATExpense(item.id, newNetAmount, currentVATAmount);
          }}
        />

        {/* Enhanced Payment Status Control with VAT fields */}
        <PaymentStatusControl
          expenseCode={item.id}
          amount={netAmount}
          paymentStatus={paymentStatus as PaymentStatus}
          amountPaid={amountPaid}
          onChange={(status, paid) => ctx.updateExpensePayment(item.id, status, paid)}
          disabled={!editable}
          isVATApplicable={true}
          vatAmount={vatAmount}
          onVATAmountChange={(vat) => {
            const currentNetAmount = ctx.formData[item.id]?.netAmount?.[quarterKey] || 0;
            ctx.updateVATExpense(item.id, currentNetAmount, vat);
          }}
        />
      </div>
    );
  } else if (isSectionX) {
    // Render Section X (Miscellaneous Adjustments) with validation and real-time feedback
    // This section implements double-entry accounting for Other Receivables:
    // - Entering an amount here increases Other Receivables in Section D
    // - The same amount decreases Cash at Bank in Section D
    // - This ensures proper accounting where receivables must originate from a cash transaction
    const hasValidationError = ctx.miscValidationError &&
      !ctx.miscValidationError.isValid &&
      ctx.otherReceivableCode === item.id;

    return (
      <div className="flex flex-col items-center gap-1 w-full">
        <div className="flex items-center justify-center gap-2">
          <Input
            key={`${item.id}-${key}-${value ?? 0}`}
            className={cn(
              "h-8 w-32 text-center",
              hasValidationError && "border-destructive focus-visible:ring-destructive"
            )}
            defaultValue={value ?? 0}
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="0"
            onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
              const newValue = Number(e.target.value || 0);
              ctx.onFieldChange(item.id, newValue);
            }}
            aria-invalid={hasValidationError}
            aria-describedby={hasValidationError ? `${item.id}-${key}-error` : `${item.id}-${key}-help`}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-blue-500 cursor-help" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {/* <p className="text-xs font-semibold mb-1">Double-Entry Accounting</p> */}
                {/* <p className="text-xs">
                  Entering an Other Receivable will reduce Cash at Bank by the same amount. 
                  This ensures proper accounting where all receivables must originate from a transaction that reduces cash.
                </p> */}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {/* Help text explaining the double-entry behavior */}
        {/* {!hasValidationError && editable && (
          <div 
            id={`${item.id}-${key}-help`}
            className="text-xs text-muted-foreground text-center max-w-xs italic"
          >
            Entering an Other Receivable will reduce Cash at Bank by the same amount
          </div>
        )} */}
        {hasValidationError && (
          <div
            id={`${item.id}-${key}-error`}
            className="text-xs text-destructive text-center max-w-xs"
            role="alert"
          >
            {ctx.miscValidationError.error}
          </div>
        )}
        {ctx.miscValidationError?.maxAllowableAmount !== undefined && editable && (
          <div className="text-xs text-muted-foreground text-center">
            Max: {ctx.miscValidationError.maxAllowableAmount.toLocaleString()} RWF
          </div>
        )}
        {value && value > 0 && editable && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span>Cash at Bank will decrease by {value.toLocaleString()} RWF</span>
          </div>
        )}
      </div>
    );
  } else {
    // Render regular expense input
    return (
      <div className="flex items-center justify-center gap-2">
        <Input
          key={`${item.id}-${key}-${value ?? 0}`}
          className="h-8 w-32 text-center"
          defaultValue={value ?? 0}
          type="number"
          step="0.01"
          inputMode="decimal"
          onBlur={(e: React.FocusEvent<HTMLInputElement>) => ctx.onFieldChange(item.id, Number(e.target.value || 0))}
        />
        {isSectionBExpense(item.id) && (() => {
          const paymentStatusData = ctx.formData[item.id]?.paymentStatus;
          const amountPaidData = ctx.formData[item.id]?.amountPaid;

          const paymentStatus = typeof paymentStatusData === 'object' && paymentStatusData !== null
            ? (paymentStatusData[quarterKey] ?? "unpaid")
            : (paymentStatusData ?? "unpaid");

          const amountPaid = typeof amountPaidData === 'object' && amountPaidData !== null
            ? (Number(amountPaidData[quarterKey]) || 0)
            : (Number(amountPaidData) || 0);

          return (
            <PaymentStatusControl
              expenseCode={item.id}
              amount={value ?? 0}
              paymentStatus={paymentStatus as PaymentStatus}
              amountPaid={amountPaid}
              onChange={(status, amountPaid) => ctx.updateExpensePayment(item.id, status, amountPaid)}
              disabled={!editable}
            />
          );
        })()}
      </div>
    );
  }
}

// Helper function to format cumulative balance based on section type
function formatCumulativeBalance(value: number | undefined | null, activityId: string): string {
  const sectionCode = extractSectionCode(activityId);
  const stockSections = ['D', 'E'];
  const isStockSection = sectionCode && stockSections.includes(sectionCode);

  if (isStockSection) {
    // Stock sections: distinguish between 0 and undefined
    if (value === undefined || value === null) {
      return "—"; // No data entered
    }
    if (value === 0) {
      return "0"; // Explicit zero = no balance remaining
    }
    return value.toLocaleString(); // Format number
  } else {
    // Flow sections: 0 and undefined both show as dash
    if (value === undefined || value === null || value === 0) {
      return "—"; // No activity or no data
    }
    return value.toLocaleString(); // Format number
  }
}

// Component to render Section D with VAT Receivables subsection
interface SectionDRendererProps {
  section: any;
  ctx: any;
  projectType: "HIV" | "MAL" | "TB";
  facilityType: "hospital" | "health_center";
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  activities: any;
  previousQuarterBalances: any;
}

function SectionDRenderer({ section, ctx, projectType, facilityType, quarter, activities, previousQuarterBalances }: SectionDRendererProps) {

  // Calculate VAT receivables for each category and quarter
  // Formula: closing = opening + incurred - cleared
  // Returns: { q1: { communication_all: 100, ... }, q2: { communication_all: 200, ... }, ... }
  const vatReceivablesByQuarter = React.useMemo(() => {
    const allQuarters = ['q1', 'q2', 'q3', 'q4'] as const;
    const result: Record<string, Record<VATApplicableCategory, number>> = {};

    // Initialize all quarters
    allQuarters.forEach(qKey => {
      result[qKey] = {
        'communication_all': 0,
        'maintenance': 0,
        'fuel': 0,
        'office_supplies': 0,
      };
    });

    // Iterate through all expenses in Section B
    const sectionB = activities?.B;
    if (!sectionB?.subCategories) {
      return result;
    }

    // Map VAT categories to their UI codes for opening balance lookup
    // VAT receivable codes are generated as: PROJECT_EXEC_FACILITY_D_VAT_CATEGORY
    // e.g., HIV_EXEC_HOSPITAL_D_VAT_COMMUNICATION_ALL
    const vatCategoryToUICode: Record<VATApplicableCategory, string> = {
      'communication_all': '_D_VAT_COMMUNICATION_ALL',
      'maintenance': '_D_VAT_MAINTENANCE',
      'fuel': '_D_VAT_FUEL',
      'office_supplies': '_D_VAT_SUPPLIES',
    };

    // Calculate opening balances for each VAT category from previous quarter
    const openingBalances: Record<VATApplicableCategory, number> = {
      'communication_all': 0,
      'maintenance': 0,
      'fuel': 0,
      'office_supplies': 0,
    };

    // Only get opening balances if we're not in Q1
    if (previousQuarterBalances?.exists) {
      Object.entries(vatCategoryToUICode).forEach(([category, uiCodeSuffix]) => {
        // Construct the full UI code (e.g., "HIV_EXEC_HOSPITAL_D_VAT_COMMUNICATION_ALL")
        // We need to get the prefix from an existing activity code
        const sampleCode = Object.keys(ctx.formData).find(k => k.includes('_D_')) || '';
        const prefix = sampleCode.split('_D_')[0];
        const fullUICode = `${prefix}${uiCodeSuffix}`;
        
        const openingBalance = getOpeningBalanceWithMapping(
          fullUICode,
          previousQuarterBalances,
          projectType,
          facilityType
        );
        
        openingBalances[category as VATApplicableCategory] = openingBalance;
      });
    }

    Object.values(sectionB.subCategories).forEach((subCatData: any) => {
      const items = subCatData.items || [];
      items.forEach((item: any) => {
        if (item.isTotalRow || item.isComputed) return;

        const isVAT = isVATApplicable(item.code, item.name);
        if (!isVAT) return;

        const vatCategory = getVATCategory(item.name);
        if (!vatCategory) return;

        const expenseData = ctx.formData[item.code];
        if (!expenseData) return;

        // Calculate for each quarter using the formula: closing = opening + incurred - cleared
        allQuarters.forEach(qKey => {
          const vatIncurred = Number(expenseData.vatAmount?.[qKey]) || 0;
          const vatCleared = Number(expenseData.vatCleared?.[qKey]) || 0;
          
          // For Q1, opening balance is always 0
          // For Q2+, use the opening balance from previous quarter
          const opening = qKey === 'q1' ? 0 : openingBalances[vatCategory];
          
          // Calculate closing balance: opening + incurred - cleared
          const closing = opening + vatIncurred - vatCleared;

          if (closing > 0 || vatIncurred > 0 || vatCleared > 0) {
            result[qKey][vatCategory] += closing;
          }
        });
      });
    });

    return result;
  }, [activities, ctx.formData, previousQuarterBalances, projectType, facilityType]);

  // Separate regular asset items from subcategories
  const regularAssets = React.useMemo(() => {
    return section.children?.filter((item: any) => !item.isSubcategory) || [];
  }, [section.children]);

  const subcategories = React.useMemo(() => {
    return section.children?.filter((item: any) => item.isSubcategory) || [];
  }, [section.children]);

  return (
    <>
      {/* Section D Header */}
      <TableRow className="bg-muted/50">
        <TableCell className="sticky left-0 z-10 bg-muted/50 font-bold">
          <button
            type="button"
            className="mr-2 inline-flex items-center text-xs text-muted-foreground hover:underline"
            onClick={() => ctx.onToggleSection(section.id)}
            aria-expanded={Boolean(ctx.expandState[section.id])}
          >
            {ctx.expandState[section.id] ? "▾" : "▸"}
          </button>
          {section.title}
        </TableCell>
        {QUARTERS.map((q) => {
          const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
          const local = (section as any)[key] as number | undefined;
          const fallback = (ctx.getSectionTotals(section.id) as any)[key] as number | undefined;
          const val = section.id === 'D' ? (typeof fallback === 'number' ? fallback : local) : (typeof local === 'number' ? local : fallback);
          return (
            <TableCell key={`${section.id}-${q}`} className="text-center">
              {ctx.isQuarterVisible(q as any) ? (
                ctx.isQuarterEditable(q as any) ? (
                  <span>{formatValue(val)}</span>
                ) : (
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-gray-600">{formatValue(val)}</span>
                    <Lock className="h-3 w-3 text-gray-400" />
                  </div>
                )
              ) : (
                <Lock className="h-3 w-3 mx-auto text-muted-foreground" />
              )}
            </TableCell>
          );
        })}
        <TableCell className="text-center">
          {(() => {
            const local = (section as any).cumulativeBalance as number | undefined;
            const fallback = ctx.getSectionTotals(section.id).cumulativeBalance as number | undefined;
            const val = section.id === 'D' ? (typeof fallback === 'number' ? fallback : local) : (typeof local === 'number' ? local : fallback);
            return formatCumulativeBalance(val, section.id);
          })()}
        </TableCell>
        <TableCell />
      </TableRow>

      {/* Expanded content */}
      {ctx.expandState[section.id] !== false && (
        <>
          {/* Regular asset items (Cash at Bank, Petty Cash, etc.) */}
          {regularAssets.map((item: any) => {
            // DEBUG: Log item data from API
            console.log('[SECTION D ITEM DEBUG]', {
              itemId: item.id,
              itemTitle: item.title,
              q1: item.q1,
              q2: item.q2,
              q3: item.q3,
              q4: item.q4,
              cumulativeBalance: item.cumulativeBalance,
              isCalculated: item.isCalculated,
              formDataForItem: ctx.formData[item.id]
            });
            
            const rowState = ctx.getRowState(item.id);
            const editable = rowState.isEditable && (item.isEditable !== false) && !item.isCalculated;
            const isAutoCalc = isAutoCalculatedField(item.id);
            const isOtherReceivables = isOtherReceivablesField(item.id);

            // Get opening balance from previous quarter for this item
            const openingBalance = getOpeningBalanceWithMapping(
              item.id,
              previousQuarterBalances,
              projectType,
              facilityType
            );
            const hasOpeningBalance = openingBalance > 0;

            return (
              <TableRow key={item.id}>
                <TableCell className="sticky left-0 z-10 bg-background pl-12">
                  <div className="flex items-center gap-2">
                    <span>{item.title}</span>
                    {hasOpeningBalance && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span>Rolled over</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              Rolled over from {previousQuarterBalances?.quarter} closing balance: {openingBalance.toLocaleString()} RWF
                            </p>
                            {previousQuarterBalances?.executionId && (
                              <a 
                                href={`/execution/${previousQuarterBalances.executionId}`}
                                className="text-xs text-blue-500 hover:underline mt-1 block"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View {previousQuarterBalances.quarter} data →
                              </a>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
                {QUARTERS.map((q) => {
                  const isComputed = item.isCalculated === true || isAutoCalc || isOtherReceivables;
                  const locked = ctx.isRowLocked(item.id, q as any);
                  const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
                  const value = (item.isCalculated === true || isAutoCalc || isOtherReceivables)
                    ? ((item as any)[key] as number | undefined) ?? (ctx.formData[item.id]?.[key] as number | undefined)
                    : ((ctx.formData[item.id]?.[key] ?? (item as any)[key]) as number | undefined);

                  // DEBUG: Log raw value from API/formData
                  console.log('[VALUE SOURCE DEBUG]', {
                    itemId: item.id,
                    itemTitle: item.title,
                    quarter: q,
                    key,
                    isComputed,
                    valueFromItem: (item as any)[key],
                    valueFromFormData: ctx.formData[item.id]?.[key],
                    finalValue: value,
                    openingBalance,
                    source: (item.isCalculated === true || isAutoCalc || isOtherReceivables) 
                      ? 'item (computed)' 
                      : 'formData (user input)'
                  });

                  const getTooltipText = () => {
                    if (isOtherReceivables) {
                      return "Auto-calculated from Miscellaneous Adjustments (Section X)";
                    } else if (item.id.includes('_D_1')) {
                      return "Auto-calculated: Opening Balance - Total Paid Expenses";
                    }
                    return "Auto-calculated field";
                  };

                  // Check if this is the current quarter and has opening balance
                  const isCurrentQuarter = q === quarter;
                  const showOpeningBalanceInfo = isCurrentQuarter && hasOpeningBalance;

                  return (
                    <TableCell key={`${item.id}-${q}`} className="text-center">
                      {ctx.isQuarterVisible(q as any) ? (
                        ctx.isQuarterEditable(q as any) ? (
                          locked || !editable || isComputed ? (
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center justify-center gap-1">
                                {(() => {
                                  // Check if this is a stock section (D or E) - these show cumulative values
                                  const isStockSection = item.id.includes('_D_') || item.id.includes('_E_');
                                  // For stock sections, display cumulative value as-is
                                  // For flow sections, subtract opening balance to show only new amount
                                  const displayValue = isCurrentQuarter && !isStockSection 
                                    ? (Number(value || 0) - openingBalance) 
                                    : value;
                                  
                                  // DEBUG: Log display value calculation
                                  console.log('[DISPLAY DEBUG]', {
                                    itemId: item.id,
                                    itemTitle: item.title,
                                    quarter: q,
                                    isCurrentQuarter,
                                    isStockSection,
                                    rawValue: value,
                                    openingBalance,
                                    displayValue,
                                    calculation: isCurrentQuarter && !isStockSection 
                                      ? `${value} - ${openingBalance} = ${displayValue}`
                                      : 'No subtraction (stock section or not current quarter)'
                                  });
                                  
                                  return (
                                    <span className={cn(isComputed && "text-blue-600 font-medium")}>
                                      {formatValue(displayValue)}
                                    </span>
                                  );
                                })()}
                                {isComputed && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Calculator className="h-3 w-3 text-blue-500 cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">{getTooltipText()}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              {showOpeningBalanceInfo && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="text-xs text-green-600 flex items-center gap-1 cursor-help">
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>Opening: {openingBalance.toLocaleString()}</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">
                                        Rolled over from {previousQuarterBalances?.quarter} closing balance: {openingBalance.toLocaleString()} RWF
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {/* Other Receivable Clearance Control - uses same VATClearanceControl component */}
                              {isOtherReceivables && isCurrentQuarter && (value ?? 0) > 0 && (
                                <VATClearanceControl
                                  vatCategory={'other_receivables' as any}
                                  categoryLabel="Other Receivables"
                                  receivableBalance={value ?? 0}
                                  clearedAmount={Number(ctx.formData[item.id]?.otherReceivableCleared?.[key]) || 0}
                                  onClearVAT={(amount) => {
                                    ctx.clearOtherReceivable(item.id, amount);
                                  }}
                                  disabled={false}
                                  readOnly={false}
                                />
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <Input
                                className="h-8 w-32 text-center"
                                type="number"
                                value={(() => {
                                  // Check if this is a stock section (D or E) - these show cumulative values
                                  const isStockSection = item.id.includes('_D_') || item.id.includes('_E_');
                                  // For stock sections, display cumulative value as-is
                                  // For flow sections, subtract opening balance to show only new amount
                                  const inputValue = (isCurrentQuarter && !isStockSection 
                                    ? (Number(value || 0) - openingBalance) 
                                    : value) ?? "";
                                  
                                  // DEBUG: Log input value calculation
                                  console.log('[INPUT DEBUG]', {
                                    itemId: item.id,
                                    itemTitle: item.title,
                                    quarter: q,
                                    isCurrentQuarter,
                                    isStockSection,
                                    rawValue: value,
                                    openingBalance,
                                    inputValue,
                                    calculation: isCurrentQuarter && !isStockSection 
                                      ? `${value} - ${openingBalance} = ${inputValue}`
                                      : 'No subtraction (stock section or not current quarter)'
                                  });
                                  
                                  return inputValue;
                                })()}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? undefined : Number(e.target.value);
                                  ctx.onFieldChange(item.id, val);
                                }}
                                onBlur={(e: React.FocusEvent<HTMLInputElement>) => ctx.onFieldChange(item.id, Number(e.target.value || 0))}
                              />
                              {showOpeningBalanceInfo && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="text-xs text-green-600 flex items-center gap-1 cursor-help">
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>Opening: {openingBalance.toLocaleString()}</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">
                                        Rolled over from {previousQuarterBalances?.quarter} closing balance: {openingBalance.toLocaleString()} RWF
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-gray-600">{formatValue(value)}</span>
                            <Lock className="h-3 w-3 text-gray-400" />
                          </div>
                        )
                      ) : (
                        <Lock className="h-3 w-3 mx-auto text-muted-foreground" />
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-center">
                  {formatCumulativeBalance(item.cumulativeBalance, item.id)}
                </TableCell>
                <TableCell className="text-center">
                  {!item.isCalculated && (
                    <input
                      className="h-8 w-52 border rounded px-2"
                      defaultValue={ctx.formData[item.id]?.comment ?? ""}
                      onBlur={(e) => ctx.onCommentChange(item.id, e.target.value)}
                      disabled={!editable}
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}

          {/* Subcategories (like D-01 Receivables) */}
          {subcategories.map((subcategory: any) => {
                return (
                  <React.Fragment key={subcategory.id}>
                    {/* Subcategory header row */}
                    {/* <TableRow className="bg-muted/30">
                      <TableCell className="sticky left-0 z-10 bg-muted/30 font-medium pl-8">
                        <button
                          type="button"
                          className="mr-2 inline-flex items-center text-xs text-muted-foreground hover:underline"
                          onClick={() => ctx.onToggleSection(subcategory.id)}
                          aria-expanded={Boolean(ctx.expandState[subcategory.id])}
                        >
                          {ctx.expandState[subcategory.id] ? "▾" : "▸"}
                        </button>
                        {subcategory.title}
                      </TableCell>
                      {QUARTERS.map((q) => {
                        const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
                        const val = (subcategory as any)[key] as number | undefined;
                        return (
                          <TableCell key={`${subcategory.id}-${q}`} className="text-center">
                            {ctx.isQuarterVisible(q as any) ? (
                              ctx.isQuarterEditable(q as any) ? (
                                <span>{formatValue(val)}</span>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-gray-600">{formatValue(val)}</span>
                                  <Lock className="h-3 w-3 text-gray-400" />
                                </div>
                              )
                            ) : (
                              <Lock className="h-3 w-3 mx-auto text-muted-foreground" />
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">{formatCumulativeBalance(subcategory.cumulativeBalance, subcategory.id)}</TableCell>
                      <TableCell />
                    </TableRow> */}

                    {/* Subcategory child items (VAT Receivables, etc.) */}
                    {ctx.expandState[subcategory.id] !== false && subcategory.children?.map((item: any) => {
                const vatCategory = extractVATCategoryFromTitle(item.title);
                const rowState = ctx.getRowState(item.id);
                const currentQuarterKey = quarter.toLowerCase() as "q1" | "q2" | "q3" | "q4";
                
                // Use saved value from formData instead of calculating
                // This ensures values display correctly in view mode
                const receivableBalance = Number(ctx.formData[item.id]?.[currentQuarterKey]) || 0;

                // 🐛 DEBUG: VAT Receivable Display
                console.log(`👁️ [VAT DISPLAY] ${item.title}`, {
                  itemId: item.id,
                  quarter,
                  vatCategory,
                  receivableBalance,
                  formDataValue: ctx.formData[item.id]?.[currentQuarterKey],
                  rawFormData: ctx.formData[item.id]
                });

                // Get opening balance from previous quarter for this VAT receivable item
                const openingBalance = getOpeningBalanceWithMapping(
                  item.id,
                  previousQuarterBalances,
                  projectType,
                  facilityType
                );
                const hasOpeningBalance = openingBalance > 0;

                // Find the expense code for this VAT category to track clearances
                const expenseCode = vatCategory ? findExpenseCodeForVATCategory(vatCategory, activities, projectType, facilityType) : null;
                
                // Get total cleared amount for this category across all quarters
                const totalCleared = expenseCode 
                  ? Object.keys({ q1: 0, q2: 0, q3: 0, q4: 0 }).reduce((sum, qKey) => {
                      const cleared = ctx.formData[expenseCode]?.vatCleared?.[qKey] || 0;
                      return sum + cleared;
                    }, 0)
                  : 0;

                return (
                  <TableRow key={item.id} className="bg-blue-50/20">
                    <TableCell className="sticky left-0 z-10 bg-blue-50/20 pl-12 py-5 text-sm">
                      <div className="flex items-center gap-2">
                        <span>{item.title}</span>
                        {hasOpeningBalance && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  <span>Rolled over</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  Rolled over from {previousQuarterBalances?.quarter} closing balance: {openingBalance.toLocaleString()} RWF
                                </p>
                                {previousQuarterBalances?.executionId && (
                                  <a 
                                    href={`/execution/${previousQuarterBalances.executionId}`}
                                    className="text-xs text-blue-500 hover:underline mt-1 block"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    View {previousQuarterBalances.quarter} data →
                                  </a>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    {QUARTERS.map((q) => {
                      const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
                      // Use saved value from formData for this quarter
                      const value = Number(ctx.formData[item.id]?.[key]) || 0;
                      const isCurrentQuarter = q === quarter;
                      const showOpeningBalanceInfo = isCurrentQuarter && hasOpeningBalance;

                      // 🐛 DEBUG: VAT Receivable Quarter Display
                      if (isCurrentQuarter) {
                        console.log(`👁️ [VAT QUARTER DISPLAY] ${item.title} - ${q}`, {
                          itemId: item.id,
                          quarter: q,
                          key,
                          value,
                          openingBalance,
                          hasOpeningBalance,
                          formDataRaw: ctx.formData[item.id]?.[key],
                          isCurrentQuarter
                        });
                      }

                      // Check if this is an Other Receivables item (not VAT)
                      const isOtherReceivablesItem = isOtherReceivablesField(item.id);
                      
                      // Get cleared amount for Other Receivables
                      const otherReceivableTotalCleared = isOtherReceivablesItem 
                        ? (Number(ctx.formData[item.id]?.otherReceivableCleared?.[key]) || 0)
                        : 0;

                      return (
                        <TableCell key={`${item.id}-${q}`} className="text-center">
                          {ctx.isQuarterVisible(q as any) ? (
                            ctx.isQuarterEditable(q as any) ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <span className="text-blue-600 font-medium">
                                      {formatValue(value)}
                                    </span>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Calculator className="h-3 w-3 text-blue-500 cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs">{isOtherReceivablesItem ? 'Auto-calculated from Miscellaneous Adjustments (Section X)' : 'Auto-calculated from VAT-applicable expenses in Section B'}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  {/* VAT Clearance Control - only show for current quarter with balance */}
                                  {isCurrentQuarter && vatCategory && expenseCode && value > 0 && (
                                    <VATClearanceControl
                                      vatCategory={vatCategory}
                                      categoryLabel={cleanVATReceivableName(item.title)}
                                      receivableBalance={value}
                                      clearedAmount={totalCleared}
                                      onClearVAT={(amount) => {
                                        ctx.clearVAT(expenseCode, amount);
                                      }}
                                      disabled={false}
                                      readOnly={false}
                                    />
                                  )}
                                  {/* Other Receivable Clearance Control - uses same VATClearanceControl component */}
                                  {isCurrentQuarter && isOtherReceivablesItem && value > 0 && (
                                    <VATClearanceControl
                                      vatCategory={'other_receivables' as any}
                                      categoryLabel="Other Receivables"
                                      receivableBalance={value}
                                      clearedAmount={otherReceivableTotalCleared}
                                      onClearVAT={(amount) => {
                                        ctx.clearOtherReceivable(item.id, amount);
                                      }}
                                      disabled={false}
                                      readOnly={false}
                                    />
                                  )}
                                </div>
                                {showOpeningBalanceInfo && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="text-xs text-green-600 flex items-center gap-1 cursor-help">
                                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          <span>Opening: {openingBalance.toLocaleString()}</span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">
                                          Rolled over from {previousQuarterBalances?.quarter} closing balance: {openingBalance.toLocaleString()} RWF
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-gray-600">{formatValue(value)}</span>
                                <Lock className="h-3 w-3 text-gray-400" />
                              </div>
                            )
                          ) : (
                            <Lock className="h-3 w-3 mx-auto text-muted-foreground" />
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      {(() => {
                        // Calculate total from saved formData values
                        const q1 = Number(ctx.formData[item.id]?.q1) || 0;
                        const q2 = Number(ctx.formData[item.id]?.q2) || 0;
                        const q3 = Number(ctx.formData[item.id]?.q3) || 0;
                        const q4 = Number(ctx.formData[item.id]?.q4) || 0;
                        const quarters = [q1, q2, q3, q4];
                        const quarterOrder = ["Q1", "Q2", "Q3", "Q4"] as const;
                        const currentIndex = quarterOrder.indexOf(quarter);

                        const latest = currentIndex >= 0 ? quarters[currentIndex] : undefined;

                        return formatCumulativeBalance(latest, item.id);
                      })()}
                    </TableCell>
                    <TableCell className="text-center">
                      {/* Comment field for VAT receivables */}
                    </TableCell>
                  </TableRow>
                );
              })}
                  </React.Fragment>
                );
              })}
        </>
      )}
    </>
  );
}

// Component to render Section E with Payables and VAT Receivables subsections
interface SectionERendererProps {
  section: any;
  ctx: any;
  projectType: "HIV" | "MAL" | "TB";
  facilityType: "hospital" | "health_center";
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  activities: any;
  previousQuarterBalances: any;
}

function SectionERenderer({ section, ctx, projectType, facilityType, quarter, activities, previousQuarterBalances }: SectionERendererProps) {
  // Filter out VAT receivables from Section E - they should only appear in Section D
  const payableItems = React.useMemo(() => {
    const items = section.children?.filter((item: any) => !isVATReceivableItem(item.title)) || [];
    return items;
  }, [section.children]);



  return (
    <>
      {/* Section E Header */}
      <TableRow className="bg-muted/50">
        <TableCell className="sticky left-0 z-10 bg-muted/50 font-bold">
          <button
            type="button"
            className="mr-2 inline-flex items-center text-xs text-muted-foreground hover:underline"
            onClick={() => ctx.onToggleSection(section.id)}
            aria-expanded={Boolean(ctx.expandState[section.id])}
          >
            {ctx.expandState[section.id] ? "▾" : "▸"}
          </button>
          {section.title}
        </TableCell>
        {QUARTERS.map((q) => {
          const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
          const local = (section as any)[key] as number | undefined;
          const fallback = (ctx.getSectionTotals(section.id) as any)[key] as number | undefined;
          const val = section.id === 'D' ? (typeof fallback === 'number' ? fallback : local) : (typeof local === 'number' ? local : fallback);
          return (
            <TableCell key={`${section.id}-${q}`} className="text-center">
              {ctx.isQuarterVisible(q as any) ? (
                ctx.isQuarterEditable(q as any) ? (
                  <span>{formatValue(val)}</span>
                ) : (
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-gray-600">{formatValue(val)}</span>
                    <Lock className="h-3 w-3 text-gray-400" />
                  </div>
                )
              ) : (
                <Lock className="h-3 w-3 mx-auto text-muted-foreground" />
              )}
            </TableCell>
          );
        })}
        <TableCell className="text-center">
          {(() => {
            const local = (section as any).cumulativeBalance as number | undefined;
            const fallback = ctx.getSectionTotals(section.id).cumulativeBalance as number | undefined;
            const val = section.id === 'D' ? (typeof fallback === 'number' ? fallback : local) : (typeof local === 'number' ? local : fallback);
            return formatCumulativeBalance(val, section.id);
          })()}
        </TableCell>
        <TableCell />
      </TableRow>

      {/* Expanded content */}
      {ctx.expandState[section.id] !== false && (
        <>
          {/* Section E items (payables only - VAT receivables excluded) */}
          {payableItems.map((item: any) => {
            const rowState = ctx.getRowState(item.id);
            const editable = rowState.isEditable && (item.isEditable !== false) && !item.isCalculated;
            const isAutoCalc = isAutoCalculatedField(item.id);

            // Get opening balance from previous quarter for this item
            const openingBalance = getOpeningBalanceWithMapping(
              item.id,
              previousQuarterBalances,
              projectType,
              facilityType
            );
            const hasOpeningBalance = openingBalance > 0;

            return (
              <TableRow key={item.id}>
                <TableCell className="sticky left-0 z-10 bg-background pl-12">
                  <div className="flex items-center gap-2">
                    <span>{item.title}</span>
                    {hasOpeningBalance && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span>Rolled over</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              Rolled over from {previousQuarterBalances?.quarter} closing balance: {openingBalance.toLocaleString()} RWF
                            </p>
                            {previousQuarterBalances?.executionId && (
                              <a 
                                href={`/execution/${previousQuarterBalances.executionId}`}
                                className="text-xs text-blue-500 hover:underline mt-1 block"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View {previousQuarterBalances.quarter} data →
                              </a>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
                {QUARTERS.map((q) => {
                  const isComputed = item.isCalculated === true || isAutoCalc;
                  const locked = ctx.isRowLocked(item.id, q as any);
                  const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";

                  // Get value for payables (auto-calculated from unpaid expenses)
                  const value = (item.isCalculated === true || isAutoCalc)
                    ? ((item as any)[key] as number | undefined) ?? (ctx.formData[item.id]?.[key] as number | undefined)
                    : ((ctx.formData[item.id]?.[key] ?? (item as any)[key]) as number | undefined);

                  const getTooltipText = () => {
                    const payableName = item.title.toLowerCase();
                    if (payableName.includes('salaries')) {
                      return "Auto-calculated: Unpaid Human Resources expenses";
                    } else if (payableName.includes('supervision')) {
                      return "Auto-calculated: Unpaid M&E supervision expenses";
                    } else if (payableName.includes('meetings')) {
                      return "Auto-calculated: Unpaid M&E meeting expenses";
                    } else if (payableName.includes('sample transport')) {
                      return "Auto-calculated: Unpaid sample transport expenses";
                    } else if (payableName.includes('home visits')) {
                      return "Auto-calculated: Unpaid home visit expenses";
                    } else if (payableName.includes('travel') || payableName.includes('survellance') || payableName.includes('surveillance')) {
                      return "Auto-calculated: Unpaid travel surveillance expenses";
                    } else if (payableName.includes('maintenance')) {
                      return "Auto-calculated: Unpaid maintenance expenses";
                    } else if (payableName.includes('supplies')) {
                      return "Auto-calculated: Unpaid office supplies expenses";
                    } else if (payableName.includes('transport reporting')) {
                      return "Auto-calculated: Unpaid transport reporting expenses";
                    } else if (payableName.includes('bank charges')) {
                      return "Auto-calculated: Unpaid bank charges";
                    } else {
                      return "Auto-calculated: Sum of unpaid expenses in this category";
                    }
                  };

                  const isCurrentQuarter = q === quarter;
                  
                  // Get total cleared amount for this payable across all quarters
                  const totalCleared = Object.keys({ q1: 0, q2: 0, q3: 0, q4: 0 }).reduce((sum, qKey) => {
                    const cleared = ctx.formData[item.id]?.payableCleared?.[qKey] || 0;
                    return sum + cleared;
                  }, 0);

                  // The payable balance from useExpenseCalculations already has clearances subtracted
                  // So we use the value directly without subtracting again
                  const netPayableBalance = value || 0;

                  // Check if this is the current quarter and has opening balance
                  const showOpeningBalanceInfo = isCurrentQuarter && hasOpeningBalance;

                  return (
                    <TableCell key={`${item.id}-${q}`} className="text-center">
                      {isComputed ? (
                        isAutoCalc && ctx.isQuarterEditable(q as any) ? (
                          // Regular auto-calculated field (Payables only)
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center justify-center gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1">
                                      <Input
                                        className="h-8 w-32 text-center bg-blue-50 cursor-not-allowed"
                                        value={formatValue(netPayableBalance)}
                                        disabled
                                        readOnly
                                        aria-label={`${item.title} for ${q}: ${formatValue(netPayableBalance)}. Auto-calculated field.`}
                                        aria-describedby={`${item.id}-${q}-calc-hint`}
                                      />
                                      <Calculator className="h-4 w-4 text-blue-500" aria-hidden="true" />
                                      <span id={`${item.id}-${q}-calc-hint`} className="sr-only">
                                        {getTooltipText()}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">{getTooltipText()}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {/* Payable Clearance Control - only show for current quarter with balance */}
                              {isCurrentQuarter && netPayableBalance > 0 && (
                                <PayableClearanceControl
                                  payableCode={item.id}
                                  payableLabel={item.title}
                                  payableBalance={netPayableBalance}
                                  clearedAmount={totalCleared}
                                  onClearPayable={(amount) => {
                                    ctx.clearPayable(item.id, amount);
                                  }}
                                  disabled={false}
                                  readOnly={false}
                                />
                              )}
                            </div>
                            {showOpeningBalanceInfo && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="text-xs text-green-600 flex items-center gap-1 cursor-help">
                                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span>Opening: {openingBalance.toLocaleString()}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">
                                      Rolled over from {previousQuarterBalances?.quarter} closing balance: {openingBalance.toLocaleString()} RWF
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        ) : (
                          <span>{formatValue(netPayableBalance)}</span>
                        )
                      ) : locked ? (
                        value !== undefined && value !== 0 ? (
                          <div
                            className="flex items-center justify-center gap-1"
                            role="status"
                            aria-label={`${item.title} for ${q}: ${formatValue(value)}. This quarter is locked and cannot be edited.`}
                          >
                            <span className="text-gray-600">{formatValue(value)}</span>
                            <Lock className="h-3 w-3 text-gray-400" aria-hidden="true" />
                          </div>
                        ) : (
                          <div
                            role="status"
                            aria-label={`${item.title} for ${q}: No data. This quarter is locked.`}
                          >
                            <Lock className="h-3 w-3 mx-auto text-muted-foreground" aria-hidden="true" />
                          </div>
                        )
                      ) : (
                        <span className={cn(locked && "text-gray-400")}>{formatValue(value)}</span>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-center">
                  {formatCumulativeBalance(item.cumulativeBalance, item.id)}
                </TableCell>
                <TableCell className="text-center">
                  {!rowState.isCalculated && (
                    <input
                      className="h-8 w-52 border rounded px-2"
                      defaultValue={ctx.formData[item.id]?.comment ?? ""}
                      onBlur={(e) => ctx.onCommentChange(item.id, e.target.value)}
                      disabled={!editable}
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}


        </>
      )}
    </>
  );
}

// Component to render Section G with Prior Year Adjustments
interface SectionGRendererProps {
  section: any;
  ctx: any;
  projectType: "HIV" | "MAL" | "TB";
  facilityType: "hospital" | "health_center";
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  activities: any;
  previousQuarterBalances: any;
}

function SectionGRenderer({ section, ctx, projectType, facilityType, quarter, activities, previousQuarterBalances }: SectionGRendererProps) {
  // Get list of payables for the adjustment dialog
  const payableItems: AdjustmentItem[] = React.useMemo(() => {
    const items: AdjustmentItem[] = [];
    const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
    
    // Get payable items from the activities schema (not from formData)
    // This ensures all payables are shown, even if they have no balance
    const sectionE = (activities as any)?.E;
    if (sectionE?.items) {
      sectionE.items.forEach((item: any) => {
        if (item.code && !item.isTotalRow && !item.isComputed) {
          const balance = Number(ctx.formData[item.code]?.[quarterKey]) || 0;
          // Exclude the total row
          if (!item.name.toLowerCase().includes('financial liabilities')) {
            items.push({
              code: item.code,
              name: item.name,
              currentBalance: balance
            });
          }
        }
      });
    }
    
    // Fallback: also check formData for any payables not in schema
    Object.keys(ctx.formData).forEach(code => {
      if (code.includes('_E_') && !code.includes('_E_Financial')) {
        // Check if already added from schema
        if (!items.find(item => item.code === code)) {
          const balance = Number(ctx.formData[code]?.[quarterKey]) || 0;
          // Extract payable name from the table
          const sectionETable = ctx.table.find((s: any) => s.id === 'E');
          const payableItem = sectionETable?.children?.find((item: any) => item.id === code);
          if (payableItem && !payableItem.title.toLowerCase().includes('financial liabilities')) {
            items.push({
              code,
              name: payableItem.title,
              currentBalance: balance
            });
          }
        }
      }
    });
    
    return items;
  }, [ctx.formData, ctx.table, quarter, activities]);

  // Get list of receivables for the adjustment dialog
  const receivableItems: AdjustmentItem[] = React.useMemo(() => {
    const items: AdjustmentItem[] = [];
    const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
    
    // Get receivable items from the activities schema (not from formData)
    // This ensures all receivables are shown, even if they have no balance
    const sectionD = (activities as any)?.D;
    
    // Check direct items in Section D (excluding Cash at Bank D_1 and Petty Cash D_2)
    if (sectionD?.items) {
      sectionD.items.forEach((item: any) => {
        if (item.code && !item.isTotalRow && !item.isComputed) {
          // Exclude Cash at Bank (D_1), Petty Cash (D_2), and total rows
          if (!item.code.includes('_D_1') && !item.code.includes('_D_2') && 
              !item.name.toLowerCase().includes('financial assets')) {
            const balance = Number(ctx.formData[item.code]?.[quarterKey]) || 0;
            items.push({
              code: item.code,
              name: item.name,
              currentBalance: balance
            });
          }
        }
      });
    }
    
    // Check subcategories (like D-01 for VAT receivables)
    if (sectionD?.subCategories) {
      Object.values(sectionD.subCategories).forEach((subCat: any) => {
        if (subCat.items) {
          subCat.items.forEach((item: any) => {
            if (item.code && !item.isTotalRow && !item.isComputed) {
              // Exclude Cash at Bank (D_1), Petty Cash (D_2)
              if (!item.code.includes('_D_1') && !item.code.includes('_D_2')) {
                const balance = Number(ctx.formData[item.code]?.[quarterKey]) || 0;
                // Check if already added
                if (!items.find(i => i.code === item.code)) {
                  items.push({
                    code: item.code,
                    name: item.name,
                    currentBalance: balance
                  });
                }
              }
            }
          });
        }
      });
    }
    
    // Fallback: also check formData for any receivables not in schema
    Object.keys(ctx.formData).forEach(code => {
      if (code.includes('_D_') && !code.includes('_D_1') && !code.includes('_D_2') && !code.includes('_D_Financial')) {
        // Check if already added from schema
        if (!items.find(item => item.code === code)) {
          const balance = Number(ctx.formData[code]?.[quarterKey]) || 0;
          // Extract receivable name from the table
          const sectionDTable = ctx.table.find((s: any) => s.id === 'D');
          let receivableItem = sectionDTable?.children?.find((item: any) => item.id === code);
          
          // Also check subcategories (like D-01 for VAT receivables)
          if (!receivableItem) {
            sectionDTable?.children?.forEach((child: any) => {
              if (child.isSubcategory && child.children) {
                const found = child.children.find((item: any) => item.id === code);
                if (found) receivableItem = found;
              }
            });
          }
          
          if (receivableItem && !receivableItem.title.toLowerCase().includes('financial assets')) {
            items.push({
              code,
              name: receivableItem.title,
              currentBalance: balance
            });
          }
        }
      }
    });
    
    return items;
  }, [ctx.formData, ctx.table, quarter, activities]);

  // Separate regular items from subcategories
  const regularItems = React.useMemo(() => {
    const items = section.children?.filter((item: any) => !item.isSubcategory) || [];
    console.log('🔍 [SectionGRenderer] regularItems:', {
      sectionId: section.id,
      childrenCount: section.children?.length,
      regularItemsCount: items.length,
      regularItemIds: items.map((i: any) => i.id),
      regularItemTitles: items.map((i: any) => i.title)
    });
    return items;
  }, [section.children]);

  const subcategories = React.useMemo(() => {
    return section.children?.filter((item: any) => item.isSubcategory) || [];
  }, [section.children]);

  return (
    <>
      {/* Section G Header */}
      <TableRow className="bg-muted/50">
        <TableCell className="sticky left-0 z-10 bg-muted/50 font-bold">
          <button
            type="button"
            className="mr-2 inline-flex items-center text-xs text-muted-foreground hover:underline"
            onClick={() => ctx.onToggleSection(section.id)}
            aria-expanded={Boolean(ctx.expandState[section.id])}
          >
            {ctx.expandState[section.id] ? "▾" : "▸"}
          </button>
          {section.title}
        </TableCell>
        {QUARTERS.map((q) => {
          const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
          const local = (section as any)[key] as number | undefined;
          const fallback = (ctx.getSectionTotals(section.id) as any)[key] as number | undefined;
          const val = typeof fallback === 'number' ? fallback : local;
          return (
            <TableCell key={`${section.id}-${q}`} className="text-center">
              {ctx.isQuarterVisible(q as any) ? (
                ctx.isQuarterEditable(q as any) ? (
                  <span>{formatValue(val)}</span>
                ) : (
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-gray-600">{formatValue(val)}</span>
                    <Lock className="h-3 w-3 text-gray-400" />
                  </div>
                )
              ) : (
                <Lock className="h-3 w-3 mx-auto text-muted-foreground" />
              )}
            </TableCell>
          );
        })}
        <TableCell className="text-center">
          {(() => {
            const local = (section as any).cumulativeBalance as number | undefined;
            const fallback = ctx.getSectionTotals(section.id).cumulativeBalance as number | undefined;
            const val = typeof fallback === 'number' ? fallback : local;
            return formatCumulativeBalance(val, section.id);
          })()}
        </TableCell>
        <TableCell />
      </TableRow>

      {/* Expanded content */}
      {ctx.expandState[section.id] !== false && (
        <>
          {/* Regular items (Accumulated Surplus/Deficit, Surplus/Deficit of Period, etc.) */}
          {regularItems.map((item: any) => {
            const rowState = ctx.getRowState(item.id);
            const editable = rowState.isEditable && (item.isEditable !== false) && !item.isCalculated;

            return (
              <TableRow key={item.id}>
                <TableCell className="sticky left-0 z-10 bg-background pl-12">
                  {item.title}
                </TableCell>
                {QUARTERS.map((q) => {
                  const isComputed = item.isCalculated === true;
                  const locked = ctx.isRowLocked(item.id, q as any);
                  const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
                  const value = isComputed
                    ? ((item as any)[key] as number | undefined) ?? (ctx.formData[item.id]?.[key] as number | undefined)
                    : ((ctx.formData[item.id]?.[key] ?? (item as any)[key]) as number | undefined);

                  return (
                    <TableCell key={`${item.id}-${q}`} className="text-center">
                      {ctx.isQuarterVisible(q as any) ? (
                        ctx.isQuarterEditable(q as any) ? (
                          isComputed ? (
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-blue-600 font-medium">{formatValue(value)}</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Calculator className="h-3 w-3 text-blue-500 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Auto-calculated</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          ) : locked ? (
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-gray-600">{formatValue(value)}</span>
                              <Lock className="h-3 w-3 text-gray-400" />
                            </div>
                          ) : editable ? (
                            <Input
                              key={`${item.id}-${key}-${value ?? 0}`}
                              className="h-8 w-32 text-center"
                              defaultValue={value ?? 0}
                              type="number"
                              step="0.01"
                              inputMode="decimal"
                              onBlur={(e: React.FocusEvent<HTMLInputElement>) => ctx.onFieldChange(item.id, Number(e.target.value || 0))}
                            />
                          ) : (
                            <span>{formatValue(value)}</span>
                          )
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-gray-600">{formatValue(value)}</span>
                            <Lock className="h-3 w-3 text-gray-400" />
                          </div>
                        )
                      ) : (
                        <Lock className="h-3 w-3 mx-auto text-muted-foreground" />
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-center">
                  {formatCumulativeBalance(item.cumulativeBalance, item.id)}
                </TableCell>
                <TableCell className="text-center">
                  {!rowState.isCalculated && (
                    <input
                      className="h-8 w-52 border rounded px-2"
                      defaultValue={ctx.formData[item.id]?.comment ?? ""}
                      onBlur={(e) => ctx.onCommentChange(item.id, e.target.value)}
                      disabled={!editable}
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}

          {/* Subcategories (G-01 Prior Year Adjustments) */}
          {subcategories.map((subcategory: any) => {
            const isPriorYearAdj = isPriorYearAdjustmentSubcategory(subcategory.id);
            
            return (
              <React.Fragment key={subcategory.id}>
                {/* Subcategory header row */}
                <TableRow className="bg-muted/30">
                  <TableCell className="sticky left-0 z-10 bg-muted/30 font-medium pl-8">
                    <button
                      type="button"
                      className="mr-2 inline-flex items-center text-xs text-muted-foreground hover:underline"
                      onClick={() => ctx.onToggleSection(subcategory.id)}
                      aria-expanded={Boolean(ctx.expandState[subcategory.id])}
                    >
                      {ctx.expandState[subcategory.id] ? "▾" : "▸"}
                    </button>
                    {subcategory.title}
                  </TableCell>
                  {QUARTERS.map((q) => {
                    const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
                    const val = (subcategory as any)[key] as number | undefined;
                    return (
                      <TableCell key={`${subcategory.id}-${q}`} className="text-center">
                        {ctx.isQuarterVisible(q as any) ? (
                          ctx.isQuarterEditable(q as any) ? (
                            <span>{formatValue(val)}</span>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-gray-600">{formatValue(val)}</span>
                              <Lock className="h-3 w-3 text-gray-400" />
                            </div>
                          )
                        ) : (
                          <Lock className="h-3 w-3 mx-auto text-muted-foreground" />
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center">{formatCumulativeBalance(subcategory.cumulativeBalance, subcategory.id)}</TableCell>
                  <TableCell />
                </TableRow>

                {/* Subcategory child items (Prior Year Adjustment items) */}
                {ctx.expandState[subcategory.id] !== false && subcategory.children?.map((item: any) => {
                  const rowState = ctx.getRowState(item.id);
                  const priorYearType = isPriorYearAdjustmentItem(item.id, item.title);
                  const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
                  const currentValue = Number(ctx.formData[item.id]?.[quarterKey]) || 0;

                  return (
                    <TableRow key={item.id} className={isPriorYearAdj ? "bg-amber-50/30" : ""}>
                      <TableCell className="sticky left-0 z-10 bg-background pl-12">
                        <div className="flex items-center gap-2">
                          <span>{item.title}</span>
                          {/* Show adjustment dialog button for payable/receivable prior year adjustments */}
                          {priorYearType === 'payable' && ctx.isQuarterEditable(quarter) && (
                            <PriorYearAdjustmentDialog
                              type="payable"
                              items={payableItems}
                              currentValue={currentValue}
                              onApplyAdjustment={(targetCode, adjustmentType, amount) => {
                                ctx.applyPriorYearAdjustment(item.id, targetCode, adjustmentType, amount);
                              }}
                            />
                          )}
                          {priorYearType === 'receivable' && ctx.isQuarterEditable(quarter) && (
                            <PriorYearAdjustmentDialog
                              type="receivable"
                              items={receivableItems}
                              currentValue={currentValue}
                              onApplyAdjustment={(targetCode, adjustmentType, amount) => {
                                ctx.applyPriorYearAdjustment(item.id, targetCode, adjustmentType, amount);
                              }}
                            />
                          )}
                        </div>
                      </TableCell>
                      {QUARTERS.map((q) => {
                        const locked = ctx.isRowLocked(item.id, q as any);
                        const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
                        const value = (ctx.formData[item.id]?.[key] ?? (item as any)[key]) as number | undefined;
                        const isCurrentQuarter = q === quarter;

                        // For cash adjustments, show regular input with double-entry info
                        // For payable/receivable adjustments, show read-only input
                        const isReadOnly = priorYearType === 'payable' || priorYearType === 'receivable';

                        return (
                          <TableCell key={`${item.id}-${q}`} className="text-center">
                            {ctx.isQuarterVisible(q as any) ? (
                              ctx.isQuarterEditable(q as any) ? (
                                locked ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="text-gray-600">{formatValue(value)}</span>
                                    <Lock className="h-3 w-3 text-gray-400" />
                                  </div>
                                ) : isReadOnly ? (
                                  // Read-only input for payable/receivable adjustments
                                  <div className="flex items-center justify-center gap-1">
                                    <Input
                                      className="h-8 w-32 text-center bg-gray-50 cursor-not-allowed"
                                      value={formatValue(value)}
                                      disabled
                                      readOnly
                                      aria-label={`${item.title} for ${q}: ${formatValue(value)}. Use the Adjust button to modify.`}
                                    />
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Info className="h-4 w-4 text-amber-500 cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs">Use the "Adjust" button to modify this value</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                ) : priorYearType === 'cash' ? (
                                  // Cash adjustment with double-entry info
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center justify-center gap-2">
                                      <Input
                                        key={`${item.id}-${key}-${value ?? 0}`}
                                        className="h-8 w-32 text-center"
                                        defaultValue={value ?? 0}
                                        type="number"
                                        step="0.01"
                                        inputMode="decimal"
                                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                                          const newValue = Number(e.target.value || 0);
                                          const oldValue = Number(value || 0);
                                          const diff = newValue - oldValue;
                                          if (diff !== 0) {
                                            // Apply double-entry: update both G (this field) and Cash at Bank
                                            ctx.applyPriorYearCashAdjustment(
                                              item.id, 
                                              diff > 0 ? 'increase' : 'decrease', 
                                              Math.abs(diff)
                                            );
                                          }
                                        }}
                                      />
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Info className="h-4 w-4 text-blue-500 cursor-help" />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="text-xs font-semibold mb-1">Double-Entry Accounting</p>
                                            <p className="text-xs">Changes here will also update Cash at Bank (Section D)</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                    {isCurrentQuarter && value !== undefined && value !== 0 && (
                                      <div className="text-xs text-blue-600 flex items-center gap-1">
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                        </svg>
                                        <span>Cash at Bank {value > 0 ? '+' : ''}{value.toLocaleString()}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  // Regular input for other items
                                  <Input
                                    key={`${item.id}-${key}-${value ?? 0}`}
                                    className="h-8 w-32 text-center"
                                    defaultValue={value ?? 0}
                                    type="number"
                                    step="0.01"
                                    inputMode="decimal"
                                    onBlur={(e: React.FocusEvent<HTMLInputElement>) => ctx.onFieldChange(item.id, Number(e.target.value || 0))}
                                  />
                                )
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-gray-600">{formatValue(value)}</span>
                                  <Lock className="h-3 w-3 text-gray-400" />
                                </div>
                              )
                            ) : (
                              <Lock className="h-3 w-3 mx-auto text-muted-foreground" />
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        {formatCumulativeBalance(item.cumulativeBalance, item.id)}
                      </TableCell>
                      <TableCell className="text-center">
                        <input
                          className="h-8 w-52 border rounded px-2"
                          defaultValue={ctx.formData[item.id]?.comment ?? ""}
                          onBlur={(e) => ctx.onCommentChange(item.id, e.target.value)}
                          disabled={!ctx.isQuarterEditable(quarter)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </React.Fragment>
            );
          })}
        </>
      )}
    </>
  );
}

import { useExecutionActivities } from "@/hooks/queries/executions/use-execution-activities";

export function ExecutionTable() {
  const ctx = useExecutionFormContext();
  
  // Get previous quarter balances from context for rollover calculations
  const previousQuarterBalances = ctx.previousQuarterBalances || null;

  // Extract project, facility type, and quarter from context
  // We need to infer these from the activity codes in the table
  const { projectType, facilityType, quarter } = React.useMemo(() => {
    // Get the first activity code from the table to extract metadata
    const firstSection = ctx.table[0];
    const firstItem = firstSection?.children?.[0];
    const sampleCode = firstItem?.id || firstSection?.id || '';

    // Parse code format: PROJECT_EXEC_FACILITY_SECTION_...
    const parts = sampleCode.split('_');
    const projectType = (parts[0] || 'HIV') as "HIV" | "MAL" | "TB";
    const facilityTypePart = parts[2]?.toLowerCase();
    const facilityType: "hospital" | "health_center" =
      facilityTypePart === 'health_center' || facilityTypePart === 'health'
        ? 'health_center'
        : 'hospital';

    // Get current quarter from form data by checking which quarter has editable status
    // The form context knows which quarter is currently being edited
    let detectedQuarter: "Q1" | "Q2" | "Q3" | "Q4" = "Q1";
    
    // Check which quarter is editable - that's the current quarter
    const quarters: Array<"Q1" | "Q2" | "Q3" | "Q4"> = ["Q1", "Q2", "Q3", "Q4"];
    for (const q of quarters) {
      if (ctx.isQuarterEditable(q)) {
        detectedQuarter = q;
        break;
      }
    }

    return { projectType, facilityType, quarter: detectedQuarter };
  }, [ctx.table, ctx.isQuarterEditable, ctx.isQuarterVisible]);

  // Load activities for VAT clearance mapping
  const { data: activities } = useExecutionActivities({ projectType, facilityType });



  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-background">Activity Details</TableHead>
            {QUARTERS.map((q) => (
              <TableHead key={q} className="text-center">
                <div className={cn(
                  ctx.isQuarterVisible(q as any) && !ctx.isQuarterEditable(q as any) && "text-gray-400 flex items-center justify-center gap-1",
                  ctx.isQuarterVisible(q as any) && ctx.isQuarterEditable(q as any) && "flex items-center justify-center gap-1"
                )}>
                  {q}
                  {ctx.isQuarterVisible(q as any) && !ctx.isQuarterEditable(q as any) && <Lock className="h-3 w-3" />}
                </div>
              </TableHead>
            ))}
            <TableHead className="text-center">Cumulative Balance</TableHead>
            <TableHead className="text-center">Comment</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ctx.table.map(section => {
            // Special rendering for Section D (Financial Assets with VAT Receivables)
            if (isSectionD(section.id)) {
              return (
                <SectionDRenderer
                  key={section.id}
                  section={section}
                  ctx={ctx}
                  projectType={projectType}
                  facilityType={facilityType}
                  quarter={quarter}
                  activities={activities}
                  previousQuarterBalances={previousQuarterBalances}
                />
              );
            }

            // Special rendering for Section E
            if (isSectionE(section.id)) {
              return (
                <SectionERenderer
                  key={section.id}
                  section={section}
                  ctx={ctx}
                  projectType={projectType}
                  facilityType={facilityType}
                  quarter={quarter}
                  activities={activities}
                  previousQuarterBalances={previousQuarterBalances}
                />
              );
            }

            // Special rendering for Section G (Closing Balance with Prior Year Adjustments)
            if (isSectionG(section.id)) {
              return (
                <SectionGRenderer
                  key={section.id}
                  section={section}
                  ctx={ctx}
                  projectType={projectType}
                  facilityType={facilityType}
                  quarter={quarter}
                  activities={activities}
                  previousQuarterBalances={previousQuarterBalances}
                />
              );
            }

            // Regular rendering for other sections
            return (
              <React.Fragment key={section.id}>
                <TableRow className="bg-muted/50">
                  <TableCell className="sticky left-0 z-10 bg-muted/50 font-bold">
                    <button
                      type="button"
                      className="mr-2 inline-flex items-center text-xs text-muted-foreground hover:underline"
                      onClick={() => ctx.onToggleSection(section.id)}
                      aria-expanded={Boolean(ctx.expandState[section.id])}
                    >
                      {ctx.expandState[section.id] ? "▾" : "▸"}
                    </button>
                    {section.title}
                  </TableCell>
                  {QUARTERS.map((q) => {
                    const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
                    const local = (section as any)[key] as number | undefined;
                    const fallback = (ctx.getSectionTotals(section.id) as any)[key] as number | undefined;
                    const val = section.id === 'D' ? (typeof fallback === 'number' ? fallback : local) : (typeof local === 'number' ? local : fallback);
                    return (
                      <TableCell key={`${section.id}-${q}`} className="text-center">
                        {ctx.isQuarterVisible(q as any) ? (
                          ctx.isQuarterEditable(q as any) ? (
                            <span>{formatValue(val)}</span>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-gray-600">{formatValue(val)}</span>
                              <Lock className="h-3 w-3 text-gray-400" />
                            </div>
                          )
                        ) : (
                          <Lock className="h-3 w-3 mx-auto text-muted-foreground" />
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center">
                    {(() => {
                      const local = (section as any).cumulativeBalance as number | undefined;
                      const fallback = ctx.getSectionTotals(section.id).cumulativeBalance as number | undefined;
                      const val = section.id === 'D' ? (typeof fallback === 'number' ? fallback : local) : (typeof local === 'number' ? local : fallback);
                      return formatCumulativeBalance(val, section.id);
                    })()}
                  </TableCell>
                  <TableCell />
                </TableRow>
                {ctx.expandState[section.id] !== false && section.children?.map((item: any) => {
                  // Subcategory header row with expand/collapse
                  if (item.isSubcategory) {
                    return (
                      <React.Fragment key={item.id}>
                        <TableRow className="bg-muted/30">
                          <TableCell className="sticky left-0 z-10 bg-muted/30 font-medium">
                            <button
                              type="button"
                              className="mr-2 inline-flex items-center text-xs text-muted-foreground hover:underline"
                              onClick={() => ctx.onToggleSection(item.id)}
                              aria-expanded={Boolean(ctx.expandState[item.id])}
                            >
                              {ctx.expandState[item.id] ? "▾" : "▸"}
                            </button>
                            {item.title}
                          </TableCell>
                          {QUARTERS.map((q) => {
                            const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
                            const val = (item as any)[key] as number | undefined;
                            return (
                              <TableCell key={`${item.id}-${q}`} className="text-center">
                                {ctx.isQuarterVisible(q as any) ? (
                                  ctx.isQuarterEditable(q as any) ? (
                                    <span>{formatValue(val)}</span>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="text-gray-600">{formatValue(val)}</span>
                                      <Lock className="h-3 w-3 text-gray-400" />
                                    </div>
                                  )
                                ) : (
                                  <Lock className="h-3 w-3 mx-auto text-muted-foreground" />
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center">{formatCumulativeBalance(item.cumulativeBalance, item.id)}</TableCell>
                          <TableCell className="text-center" />
                        </TableRow>

                        {ctx.expandState[item.id] !== false && item.children?.map((leaf: any) => {
                          const rowState = ctx.getRowState(leaf.id);
                          const editable = rowState.isEditable && (leaf.isEditable !== false) && !leaf.isCalculated;
                          const isSectionB = isSectionBExpense(leaf.id);
                          const isAutoCalc = isAutoCalculatedField(leaf.id);
                          const isVAT = isVATApplicable(leaf.id, leaf.title);
                          const isOtherReceivables = isOtherReceivablesField(leaf.id);

                          return (
                            <TableRow key={leaf.id}>
                              <TableCell className="sticky left-0 z-10 bg-background">{leaf.title}</TableCell>
                              {QUARTERS.map((q) => {
                                const isComputed = leaf.isCalculated === true || isAutoCalc || isOtherReceivables;
                                const locked = ctx.isRowLocked(leaf.id, q as any);
                                const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
                                const value = (leaf.isCalculated === true || isAutoCalc || isOtherReceivables)
                                  ? ((leaf as any)[key] as number | undefined) ?? (ctx.formData[leaf.id]?.[key] as number | undefined)
                                  : ((ctx.formData[leaf.id]?.[key] ?? (leaf as any)[key]) as number | undefined);

                                // Determine tooltip text for auto-calculated fields
                                const getTooltipText = () => {
                                  if (isOtherReceivables) {
                                    return "Auto-calculated from Miscellaneous Adjustments (Section X)";
                                  } else if (leaf.id.includes('_D_1')) {
                                    return "Auto-calculated: Opening Balance - Total Paid Expenses";
                                  } else if (leaf.id.includes('_E_')) {
                                    // Get payable name from leaf title for more specific tooltip
                                    const payableName = leaf.title.toLowerCase();
                                    if (payableName.includes('salaries')) {
                                      return "Auto-calculated: Unpaid Human Resources expenses";
                                    } else if (payableName.includes('supervision')) {
                                      return "Auto-calculated: Unpaid M&E supervision expenses";
                                    } else if (payableName.includes('meetings')) {
                                      return "Auto-calculated: Unpaid M&E meeting expenses";
                                    } else if (payableName.includes('sample transport')) {
                                      return "Auto-calculated: Unpaid sample transport expenses";
                                    } else if (payableName.includes('home visits')) {
                                      return "Auto-calculated: Unpaid home visit expenses";
                                    } else if (payableName.includes('travel') || payableName.includes('survellance') || payableName.includes('surveillance')) {
                                      return "Auto-calculated: Unpaid travel surveillance expenses";
                                    } else if (payableName.includes('maintenance')) {
                                      return "Auto-calculated: Unpaid maintenance expenses";
                                    } else if (payableName.includes('fuel')) {
                                      return "Auto-calculated: Unpaid fuel expenses";
                                    } else if (payableName.includes('supplies')) {
                                      return "Auto-calculated: Unpaid office supplies expenses";
                                    } else if (payableName.includes('transport reporting')) {
                                      return "Auto-calculated: Unpaid transport reporting expenses";
                                    } else if (payableName.includes('bank charges')) {
                                      return "Auto-calculated: Unpaid bank charges";
                                    } else if (payableName.includes('vat')) {
                                      return "Auto-calculated: VAT refund payable";
                                    } else {
                                      return "Auto-calculated: Sum of unpaid expenses in this category";
                                    }
                                  }
                                  return "";
                                };

                                return (
                                  <TableCell key={`${leaf.id}-${q}`} className="text-center">
                                    {isComputed ? (
                                      (isAutoCalc || isOtherReceivables) && ctx.isQuarterEditable(q as any) ? (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className="flex items-center justify-center gap-1">
                                                <Input
                                                  className="h-8 w-32 text-center bg-blue-50 cursor-not-allowed"
                                                  value={formatValue(value)}
                                                  disabled
                                                  readOnly
                                                  aria-label={`${leaf.title} for ${q}: ${formatValue(value)}. Auto-calculated field.`}
                                                  aria-describedby={`${leaf.id}-${q}-calc-hint`}
                                                />
                                                {isOtherReceivables ? (
                                                  <Info className="h-4 w-4 text-blue-500" aria-hidden="true" />
                                                ) : (
                                                  <Calculator className="h-4 w-4 text-blue-500" aria-hidden="true" />
                                                )}
                                                <span id={`${leaf.id}-${q}-calc-hint`} className="sr-only">
                                                  {getTooltipText()}
                                                </span>
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p className="text-xs">{getTooltipText()}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      ) : (
                                        <span>{formatValue(value)}</span>
                                      )
                                    ) : locked ? (
                                      // Show existing data with lock icon for previous quarters
                                      value !== undefined && value !== 0 ? (
                                        <div
                                          className="flex items-center justify-center gap-1"
                                          role="status"
                                          aria-label={`${leaf.title} for ${q}: ${formatValue(value)}. This quarter is locked and cannot be edited.`}
                                        >
                                          <span className="text-gray-600">{formatValue(value)}</span>
                                          <Lock className="h-3 w-3 text-gray-400" aria-hidden="true" />
                                        </div>
                                      ) : (
                                        <div
                                          role="status"
                                          aria-label={`${leaf.title} for ${q}: No data. This quarter is locked.`}
                                        >
                                          <Lock className="h-3 w-3 mx-auto text-muted-foreground" aria-hidden="true" />
                                        </div>
                                      )
                                    ) : editable ? (
                                      isVAT && isSectionB ? (
                                        // Render VAT expense input spanning the cell
                                        renderExpenseInputCell(ctx, leaf, q, editable, value)
                                      ) : (
                                        // Render regular expense input
                                        renderExpenseInputCell(ctx, leaf, q, editable, value)
                                      )
                                    ) : (
                                      <span className={cn(locked && "text-gray-400")}>{formatValue(value)}</span>
                                    )}
                                  </TableCell>
                                );
                              })}
                              <TableCell className="text-center">{formatCumulativeBalance(leaf.cumulativeBalance, leaf.id)}</TableCell>
                              <TableCell className="text-center">
                                {!rowState.isCalculated && (
                                  <input
                                    className="h-8 w-52 border rounded px-2"
                                    defaultValue={ctx.formData[leaf.id]?.comment ?? ""}
                                    onBlur={(e) => ctx.onCommentChange(leaf.id, e.target.value)}
                                    disabled={!editable}
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
                    );
                  }

                  // Leaf row directly under section
                  const rowState = ctx.getRowState(item.id);
                  const editable = rowState.isEditable && (item.isEditable !== false) && !item.isCalculated;
                  const isSectionB = isSectionBExpense(item.id);
                  const isAutoCalc = isAutoCalculatedField(item.id);
                  const isVAT = isVATApplicable(item.id, item.title);
                  const isOtherReceivables = isOtherReceivablesField(item.id);

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="sticky left-0 z-10 bg-background">{item.title}</TableCell>
                      {QUARTERS.map((q) => {
                        const isComputed = item.isCalculated === true || isAutoCalc || isOtherReceivables;
                        const locked = ctx.isRowLocked(item.id, q as any);
                        const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
                        const value = (item.isCalculated === true || isAutoCalc || isOtherReceivables)
                          ? ((item as any)[key] as number | undefined) ?? (ctx.formData[item.id]?.[key] as number | undefined)
                          : ((ctx.formData[item.id]?.[key] ?? (item as any)[key]) as number | undefined);

                        // Determine tooltip text for auto-calculated fields
                        const getTooltipText = () => {
                          if (isOtherReceivables) {
                            return "Auto-calculated from Miscellaneous Adjustments (Section X)";
                          } else if (item.id.includes('_D_1')) {
                            return "Auto-calculated: Opening Balance - Total Paid Expenses";
                          } else if (item.id.includes('_E_')) {
                            // Get payable name from item title for more specific tooltip
                            const payableName = item.title.toLowerCase();
                            if (payableName.includes('salaries')) {
                              return "Auto-calculated: Unpaid Human Resources expenses";
                            } else if (payableName.includes('supervision')) {
                              return "Auto-calculated: Unpaid M&E supervision expenses";
                            } else if (payableName.includes('meetings')) {
                              return "Auto-calculated: Unpaid M&E meeting expenses";
                            } else if (payableName.includes('sample transport')) {
                              return "Auto-calculated: Unpaid sample transport expenses";
                            } else if (payableName.includes('home visits')) {
                              return "Auto-calculated: Unpaid home visit expenses";
                            } else if (payableName.includes('travel') || payableName.includes('survellance') || payableName.includes('surveillance')) {
                              return "Auto-calculated: Unpaid travel surveillance expenses";
                            } else if (payableName.includes('maintenance')) {
                              return "Auto-calculated: Unpaid maintenance expenses";
                            } else if (payableName.includes('fuel')) {
                              return "Auto-calculated: Unpaid fuel expenses";
                            } else if (payableName.includes('supplies')) {
                              return "Auto-calculated: Unpaid office supplies expenses";
                            } else if (payableName.includes('transport reporting')) {
                              return "Auto-calculated: Unpaid transport reporting expenses";
                            } else if (payableName.includes('bank charges')) {
                              return "Auto-calculated: Unpaid bank charges";
                            } else if (payableName.includes('vat')) {
                              return "Auto-calculated: VAT refund payable";
                            } else {
                              return "Auto-calculated: Sum of unpaid expenses in this category";
                            }
                          }
                          return "";
                        };

                        return (
                          <TableCell key={`${item.id}-${q}`} className="text-center">
                            {isComputed ? (
                              (isAutoCalc || isOtherReceivables) && ctx.isQuarterEditable(q as any) ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center justify-center gap-1">
                                        <Input
                                          className="h-8 w-32 text-center bg-blue-50 cursor-not-allowed"
                                          value={formatValue(value)}
                                          disabled
                                          readOnly
                                          aria-label={`${item.title} for ${q}: ${formatValue(value)}. Auto-calculated field.`}
                                          aria-describedby={`${item.id}-${q}-calc-hint`}
                                        />
                                        {isOtherReceivables ? (
                                          <Info className="h-4 w-4 text-blue-500" aria-hidden="true" />
                                        ) : (
                                          <Calculator className="h-4 w-4 text-blue-500" aria-hidden="true" />
                                        )}
                                        <span id={`${item.id}-${q}-calc-hint`} className="sr-only">
                                          {getTooltipText()}
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">{getTooltipText()}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <span>{formatValue(value)}</span>
                              )
                            ) : locked ? (
                              // Show existing data with lock icon for previous quarters
                              value !== undefined && value !== 0 ? (
                                <div
                                  className="flex items-center justify-center gap-1"
                                  role="status"
                                  aria-label={`${item.title} for ${q}: ${formatValue(value)}. This quarter is locked and cannot be edited.`}
                                >
                                  <span className="text-gray-600">{formatValue(value)}</span>
                                  <Lock className="h-3 w-3 text-gray-400" aria-hidden="true" />
                                </div>
                              ) : (
                                <div
                                  role="status"
                                  aria-label={`${item.title} for ${q}: No data. This quarter is locked.`}
                                >
                                  <Lock className="h-3 w-3 mx-auto text-muted-foreground" aria-hidden="true" />
                                </div>
                              )
                            ) : editable ? (
                              isVAT && isSectionB ? (
                                // Render VAT expense input spanning the cell
                                renderExpenseInputCell(ctx, item, q, editable, value)
                              ) : (
                                // Render regular expense input
                                renderExpenseInputCell(ctx, item, q, editable, value)
                              )
                            ) : (
                              <span className={cn(locked && "text-gray-400")}>{formatValue(value)}</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">{formatCumulativeBalance(item.cumulativeBalance, item.id)}</TableCell>
                      <TableCell className="text-center">
                        {!rowState.isCalculated && (
                          <input
                            className="h-8 w-52 border rounded px-2"
                            defaultValue={ctx.formData[item.id]?.comment ?? ""}
                            onBlur={(e) => ctx.onCommentChange(item.id, e.target.value)}
                            disabled={!editable}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default ExecutionTable;


