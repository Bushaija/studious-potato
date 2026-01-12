"use client";

import React from "react";
import { AlertTriangle, CheckCircle, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PreviousQuarterBalances } from "@/features/execution/types/quarterly-rollover";
import { getOpeningBalanceWithMapping } from "@/features/execution/utils/activity-code-mapper";

interface OpeningBalanceMismatch {
  activityCode: string;
  activityName: string;
  section: "D" | "E";
  expected: number;
  actual: number;
  difference: number;
}

interface OpeningBalanceValidationBannerProps {
  /** Previous quarter balances from API */
  previousQuarterBalances: PreviousQuarterBalances | null;
  /** Current form data with opening balances */
  formData: Record<string, any>;
  /** Activity definitions from UI schema */
  activities: any;
  /** Project type (HIV, MAL, TB) */
  projectType: "HIV" | "MAL" | "TB";
  /** Facility type (hospital, health_center) */
  facilityType: "hospital" | "health_center";
  /** Current quarter */
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  /** Callback when user accepts the recalculation */
  onAcceptChanges?: () => void;
  /** Callback when user dismisses the warning */
  onDismiss?: () => void;
}

/**
 * Opening Balance Validation Banner
 * 
 * Validates that opening balances for the current quarter match the previous quarter's
 * closing balances. Displays a warning banner when mismatches are detected.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export function OpeningBalanceValidationBanner({
  previousQuarterBalances,
  formData,
  activities,
  projectType,
  facilityType,
  quarter,
  onAcceptChanges,
  onDismiss,
}: OpeningBalanceValidationBannerProps) {
  const [isDismissed, setIsDismissed] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);

  // Don't show validation for Q1 (no previous quarter)
  if (quarter === "Q1" || !previousQuarterBalances?.exists) {
    return null;
  }

  // Validate opening balances against previous quarter closing balances
  const mismatches = React.useMemo(() => {
    const result: OpeningBalanceMismatch[] = [];

    // Get all activity codes from formData that belong to Section D or E
    const activityCodes = Object.keys(formData).filter(code => 
      code.includes('_D_') || code.includes('_E_')
    );

    activityCodes.forEach(activityCode => {
      // Get expected opening balance from previous quarter (with code mapping)
      const expected = getOpeningBalanceWithMapping(
        activityCode,
        previousQuarterBalances,
        projectType,
        facilityType
      );

      // Skip if no expected balance (nothing to validate)
      if (expected === 0) {
        return;
      }

      // Get actual opening balance from current quarter formData
      // For Q2+, the opening balance should be stored or calculated
      const quarterKey = quarter.toLowerCase() as "q1" | "q2" | "q3" | "q4";
      const actual = Number(formData[activityCode]?.[quarterKey]) || 0;

      // Check for mismatch (allow small floating point differences)
      const difference = Math.abs(expected - actual);
      if (difference > 0.01) {
        // Find activity name from activities schema
        const activityName = findActivityName(activityCode, activities);
        const section = activityCode.includes('_D_') ? 'D' : 'E';

        result.push({
          activityCode,
          activityName,
          section: section as "D" | "E",
          expected,
          actual,
          difference,
        });
      }
    });

    return result;
  }, [formData, previousQuarterBalances, projectType, facilityType, quarter, activities]);

  // Don't show banner if no mismatches or if dismissed
  if (mismatches.length === 0 || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleAcceptChanges = () => {
    setIsDismissed(true);
    onAcceptChanges?.();
  };

  return (
    <Alert variant="destructive" className="mb-4 border-orange-500 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-900 font-semibold flex items-center justify-between">
        <span>Opening Balance Mismatch Detected</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-6 w-6 p-0 hover:bg-orange-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription className="text-orange-800">
        <p className="mb-3">
          The opening balances for this quarter don't match the previous quarter's closing balances.
          This may indicate a data inconsistency or calculation error.
        </p>

        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-orange-700 border-orange-300 hover:bg-orange-100"
          >
            {showDetails ? "Hide Details" : "Show Details"} ({mismatches.length} {mismatches.length === 1 ? "mismatch" : "mismatches"})
          </Button>
          
          {previousQuarterBalances?.executionId && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="text-orange-700 border-orange-300 hover:bg-orange-100"
            >
              <a
                href={`/execution/${previousQuarterBalances.executionId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View {previousQuarterBalances.quarter} Data →
              </a>
            </Button>
          )}
        </div>

        {showDetails && (
          <div className="bg-white rounded-md border border-orange-200 overflow-hidden mb-3">
            <Table>
              <TableHeader>
                <TableRow className="bg-orange-100">
                  <TableHead className="font-semibold text-orange-900">Activity</TableHead>
                  <TableHead className="font-semibold text-orange-900 text-center">Section</TableHead>
                  <TableHead className="font-semibold text-orange-900 text-right">
                    Expected ({previousQuarterBalances.quarter} Closing)
                  </TableHead>
                  <TableHead className="font-semibold text-orange-900 text-right">
                    Actual ({quarter} Opening)
                  </TableHead>
                  <TableHead className="font-semibold text-orange-900 text-right">Difference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mismatches.map((mismatch) => (
                  <TableRow key={mismatch.activityCode}>
                    <TableCell className="font-medium text-sm">{mismatch.activityName}</TableCell>
                    <TableCell className="text-center text-sm">
                      <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-mono text-xs">
                        {mismatch.section}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {mismatch.expected.toLocaleString()} RWF
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {mismatch.actual.toLocaleString()} RWF
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-600 font-semibold">
                      {mismatch.difference.toLocaleString()} RWF
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex items-center gap-2">
          {onAcceptChanges && (
            <Button
              size="sm"
              onClick={handleAcceptChanges}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Accept Recalculation
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            className="text-orange-700 border-orange-300 hover:bg-orange-100"
          >
            Review Manually
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Helper function to find activity name from activities schema
 */
function findActivityName(activityCode: string, activities: any): string {
  if (!activities) {
    return activityCode;
  }

  // Search through all sections
  for (const section of Object.values(activities) as any[]) {
    if (!section) continue;

    // Check direct items
    if (section.items) {
      const item = section.items.find((i: any) => i.code === activityCode);
      if (item) return item.name || item.title || activityCode;
    }

    // Check subcategories
    if (section.subCategories) {
      for (const subCat of Object.values(section.subCategories) as any[]) {
        if (subCat?.items) {
          const item = subCat.items.find((i: any) => i.code === activityCode);
          if (item) return item.name || item.title || activityCode;
        }
      }
    }
  }

  return activityCode;
}
