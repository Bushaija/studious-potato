"use client"

import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { PreviousQuarterBalances, ClosingBalances } from '@/features/execution/types/quarterly-rollover';
import { getOpeningBalanceWithMapping } from '@/features/execution/utils/activity-code-mapper';

/**
 * Reconciliation Warning Banner Component
 * 
 * Displays a warning when opening balances differ from previous quarter closing balances.
 * Shows reconciliation details and provides actions to accept changes or review manually.
 * 
 * Uses code mapping to correctly match UI schema codes with formData codes.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 10.4, 11.6
 */

interface ReconciliationWarningBannerProps {
  /** Previous quarter balances from API */
  previousQuarterBalances: PreviousQuarterBalances | null | undefined;
  /** Current opening balances from form data */
  currentOpeningBalances: ClosingBalances;
  /** Activity metadata for displaying friendly names */
  activities: Record<string, any>;
  /** Callback when user accepts the recalculation */
  onAcceptChanges?: () => void;
  /** Callback when user wants to review manually */
  onReviewManually?: () => void;
  /** Whether the form is in read-only mode */
  isReadOnly?: boolean;
  /** Project type for code mapping */
  projectType?: "HIV" | "MAL" | "TB";
  /** Facility type for code mapping */
  facilityType?: "hospital" | "health_center";
}

interface BalanceMismatch {
  activityCode: string;
  activityName: string;
  section: 'D' | 'E';
  expected: number;
  actual: number;
  difference: number;
}

