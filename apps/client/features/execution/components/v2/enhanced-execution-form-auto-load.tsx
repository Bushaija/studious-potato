"use client"

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import { useExecutionForm } from "@/hooks/use-execution-form";
import { ExecutionFormProvider } from "@/features/execution/execution-form-context";
import ExecutionHeader from "@/features/execution/components/v2/header";
import ExecutionTable from "@/features/execution/components/v2/table";
import { FormActions } from "@/features/shared/form-actions";
import { ExecutionActionsProvider } from "@/features/execution/components/v2/execution-actions-context";
import { useTempSaveStore, generateSaveId } from "@/features/execution/stores/temp-save-store";
import { useExecutionSubmissionHandler } from "@/hooks/use-execution-submission-handler";
import useCheckExistingExecution from "@/hooks/queries/executions/use-check-existing-execution";
import { toast } from "sonner";
import { useGetCurrentReportingPeriod } from "@/hooks/queries";
import { useExpenseCalculations } from "@/features/execution/hooks/use-expense-calculations";
import { getVATReceivableCode } from "@/features/execution/utils/vat-to-section-d-mapping";
import { type VATApplicableCategory } from "@/features/execution/utils/vat-applicable-expenses";
import { useMiscellaneousAdjustments } from "@/features/execution/hooks/use-miscellaneous-adjustments";
import { validateMiscellaneousAdjustments, type ValidationResult } from "@/features/execution/utils/miscellaneous-adjustments-validation";
import { useGetPreviousQuarterExecution } from "@/hooks/queries/executions/use-get-previous-quarter-execution";
import type { PreviousQuarterBalances, QuarterSequence } from "@/features/execution/types/quarterly-rollover";

type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

interface EnhancedExecutionFormAutoLoadProps {
  projectType: "HIV" | "MAL" | "TB"; // Changed from "Malaria" to "MAL" for consistency with activity codes
  facilityType: "hospital" | "health_center";
  quarter: Quarter;
  mode?: "create" | "edit" | "view" | "readOnly";
  executionId?: number;
  initialData?: Record<string, any>;
  projectId?: number;
  facilityId?: number;
  reportingPeriodId?: number;
  facilityName?: string;
  programName?: string;
  schemaId?: number;
}