export function ReconciliationWarningBanner({
  previousQuarterBalances,
  currentOpeningBalances,
  activities,
  onAcceptChanges,
  onReviewManually,
  isReadOnly = false,
  projectType = "HIV",
  facilityType = "hospital",
}: ReconciliationWarningBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate mismatches between expected (previous quarter closing) and actual (current opening)
  // Uses code mapping to correctly match UI schema codes with formData codes
  const mismatches = useMemo<BalanceMismatch[]>(() => {
    if (!previousQuarterBalances?.exists || !previousQuarterBalances.closingBalances) {
      return [];
    }

    const result: BalanceMismatch[] = [];
    const tolerance = 0.01; // Allow ±0.01 difference due to floating-point arithmetic

    // Check Section D mismatches
    // We need to check all activity codes from currentOpeningBalances (UI schema codes)
    // and use code mapping to get the expected values from previous quarter
    const currentD = currentOpeningBalances.D || {};

    Object.keys(currentD).forEach(uiCode => {
      // Get expected opening balance using code mapping
      const expected = getOpeningBalanceWithMapping(
        uiCode,
        previousQuarterBalances,
        projectType,
        facilityType
      );
      
      const actual = currentD[uiCode] || 0;
      const difference = Math.abs(expected - actual);

      if (difference > tolerance) {
        const activity = findActivityByCode(uiCode, activities);
        result.push({
          activityCode: uiCode,
          activityName: activity?.name || activity?.title || uiCode,
          section: 'D',
          expected,
          actual,
          difference,
        });
      }
    });

    // Also check for items in previous quarter that don't exist in current
    const previousD = previousQuarterBalances.closingBalances.D || {};
    Object.keys(previousD).forEach(formDataCode => {
      const expected = previousD[formDataCode] || 0;
      
      // Skip if no expected balance
      if (expected === 0) return;
      
      // Check if this code exists in current opening balances
      // We need to check both the formData code and potential UI code
      const hasInCurrent = currentD[formDataCode] !== undefined;
      
      if (!hasInCurrent) {
        const activity = findActivityByCode(formDataCode, activities);
        result.push({
          activityCode: formDataCode,
          activityName: activity?.name || activity?.title || formDataCode,
          section: 'D',
          expected,
          actual: 0,
          difference: expected,
        });
      }
    });

    // Check Section E mismatches
    const currentE = currentOpeningBalances.E || {};

    Object.keys(currentE).forEach(uiCode => {
      // Get expected opening balance using code mapping
      const expected = getOpeningBalanceWithMapping(
        uiCode,
        previousQuarterBalances,
        projectType,
        facilityType
      );
      
      const actual = currentE[uiCode] || 0;
      const difference = Math.abs(expected - actual);

      if (difference > tolerance) {
        const activity = findActivityByCode(uiCode, activities);
        result.push({
          activityCode: uiCode,
          activityName: activity?.name || activity?.title || uiCode,
          section: 'E',
          expected,
          actual,
          difference,
        });
      }
    });

    // Also check for items in previous quarter that don't exist in current
    const previousE = previousQuarterBalances.closingBalances.E || {};
    Object.keys(previousE).forEach(formDataCode => {
      const expected = previousE[formDataCode] || 0;
      
      // Skip if no expected balance
      if (expected === 0) return;
      
      // Check if this code exists in current opening balances
      const hasInCurrent = currentE[formDataCode] !== undefined;
      
      if (!hasInCurrent) {
        const activity = findActivityByCode(formDataCode, activities);
        result.push({
          activityCode: formDataCode,
          activityName: activity?.name || activity?.title || formDataCode,
          section: 'E',
          expected,
          actual: 0,
          difference: expected,
        });
      }
    });

    return result;
  }, [previousQuarterBalances, currentOpeningBalances, activities, projectType, facilityType]);

  // Don't show banner if no mismatches
  if (mismatches.length === 0) {
    return null;
  }

  const totalDifference = mismatches.reduce((sum, m) => sum + m.difference, 0);

  return (
    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-yellow-900 mb-1">
                Opening Balance Mismatch Detected
              </h3>
              <p className="text-sm text-yellow-800 mb-2">
                The opening balances for this quarter do not match the closing balances from{' '}
                <span className="font-medium">{previousQuarterBalances?.quarter}</span>.
                This may occur if {previousQuarterBalances?.quarter} was updated after this quarter was created.
              </p>
              <p className="text-xs text-yellow-700">
                {mismatches.length} {mismatches.length === 1 ? 'item' : 'items'} affected • 
                Total difference: {totalDifference.toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-4 p-1 hover:bg-yellow-100 rounded transition-colors"
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-yellow-700" />
              ) : (
                <ChevronDown className="h-4 w-4 text-yellow-700" />
              )}
            </button>
          </div>

          {isExpanded && (
            <div className="mt-3 border-t border-yellow-200 pt-3">
              <h4 className="text-xs font-semibold text-yellow-900 mb-2 uppercase tracking-wide">
                Reconciliation Details
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-yellow-200">
                      <th className="text-left py-2 px-2 font-semibold text-yellow-900">Section</th>
                      <th className="text-left py-2 px-2 font-semibold text-yellow-900">Activity</th>
                      <th className="text-right py-2 px-2 font-semibold text-yellow-900">
                        Expected<br />
                        <span className="font-normal text-yellow-700">
                          ({previousQuarterBalances?.quarter} Closing)
                        </span>
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-yellow-900">
                        Actual<br />
                        <span className="font-normal text-yellow-700">(Current Opening)</span>
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-yellow-900">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mismatches.map((mismatch, index) => (
                      <tr
                        key={mismatch.activityCode}
                        className={index % 2 === 0 ? 'bg-yellow-50' : 'bg-white'}
                      >
                        <td className="py-2 px-2 text-yellow-800 font-medium">
                          {mismatch.section}
                        </td>
                        <td className="py-2 px-2 text-yellow-800">
                          {mismatch.activityName}
                        </td>
                        <td className="py-2 px-2 text-right text-yellow-800 font-mono">
                          {mismatch.expected.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-yellow-800 font-mono">
                          {mismatch.actual.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-yellow-800 font-mono font-semibold">
                          {mismatch.difference.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!isReadOnly && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={onAcceptChanges}
                className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded transition-colors"
              >
                Accept Changes
              </button>
              <button
                onClick={onReviewManually}
                className="px-3 py-1.5 bg-white hover:bg-yellow-50 text-yellow-800 text-sm font-medium border border-yellow-300 rounded transition-colors"
              >
                Review Manually
              </button>
            </div>
          )}

          {isReadOnly && (
            <p className="mt-3 text-xs text-yellow-700 italic">
              This form is in read-only mode. Contact an administrator to apply the recalculation.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Helper function to find activity by code in the activities schema
 */
function findActivityByCode(code: string, activities: Record<string, any>): any {
  if (!activities) return null;

  // Search through all sections
  for (const section of Object.values(activities)) {
    if (!section) continue;

    // Check direct items
    if (section.items) {
      const item = section.items.find((i: any) => i.code === code || i.id === code);
      if (item) return item;
    }

    // Check subcategories
    if (section.subCategories) {
      for (const subCat of Object.values(section.subCategories) as any[]) {
        if (subCat?.items) {
          const item = subCat.items.find((i: any) => i.code === code || i.id === code);
          if (item) return item;
        }
      }
    }

    // Check children (for hierarchical structures)
    if (section.children) {
      const item = section.children.find((i: any) => i.code === code || i.id === code);
      if (item) return item;
    }
  }

  return null;
}