export function EnhancedExecutionFormAutoLoad({
  projectType,
  facilityType,
  quarter,
  mode = "create",
  executionId,
  initialData,
  projectId: projectIdProp,
  facilityId: facilityIdProp,
  reportingPeriodId: reportingPeriodIdProp,
  facilityName: facilityNameProp,
  programName: programNameProp,
  schemaId: schemaIdProp
}: EnhancedExecutionFormAutoLoadProps) {
  // Basic hooks at the top
  const effectiveMode: "create" | "edit" | "view" = (mode === "readOnly" ? "view" : mode) as any;
  const isReadOnly = effectiveMode === "view";
  const { data: currentReportingPeriod } = useGetCurrentReportingPeriod();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Extract IDs for checking existing execution
  const projectIdFromUrl = searchParams?.get("projectId") || "";
  const projectId = effectiveMode === "edit"
    ? (projectIdProp ?? 0)
    : (projectIdProp ?? (/^\d+$/.test(projectIdFromUrl) ? Number(projectIdFromUrl) : 0));

  const facilityId = effectiveMode === "edit"
    ? (facilityIdProp ?? 0)
    : (facilityIdProp ?? (Number(searchParams?.get("facilityId") || 0) || 0));
  const reportingPeriodId = effectiveMode === "edit"
    ? (reportingPeriodIdProp ?? (currentReportingPeriod?.id ?? 0))
    : (reportingPeriodIdProp ?? (Number(searchParams?.get("reportingPeriodId") || currentReportingPeriod?.id || 0) || 0));

  // Fetch previous quarter execution data for balance rollover
  const previousQuarterQuery = useGetPreviousQuarterExecution({
    projectId,
    facilityId,
    reportingPeriodId,
    currentQuarter: quarter,
    enabled: effectiveMode === "create" && Boolean(projectId && facilityId && reportingPeriodId),
  });

  // Prepare initial data with previous quarter balances
  const initialDataWithBalances = useMemo(() => {
    const balances = initialData?.previousQuarterBalances || previousQuarterQuery.data?.previousQuarterBalances;
    const sequence = initialData?.quarterSequence || previousQuarterQuery.data?.quarterSequence;

    return {
      ...initialData,
      previousQuarterBalances: balances,
      quarterSequence: sequence
    };
  }, [initialData, previousQuarterQuery.data]);

  // Form hook after all the dependencies are defined
  console.log('🏥 [Component] IDs for planning query:', { projectId, facilityId, reportingPeriodId });
  const form = useExecutionForm({
    projectType,
    facilityType,
    quarter,
    executionId,
    initialData: initialDataWithBalances,
    projectId,
    facilityId,
    reportingPeriodId
  });

  // Log Section D totals including VAT receivables
  useEffect(() => {
    if (!form.formData) {
      console.warn('Form data not yet available');
      return;
    }


    // Calculate Section D total from activities
    const sectionDActivities = Object.entries(form.formData)
      .filter(([code]) => code.includes('_D_'));

    const sectionDTotal = sectionDActivities.reduce((sum, [code, value]) => {
      const qValue = value?.[`q${quarter[1]}`] || 0;
      const numValue = Number(qValue) || 0;
      // if (numValue !== 0) {
      //   console.log(`Activity ${code} [q${quarter[1]}]:`, numValue);
      // }
      return sum + numValue;
    }, 0);

    // Get VAT receivables
    const vatReceivables = form.formData.vatReceivables || {};
    // console.log('VAT Receivables Raw Data:', vatReceivables);

    const vatEntries = Object.entries(vatReceivables);
    // console.log('VAT Categories:', vatEntries.map(([cat]) => cat));

    const vatTotal = vatEntries.reduce((sum, [category, data]) => {
      const qValue = data?.[`q${quarter[1]}`] || 0;
      const qCleared = data?.[`q${quarter[1]}_cleared`] || 0;
      const net = Number(qValue) - Number(qCleared);

      return sum + net;
    }, 0);

  }, [form.formData, quarter, projectType, facilityType]);

  // Extract previousQuarterBalances and quarterSequence from the query
  const previousQuarterBalances = useMemo<PreviousQuarterBalances | undefined>(() => {
    const balances = initialData?.previousQuarterBalances || previousQuarterQuery.data?.previousQuarterBalances;
    return balances;
  }, [initialData, previousQuarterQuery.data]);

  const quarterSequence = useMemo<QuarterSequence | undefined>(() => {
    const sequence = initialData?.quarterSequence || previousQuarterQuery.data?.quarterSequence;
    return sequence;
  }, [initialData, previousQuarterQuery.data]);

  // Check for existing execution when we have the required IDs
  const shouldCheckForExisting = Boolean(
    projectId &&
    facilityId &&
    reportingPeriodId &&
    effectiveMode === "create" && // Only check when creating
    !executionId // Don't check if we already have an executionId
  );


  const {
    data: existingExecution,
    isLoading: isCheckingExisting,
    refetch: recheckExisting
  } = useCheckExistingExecution(
    {
      projectId: String(projectId),
      facilityId: String(facilityId),
      reportingPeriodId: String(reportingPeriodId),
    }
  );

  // Auto-load existing data when found (use ref to prevent infinite loops)
  const autoLoadedRef = useRef(false);

  useEffect(() => {
    if (existingExecution?.exists && existingExecution?.entry && !initialData && !autoLoadedRef.current) {
      const entry = existingExecution.entry;

      // Transform the existing activities data to match the form's expected format
      const activities = entry.formData?.activities || {};
      const transformedData: Record<string, any> = {};

      // Track Section D "Other Receivables" values to reconstruct Section X
      const projectPrefix = projectType.toUpperCase();
      const facilityPrefix = facilityType === 'health_center' ? 'HEALTH_CENTER' : 'HOSPITAL';
      const otherReceivablesCode = `${projectPrefix}_EXEC_${facilityPrefix}_D_4`;
      const sectionXCode = `${projectPrefix}_EXEC_${facilityPrefix}_X_1`;

      let otherReceivablesData: any = null;

      // Helper to extract VAT fields - handle both object format {q1: x, q2: y} and direct values
      const extractVATField = (field: any) => {
        if (!field || typeof field !== 'object') return undefined;
        // If it's an object with quarter keys, return it as-is
        if (Object.keys(field).length > 0) return field;
        return undefined;
      };

      Object.entries(activities).forEach(([code, activityData]) => {
        if (activityData && typeof activityData === 'object') {
          const activityObj = activityData as any;

          // Use the activity's code field as the key if available, otherwise use the original code
          const activityCode = activityObj.code || code;

          // Capture Section D "Other Receivables" data for reconstruction
          if (activityCode === otherReceivablesCode) {
            otherReceivablesData = {
              q1: Number(activityObj.q1 || 0),
              q2: Number(activityObj.q2 || 0),
              q3: Number(activityObj.q3 || 0),
              q4: Number(activityObj.q4 || 0),
            };
          }

          transformedData[activityCode] = {
            q1: Number(activityObj.q1 || 0),
            q2: Number(activityObj.q2 || 0),
            q3: Number(activityObj.q3 || 0),
            q4: Number(activityObj.q4 || 0),
            comment: String(activityObj.comment || ""),
            // Restore payment tracking data with backward compatibility defaults
            paymentStatus: activityObj.paymentStatus || "unpaid",
            amountPaid: Number(activityObj.amountPaid) || 0,
            // Restore VAT tracking data (if present) - preserve quarter-based structure
            ...(extractVATField(activityObj.netAmount) && { netAmount: activityObj.netAmount }),
            ...(extractVATField(activityObj.vatAmount) && { vatAmount: activityObj.vatAmount }),
            ...(extractVATField(activityObj.vatCleared) && { vatCleared: activityObj.vatCleared }),
          };
        }
      });

      // Reconstruct Section X from Section D "Other Receivables" if not already present
      // This ensures the double-entry is properly reconstructed when loading saved data
      // Only reconstruct if there are non-zero Other Receivables values
      if (otherReceivablesData && !transformedData[sectionXCode]) {
        const hasNonZeroValue =
          otherReceivablesData.q1 > 0 ||
          otherReceivablesData.q2 > 0 ||
          otherReceivablesData.q3 > 0 ||
          otherReceivablesData.q4 > 0;

        if (hasNonZeroValue) {
          transformedData[sectionXCode] = {
            q1: otherReceivablesData.q1,
            q2: otherReceivablesData.q2,
            q3: otherReceivablesData.q3,
            q4: otherReceivablesData.q4,
            comment: '',
            paymentStatus: 'unpaid',
            amountPaid: 0,
          };
        }
      }

      // Update the form with existing data
      if (Object.keys(transformedData).length > 0) {
        form.setFormData(transformedData);
        autoLoadedRef.current = true;

        // Show which quarters have data
        const quartersWithData = [];
        if (Object.values(transformedData).some((data: any) => data.q1 > 0)) quartersWithData.push('Q1');
        if (Object.values(transformedData).some((data: any) => data.q2 > 0)) quartersWithData.push('Q2');
        if (Object.values(transformedData).some((data: any) => data.q3 > 0)) quartersWithData.push('Q3');
        if (Object.values(transformedData).some((data: any) => data.q4 > 0)) quartersWithData.push('Q4');

        toast.success("📋 Loaded existing execution data", {
          description: `Found data for ${Object.keys(transformedData).length} activities. Previous quarters: ${quartersWithData.join(', ')}`
        });
      }
    }
  }, [existingExecution?.exists, existingExecution?.entry?.id, initialData, projectType, facilityType]); // Added projectType and facilityType

  // ===== PAYMENT TRACKING LOGIC =====
  // Get opening balance from previous quarter's closing balance
  // For Q1 or when no previous quarter exists, opening balance is 0
  const openingBalance = useMemo(() => {
    // If we have previous quarter data, use its closing cash balance
    if (previousQuarterBalances?.exists && previousQuarterBalances.closingBalances?.D) {
      const cashAtBankCode = Object.keys(previousQuarterBalances.closingBalances.D).find(code =>
        code.includes('_D_1')
      );

      const cashBalance = cashAtBankCode
        ? previousQuarterBalances.closingBalances.D[cashAtBankCode]
        : 0;

      return cashBalance;
    }

    // For Q1 or when no previous quarter exists, opening balance is 0
    return 0;
  }, [previousQuarterBalances, quarter]);

  // Use miscellaneous adjustments hook to extract Other Receivable amount from Section X
  const { otherReceivableAmount, otherReceivableCode } = useMiscellaneousAdjustments({
    formData: form.formData,
    activities: form.activities,
    quarter,
  });

  // Activity Code Verification
  useEffect(() => {
    if (!form.activities) return;

    const projectPrefix = projectType.toUpperCase();
    const facilityPrefix = facilityType === 'health_center' ? 'HEALTH_CENTER' : 'HOSPITAL';

    // Generate expected activity codes
    const expectedCodes = {
      sectionX: `${projectPrefix}_EXEC_${facilityPrefix}_X_1`,
      sectionDCashAtBank: `${projectPrefix}_EXEC_${facilityPrefix}_D_1`,
      sectionDOtherReceivables: `${projectPrefix}_EXEC_${facilityPrefix}_D_4`,
    };

    // Verify pattern matching
    const patternVerification = {
      sectionX: {
        code: expectedCodes.sectionX,
        matchesPattern: /^[A-Z]+_EXEC_(HOSPITAL|HEALTH_CENTER)_X_1$/.test(expectedCodes.sectionX),
        existsInFormData: expectedCodes.sectionX in form.formData,
        formDataValue: form.formData[expectedCodes.sectionX],
      },
      sectionDCashAtBank: {
        code: expectedCodes.sectionDCashAtBank,
        matchesPattern: /^[A-Z]+_EXEC_(HOSPITAL|HEALTH_CENTER)_D_1$/.test(expectedCodes.sectionDCashAtBank),
        existsInFormData: expectedCodes.sectionDCashAtBank in form.formData,
        formDataValue: form.formData[expectedCodes.sectionDCashAtBank],
      },
      sectionDOtherReceivables: {
        code: expectedCodes.sectionDOtherReceivables,
        matchesPattern: /^[A-Z]+_EXEC_(HOSPITAL|HEALTH_CENTER)_D_4$/.test(expectedCodes.sectionDOtherReceivables),
        existsInFormData: expectedCodes.sectionDOtherReceivables in form.formData,
        formDataValue: form.formData[expectedCodes.sectionDOtherReceivables],
      },
    };

    // Check for mismatches
    const mismatches = [];
    if (!patternVerification.sectionX.existsInFormData) {
      mismatches.push(`Section X code ${expectedCodes.sectionX} not found in formData`);
    }
    if (!patternVerification.sectionDCashAtBank.existsInFormData) {
      mismatches.push(`Section D Cash at Bank code ${expectedCodes.sectionDCashAtBank} not found in formData`);
    }
    if (!patternVerification.sectionDOtherReceivables.existsInFormData) {
      mismatches.push(`Section D Other Receivables code ${expectedCodes.sectionDOtherReceivables} not found in formData`);
    }

    // if (mismatches.length > 0) {
    //   console.error('❌ Code Mismatches Found:', mismatches);
    // }
  }, [form.activities, form.formData, projectType, facilityType]);

  // State to track validation errors for miscellaneous adjustments
  const [miscValidationError, setMiscValidationError] = React.useState<ValidationResult | null>(null);

  // Calculate Cash at Bank before adjustment (for validation)
  // Note: We call useExpenseCalculations at the top level, not inside useMemo
  const { cashAtBank: cashAtBankBeforeAdjustment } = useExpenseCalculations({
    formData: form.formData,
    openingBalance,
    activities: form.activities,
    quarter,
    otherReceivableAmount: 0,  // Don't include adjustment for validation
    previousQuarterBalances,  // NEW: Pass previous quarter balances for rollover
  });

  // Use expense calculations hook to compute Cash at Bank, Payables, and VAT Receivables
  // Pass previousQuarterBalances for quarterly rollover support
  // Requirements: 4.1, 4.2
  const { cashAtBank, payables, vatReceivables, totalPaid, totalUnpaid, totalVATReceivable, totalVATCleared } = useExpenseCalculations({
    formData: form.formData,
    openingBalance,
    activities: form.activities,
    quarter,
    otherReceivableAmount,  // Pass Other Receivable amount to reduce Cash at Bank
    previousQuarterBalances,  // NEW: Pass previous quarter balances for rollover
  });



  // Validate miscellaneous adjustments when Other Receivable amount changes
  useEffect(() => {
    if (effectiveMode === 'view' || !form.activities) {
      setMiscValidationError(null);
      return;
    }

    // Only validate if there's an Other Receivable amount
    if (otherReceivableAmount === 0) {
      setMiscValidationError(null);
      return;
    }

    const validationResult = validateMiscellaneousAdjustments(
      otherReceivableAmount,
      cashAtBankBeforeAdjustment
    );

    setMiscValidationError(validationResult);
  }, [otherReceivableAmount, cashAtBankBeforeAdjustment, effectiveMode, form.activities]);

  // Debug: Check if Section D and E codes exist in formData
  // projectType is already normalized to MAL (not Malaria) at the page level
  const projectPrefix = projectType.toUpperCase();
  const facilityPrefix = facilityType === 'health_center' ? 'HEALTH_CENTER' : 'HOSPITAL';
  const cashAtBankCode = `${projectPrefix}_EXEC_${facilityPrefix}_D_1`;


  // Auto-update Section D (Cash at Bank, Other Receivables) and Section E (Payables and VAT Receivables) with computed values
  // ONLY in create/edit mode - in view mode, skip updates
  const hasInitializedRef = useRef(false);
  const prevComputedValuesRef = useRef<{
    cashAtBank?: number;
    otherReceivableAmount?: number;
    payables?: Record<string, number>;
    vatReceivables?: Record<string, number>;
  }>({});

  useEffect(() => {
    // Skip auto-update in view mode only (read-only)
    if (effectiveMode === 'view') {
      return;
    }

    if (!form.activities) {
      return;
    }

    // Check if Section D and Section X exist in activities
    if (!form.activities.D || !form.activities.X) {
      return;
    }

    // projectType is already normalized to MAL (not Malaria) at the page level
    const projectPrefix = projectType.toUpperCase();
    const facilityPrefix = facilityType === 'health_center' ? 'HEALTH_CENTER' : 'HOSPITAL';

    // Find the actual activity codes from the activities data
    // Don't hardcode the numeric suffix as it depends on database IDs
    const sectionD = form.activities?.D;
    const sectionX = form.activities?.X;

    // Find Cash at Bank (should be first item in Section D)
    const cashAtBankActivity = sectionD?.items?.find((item: any) =>
      item.name?.toLowerCase().includes('cash at bank')
    );
    const cashAtBankCode = cashAtBankActivity?.code || `${projectPrefix}_EXEC_${facilityPrefix}_D_1`;

    // Find Other Receivables (COMPUTED_ASSET type)
    const otherReceivablesActivity = sectionD?.items?.find((item: any) =>
      item.activityType === 'COMPUTED_ASSET' ||
      item.name?.toLowerCase().includes('other receivables')
    );
    const otherReceivablesCode = otherReceivablesActivity?.code || `${projectPrefix}_EXEC_${facilityPrefix}_D_4`;

    // Find Section X Other Receivable (MISCELLANEOUS_ADJUSTMENT type)
    const sectionXActivity = sectionX?.items?.find((item: any) =>
      item.activityType === 'MISCELLANEOUS_ADJUSTMENT'
    );
    const sectionXCode = sectionXActivity?.code || `${projectPrefix}_EXEC_${facilityPrefix}_X_1`;

    // Verify we found all required activities
    if (!otherReceivablesActivity) {
      return;
    }

    if (!sectionXActivity) {
      return;
    }

    const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
    const currentCashValue = form.formData[cashAtBankCode]?.[quarterKey];
    const currentOtherReceivablesValue = form.formData[otherReceivablesCode]?.[quarterKey];
    const currentSectionXValue = form.formData[sectionXCode]?.[quarterKey];

    // Update Other Receivables in Section D to mirror Section X value
    // Only update if the activity exists in formData and computed value changed
    if (otherReceivablesCode in form.formData) {
      const previousOtherReceivable =
        previousQuarterBalances?.exists && previousQuarterBalances.closingBalances?.D
          ? previousQuarterBalances.closingBalances.D[otherReceivablesCode] || 0
          : 0;
      const targetOtherReceivableValue = previousOtherReceivable + otherReceivableAmount;

      if (prevComputedValuesRef.current.otherReceivableAmount !== targetOtherReceivableValue && 
          currentOtherReceivablesValue !== targetOtherReceivableValue) {
        prevComputedValuesRef.current.otherReceivableAmount = targetOtherReceivableValue;
        form.onFieldChange(otherReceivablesCode, targetOtherReceivableValue);
      }
    } else {
      return;
    }

    // Update Cash at Bank (includes VAT clearances and Other Receivable adjustment)
    // Only update if the activity exists in formData and computed value changed
    if (cashAtBankCode in form.formData) {
      if (prevComputedValuesRef.current.cashAtBank !== cashAtBank && currentCashValue !== cashAtBank) {
        prevComputedValuesRef.current.cashAtBank = cashAtBank;
        prevComputedValuesRef.current.cashAtBank = cashAtBank;
        form.onFieldChange(cashAtBankCode, cashAtBank);
      }
    } else {
      return;
    }

    const previousSectionDBalances = previousQuarterBalances?.closingBalances?.D;

    if (previousQuarterBalances?.exists && previousSectionDBalances && sectionD?.items) {
      sectionD.items.forEach((item: any) => {
        const code = item.code;
        if (!code || code === cashAtBankCode || code === otherReceivablesCode) {
          return;
        }
        if (code.includes('_D_VAT_')) {
          return;
        }

        const previousAmount = previousSectionDBalances[code];
        if (typeof previousAmount !== 'number' || previousAmount === 0) {
          return;
        }

        const currentValue = form.formData[code]?.[quarterKey];
        if (currentValue === undefined || currentValue === 0) {
          form.onFieldChange(code, previousAmount);
        }
      });
    }

    // Update all payable category fields
    // Get all Section E codes from formData (excluding VAT receivable codes)
    const allSectionECodes = Object.keys(form.formData).filter(code =>
      code.includes('_E_') && !code.includes('_E_VAT_')
    );

    // Update payables that have values - only if computed value changed
    Object.entries(payables).forEach(([payableCode, amount]) => {
      const currentPayableValue = form.formData[payableCode]?.[quarterKey];
      const prevAmount = prevComputedValuesRef.current.payables?.[payableCode];

      if (prevAmount !== amount && currentPayableValue !== amount) {
        if (!prevComputedValuesRef.current.payables) {
          prevComputedValuesRef.current.payables = {};
        }
        prevComputedValuesRef.current.payables[payableCode] = amount;
        form.onFieldChange(payableCode, amount);
      }
    });

    // Clear payables that should be 0 (not in the payables object)
    allSectionECodes.forEach((payableCode) => {
      // Skip if this payable already has a value in the payables object
      if (payableCode in payables) {
        return;
      }

      const currentPayableValue = form.formData[payableCode]?.[quarterKey];

      // If the current value is not 0, clear it
      if (currentPayableValue !== 0 && currentPayableValue !== undefined) {
        form.onFieldChange(payableCode, 0);
      }
    });

    // Update VAT receivables in Section D - only if computed value changed
    Object.entries(vatReceivables).forEach(([category, amount]) => {
      const vatReceivableCode = getVATReceivableCode(
        projectType,
        facilityType,
        category as VATApplicableCategory
      );

      // Only update if the code is valid and we have an amount
      if (vatReceivableCode && (amount || amount === 0)) {
        const currentVATValue = form.formData[vatReceivableCode]?.[quarterKey];
        const prevAmount = prevComputedValuesRef.current.vatReceivables?.[category];

        // Only update if the computed value has changed
        if (prevAmount !== amount && (currentVATValue === undefined || currentVATValue === null || currentVATValue !== amount)) {
          if (!prevComputedValuesRef.current.vatReceivables) {
            prevComputedValuesRef.current.vatReceivables = {};
          }
          prevComputedValuesRef.current.vatReceivables[category] = amount;
          form.onFieldChange(vatReceivableCode, amount);
        }
      }
    });

    // Clear VAT receivables that should be 0 (not in the vatReceivables object)
    const allVATReceivableCodes = Object.keys(form.formData).filter(code =>
      code.includes('_D_VAT_') || code.includes('_E_VAT_')
    );

    allVATReceivableCodes.forEach((vatCode) => {
      // Skip if this is a new entry we just added
      if (form.formData[vatCode]?.[quarterKey] !== undefined) {
        return;
      }

      // Check if this VAT receivable has a value in the vatReceivables object
      const hasValue = Object.entries(vatReceivables).some(([category]) => {
        const expectedCode = getVATReceivableCode(
          projectType,
          facilityType,
          category as VATApplicableCategory
        );
        return expectedCode === vatCode;
      });

      // Only clear if not in vatReceivables and not already 0
      if (!hasValue) {
        const currentVATValue = form.formData[vatCode]?.[quarterKey];

        if (currentVATValue !== 0 && currentVATValue !== undefined) {
          form.onFieldChange(vatCode, 0);
        }
      }
    });

    hasInitializedRef.current = true;
  }, [otherReceivableAmount, otherReceivableCode, cashAtBank, payables, vatReceivables, form.activities, projectType, facilityType, quarter, effectiveMode, previousQuarterBalances]);
  // ===== END PAYMENT TRACKING LOGIC =====

  // Initialize the smart submission handler
  const { handleSubmission, isSubmitting, error } = useExecutionSubmissionHandler({
    projectType,
    facilityType,
    quarter,
    schemaId: schemaIdProp ?? (form.schema as any)?.id ?? 0,
    isValid: form.isValid,
    canSubmitExecution: (form as any).canSubmitExecution ?? true,
    validationErrors: (form as any).clientValidationErrors || [],
  });

  // Build a stable draft id and metadata for this session
  const draftMeta = useMemo(() => {
    const qpFacilityId = facilityIdProp || Number(searchParams?.get("facilityId") || 0) || 0;
    const qpFacilityType = (searchParams?.get("facilityType") as any) || facilityType;
    const qpFacilityName = facilityNameProp || searchParams?.get("facilityName") || "";
    const qpProgram = programNameProp || (searchParams?.get("program") as any) || projectType;
    const qpReporting = reportingPeriodIdProp || searchParams?.get("reportingPeriodId") || currentReportingPeriod?.id || "";
    return {
      facilityId: qpFacilityId,
      facilityName: qpFacilityName,
      reportingPeriod: String(qpReporting),
      programName: qpProgram,
      fiscalYear: "",
      mode: effectiveMode as any,
      facilityType: qpFacilityType as any,
    };
  }, [searchParams, facilityType, projectType, effectiveMode, currentReportingPeriod?.id, facilityIdProp, facilityNameProp, programNameProp, reportingPeriodIdProp]);

  // Generate a stable draft ID - use only essential identifiers that don't change
  // Format: exec_{facilityId}_{reportingPeriodId}_{facilityType}_{quarter}
  const draftId = useMemo(() => {
    const fId = facilityIdProp || Number(searchParams?.get("facilityId") || 0) || 0;
    const rpId = reportingPeriodIdProp || searchParams?.get("reportingPeriodId") || currentReportingPeriod?.id || "";
    const fType = (searchParams?.get("facilityType") as any) || facilityType;
    
    const raw = `exec_${fId}_${rpId}_${fType}_${quarter}`;
    const id = raw.replace(/\s+/g, '_').toLowerCase();
    
    console.log('[Draft] Generated draftId:', id, { facilityId: fId, reportingPeriodId: rpId, facilityType: fType, quarter });
    return id;
  }, [searchParams, facilityType, quarter, currentReportingPeriod?.id, facilityIdProp, reportingPeriodIdProp]);

  // Select only the action to avoid re-render loops
  const saveTemporary = useTempSaveStore(s => s.saveTemporary);
  const restoreTemporary = useTempSaveStore(s => s.restoreTemporary);
  const lastSavedIso = useTempSaveStore(s => s.saves[draftId]?.timestamps.lastSaved);

  function buildSubmissionActivities() {
    // Build activities from ALL form data entries
    // This includes all sections: A (Receipts), B (Expenditures), X (Miscellaneous Adjustments),
    // C (Surplus/Deficit), D (Financial Assets), E (Financial Liabilities), F (Net Financial Assets), G (Closing Balance)
    const entries = Object.entries(form.formData || {});
    const activities = entries
      .map(([code, v]: any) => ({
        code,
        q1: Number(v?.q1) || 0,
        q2: Number(v?.q2) || 0,
        q3: Number(v?.q3) || 0,
        q4: Number(v?.q4) || 0,
        comment: typeof v?.comment === "string" ? v.comment : "",
        // Include payment tracking data
        paymentStatus: v?.paymentStatus || "unpaid",
        amountPaid: Number(v?.amountPaid) || 0,
        // Include VAT tracking data (if present)
        ...(v?.netAmount && { netAmount: v.netAmount }),
        ...(v?.vatAmount && { vatAmount: v.vatAmount }),
        ...(v?.vatCleared && { vatCleared: v.vatCleared }),
      }))
      // Drop totals/computed placeholders if they carry no data
      .filter(a => (a.q1 + a.q2 + a.q3 + a.q4) !== 0 || (a.comment ?? "").trim().length > 0);

    return activities;
  }

  const saveDraft = useCallback(() => {
    // Don't save if draftId is not stable yet
    if (!draftMeta.facilityId || !draftMeta.reportingPeriod) {
      console.warn("[Draft] saveDraft: draftId not stable yet, skipping save");
      return;
    }
    
    try {
      const formValues = form.formData;
      const formRows: any[] = [];
      const expandedRows: string[] = [];
      
      console.log('[Draft] Saving draft with id:', draftId, 'formValues keys:', Object.keys(formValues).length);
      
      saveTemporary(draftId, formRows as any, formValues as any, expandedRows, draftMeta);
      toast.success("Draft saved", {
        description: "Your changes have been saved locally",
        duration: 2000,
      });
    } catch (err) {
      console.error("[Draft] saveDraft:error", err);
      toast.error("Failed to save draft", {
        description: "Could not save your changes locally",
      });
    }
  }, [saveTemporary, draftId, draftMeta, form.formData]);

  // Auto-save function (silent, no toast)
  const autoSaveDraft = useCallback(() => {
    // Don't save if draftId is not stable yet
    if (!draftMeta.facilityId || !draftMeta.reportingPeriod) {
      return;
    }
    
    try {
      const formValues = form.formData;
      const formRows: any[] = [];
      const expandedRows: string[] = [];
      
      console.log('[Draft] Auto-saving draft with id:', draftId, 'formValues keys:', Object.keys(formValues).length);
      
      saveTemporary(draftId, formRows as any, formValues as any, expandedRows, draftMeta);
    } catch (err) {
      console.error("[Draft] autosave:error", err);
    }
  }, [saveTemporary, draftId, draftMeta, form.formData]);

  // Auto-save when form is dirty (debounced)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!form.isDirty || isReadOnly) return;
    
    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Debounce auto-save by 2 seconds
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSaveDraft();
    }, 2000);
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [form.formData, form.isDirty, isReadOnly, autoSaveDraft]);

  // Restore draft once after activities are ready
  const restoredRef = useRef(false);
  const previousDraftIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    console.log('[Draft] Restore effect running:', { 
      draftId, 
      restoredRef: restoredRef.current, 
      previousDraftId: previousDraftIdRef.current,
      hasActivities: form.activities && Object.keys(form.activities).length > 0,
      facilityId: draftMeta.facilityId,
      reportingPeriod: draftMeta.reportingPeriod,
      mode,
      existingExecutionExists: existingExecution?.exists
    });
    
    // Skip if already restored with this draftId
    if (restoredRef.current && previousDraftIdRef.current === draftId) {
      console.log('[Draft] Already restored for this draftId, skipping');
      return;
    }
    
    // Wait for activities to be loaded
    const hasActivities = form.activities && Object.keys(form.activities).length > 0;
    if (!hasActivities) {
      console.log('[Draft] Activities not loaded yet, waiting...');
      return;
    }
    
    // Wait for draftId to be stable (has required parts)
    if (!draftMeta.facilityId || !draftMeta.reportingPeriod) {
      console.log('[Draft] draftId not stable yet (missing facilityId or reportingPeriod)');
      return;
    }

    // Skip temporary restore in edit/readOnly mode when we have initial data - we want to load the saved execution data
    if ((mode === "edit" || mode === "readOnly") && initialData && Object.keys(initialData).length > 0) {
      console.log('[Draft] Edit/readOnly mode with initialData, skipping restore');
      restoredRef.current = true;
      previousDraftIdRef.current = draftId;
      return;
    }

    // Skip restore if we're auto-loading existing execution data
    if (existingExecution?.exists && !initialData) {
      console.log('[Draft] Existing execution found, skipping draft restore');
      restoredRef.current = true;
      previousDraftIdRef.current = draftId;
      return;
    }

    // Try to restore the draft
    console.log('[Draft] Attempting to restore draft with id:', draftId);
    const save = restoreTemporary(draftId);
    console.log('[Draft] Restore result:', save ? { hasFormValues: !!save.formValues, keys: Object.keys(save.formValues || {}).length } : 'null');
    
    if (save && save.formValues && Object.keys(save.formValues).length > 0) {
      // Merge to preserve schema-initialized keys; prefer saved values
      const merged = { ...form.formData, ...(save.formValues as any) } as any;
      console.log('[Draft] Restoring merged data with', Object.keys(merged).length, 'keys');
      form.setFormData(merged);
      
      // Show toast to inform user that draft was restored
      toast.success("Draft restored", {
        description: "Your previous work has been restored",
        duration: 3000,
      });
    } else {
      console.log('[Draft] No saved draft found for id:', draftId);
    }
    
    restoredRef.current = true;
    previousDraftIdRef.current = draftId;
  }, [draftId, draftMeta.facilityId, draftMeta.reportingPeriod, form.activities, restoreTemporary, mode, initialData, existingExecution?.exists, form.formData, form.setFormData]);

  // Smart submission handler that uses create or update based on existing data
  const handleSmartSubmission = useCallback(async () => {
    if (isReadOnly || isSubmitting) return;

    try {
      // Extract form parameters
      const programParam = searchParams?.get("program");
      const programAsProjectId = programParam && /^\d+$/.test(programParam) ? Number(programParam) : null;
      const projectIdForSubmission = effectiveMode === "edit"
        ? (projectIdProp ?? projectId)
        : (programAsProjectId ?? projectId);
      const facilityIdForSubmission = effectiveMode === "edit"
        ? (facilityIdProp ?? facilityId)
        : facilityId;
      const reportingPeriodIdForSubmission = effectiveMode === "edit"
        ? (reportingPeriodIdProp ?? reportingPeriodId)
        : reportingPeriodId;
      const facilityNameForSubmission = effectiveMode === "edit"
        ? (facilityNameProp ?? "")
        : (searchParams?.get("facilityName") || "");
      const programParamEffective = effectiveMode === "edit"
        ? (programNameProp ?? projectType)
        : (searchParams?.get("program") || projectType);

      const activities = buildSubmissionActivities();

      await handleSubmission({
        projectId: projectIdForSubmission,
        facilityId: facilityIdForSubmission,
        reportingPeriodId: reportingPeriodIdForSubmission,
        facilityName: facilityNameForSubmission,
        activities,
        programName: programParamEffective,
      });
    } catch (err) {
      console.error("submit:execution:error", err);
      toast.error("Failed to submit execution", {
        description: String((err as any)?.message || err)
      });
    }
  }, [
    isReadOnly,
    isSubmitting,
    searchParams,
    effectiveMode,
    projectIdProp,
    facilityIdProp,
    reportingPeriodIdProp,
    facilityNameProp,
    programNameProp,
    currentReportingPeriod,
    projectType,
    handleSubmission,
    buildSubmissionActivities,
    projectId,
    facilityId,
    reportingPeriodId,
  ]);

  // Check if form is valid including miscellaneous adjustments validation
  // IMPORTANT: This must be called BEFORE any early returns to comply with Rules of Hooks
  const isFormValid = useMemo(() => {
    const baseValid = form.isValid;
    const miscValid = !miscValidationError || miscValidationError.isValid;
    return baseValid && miscValid;
  }, [form.isValid, miscValidationError]);

  // Show loading state when checking for existing execution
  if (isCheckingExisting) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Checking for existing execution data...</p>
        </div>
      </div>
    );
  }

  return (
    <ExecutionFormProvider value={{
      formData: form.formData,
      computedValues: form.computedValues,
      onFieldChange: isReadOnly ? () => { } : form.onFieldChange,
      onCommentChange: isReadOnly ? () => { } : form.onCommentChange,
      updateExpensePayment: isReadOnly ? () => { } : form.updateExpensePayment,
      updateVATExpense: isReadOnly ? () => { } : form.updateVATExpense,
      clearVAT: isReadOnly ? () => { } : form.clearVAT,
      clearPayable: isReadOnly ? () => { } : form.clearPayable,
      validationErrors: form.validationErrors,
      isCalculating: form.status.isCalculating,
      isValidating: form.status.isValidating,
      isBalanced: form.isBalanced,
      difference: form.difference,
      table: form.table,
      isQuarterEditable: (q) => isReadOnly ? true : form.isQuarterEditable(q),
      isQuarterVisible: form.isQuarterVisible,
      getSectionTotals: form.getSectionTotals,
      getRowState: (code) => {
        const originalState = form.getRowState(code);
        return {
          ...originalState,
          isEditable: isReadOnly ? false : originalState.isEditable,
        };
      },
      isRowLocked: (code, q) => isReadOnly ? false : form.isRowLocked(code, q),
      expandState: form.expandState,
      onToggleSection: form.onToggleSection,
      // Pass miscellaneous adjustments validation state
      miscValidationError: miscValidationError,
      otherReceivableCode: otherReceivableCode,
    }}>
      <ExecutionActionsProvider
        value={{
          isSubmitting: isSubmitting || form.status.isCalculating || form.status.isValidating,
          isDirty: isReadOnly ? false : form.isDirty,
          isValid: isReadOnly ? true : isFormValid,
          validationErrors: form.validationErrors,
          lastSaved: null,
          onSaveDraft: () => {
            if (isReadOnly) return;
            saveDraft();
          },
          onSubmit: handleSmartSubmission,
          onCancel: () => { },
        }}
      >
        <div className="space-y-4">
          {/* Show notification if we auto-loaded existing data */}
          {existingExecution?.exists && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                📋 <strong>Existing execution found!</strong> Data from previous quarters has been loaded.
                Fill in the current quarter ({quarter}) data below.
              </p>
            </div>
          )}

          <ExecutionHeader />
          <ExecutionTable />
          {/* Display miscellaneous adjustments validation error */}
          {/* {!isReadOnly && miscValidationError && !miscValidationError.isValid && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="h-5 w-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-destructive mb-1">
                    Miscellaneous Adjustments Validation Error
                  </h3>
                  <p className="text-sm text-destructive/90">
                    {miscValidationError.error}
                  </p>
                  {miscValidationError.maxAllowableAmount !== undefined && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Maximum allowable amount: <strong>{miscValidationError.maxAllowableAmount.toLocaleString()} RWF</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )} */}

          {!isReadOnly && (
            <FormActions
              module="execution"
              onSaveDraft={saveDraft}
              onSubmit={handleSmartSubmission}
              onCancel={() => { }}
              isSubmitting={isSubmitting || form.status.isCalculating || form.status.isValidating}
              isDirty={form.isDirty}
              isValid={(form as any).canCreateReport}
              validationErrors={form.validationErrors}
              submitLabel={existingExecution?.exists ? `Update Execution (${quarter})` : "Submit Execution"}
              lastSaved={lastSavedIso ? new Date(lastSavedIso) : undefined}
            />
          )}
        </div>
      </ExecutionActionsProvider>
    </ExecutionFormProvider>
  );
}

export default EnhancedExecutionFormAutoLoad;
