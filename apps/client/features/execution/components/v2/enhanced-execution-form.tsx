"use client"

import dynamic from 'next/dynamic';
import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import { useExecutionForm } from "@/hooks/use-execution-form";
import { ExecutionFormProvider } from "@/features/execution/execution-form-context";
import ExecutionHeader from "@/features/execution/components/v2/header";
import { FormActions } from "@/features/shared/form-actions";
import { ExecutionActionsProvider } from "@/features/execution/components/v2/execution-actions-context";
import { useTempSaveStore, generateSaveId } from "@/features/execution/stores/temp-save-store";
import { useCreateExecution } from "@/hooks/mutations/executions/use-create-execution";
import { useUpdateExecution } from "@/hooks/mutations/executions/use-update-execution";
import { toast } from "sonner";
import { useGetCurrentReportingPeriod } from "@/hooks/queries";
import { useExpenseCalculations } from "@/features/execution/hooks/use-expense-calculations";
import type { PreviousQuarterBalances, QuarterSequence, CascadeImpact } from "@/features/execution/types/quarterly-rollover";
import { ValidationErrorBanner } from "@/features/execution/components/v2/validation-error-banner";
import { ReconciliationWarningBanner } from "@/features/execution/components/v2/reconciliation-warning-banner";
import { CascadeImpactNotification } from "@/features/execution/components/v2/cascade-impact-notification";
import type { ClosingBalances } from "@/features/execution/types/quarterly-rollover";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

// Lazy load the heavy table component
const ExecutionTable = dynamic(
  () => import("@/features/execution/components/v2/table"),
  {
    loading: () => (
      <Card className="mt-4">
        <CardContent className="p-6">
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    ),
  }
);

type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

interface EnhancedExecutionFormProps {
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

export function EnhancedExecutionForm({ projectType, facilityType, quarter, mode = "create", executionId, initialData, projectId: projectIdProp, facilityId: facilityIdProp, reportingPeriodId: reportingPeriodIdProp, facilityName: facilityNameProp, programName: programNameProp, schemaId: schemaIdProp }: EnhancedExecutionFormProps) {
  // Very loud logging that can't be missed
  if (typeof window !== 'undefined') {
    (window as any).PAYMENT_TRACKING_DEBUG = true;
  }
  
  const effectiveMode: "create" | "edit" | "view" = (mode === "readOnly" ? "view" : mode) as any;
  const isReadOnly = effectiveMode === "view";
  const { data: currentReportingPeriod } = useGetCurrentReportingPeriod();
  
  const form = useExecutionForm({ projectType, facilityType, quarter, executionId, initialData });
  
  // State for cascade impact notification
  // Requirements: 8.5
  const [cascadeImpact, setCascadeImpact] = React.useState<CascadeImpact | null>(null);
  const [showCascadeNotification, setShowCascadeNotification] = React.useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Build a stable draft id and metadata for this session
  const draftMeta = useMemo(() => {
    const qpFacilityId = Number(searchParams?.get("facilityId") || 0) || 0;
    const qpFacilityType = (searchParams?.get("facilityType") as any) || facilityType;
    const qpFacilityName = searchParams?.get("facilityName") || "";
    const qpProgram = (searchParams?.get("program") as any) || projectType;
    const qpReporting = searchParams?.get("reportingPeriodId") || String(currentReportingPeriod?.id ?? "") || quarter;
    return {
      facilityId: qpFacilityId,
      facilityName: qpFacilityName,
      reportingPeriod: String(qpReporting),
      programName: qpProgram,
      fiscalYear: "",
      mode: effectiveMode as any,
      facilityType: qpFacilityType as any,
    };
  }, [searchParams, facilityType, projectType, quarter, effectiveMode]);

  const draftId = useMemo(() => {
    const raw = `${draftMeta.facilityId}_${draftMeta.reportingPeriod}_${draftMeta.programName}_${draftMeta.facilityType}_${draftMeta.facilityName}_${draftMeta.mode}`;
    return raw.replace(/\s+/g, '_');
  }, [draftMeta]);

  // Select only the action to avoid re-render loops
  const saveTemporary = useTempSaveStore(s => s.saveTemporary);
  const restoreTemporary = useTempSaveStore(s => s.restoreTemporary);
  const lastSavedIso = useTempSaveStore(s => s.saves[draftId]?.timestamps.lastSaved);
  const createExecutionMutation = useCreateExecution();
  const updateExecutionMutation = useUpdateExecution();

  // Get opening balance from Section A-2
  const openingBalanceCode = useMemo(() => {
    // Find the opening balance code from activities
    // Format: {PROJECT}_EXEC_{FACILITY}_A_2
    const projectPrefix = projectType.toUpperCase();
    const facilityPrefix = facilityType === 'health_center' ? 'HEALTH_CENTER' : 'HOSPITAL';
    return `${projectPrefix}_EXEC_${facilityPrefix}_A_2`;
  }, [projectType, facilityType]);

  // Extract previousQuarterBalances from initialData or API response
  // Requirements: 4.1, 4.2, 4.3
  const previousQuarterBalances = useMemo<PreviousQuarterBalances | undefined>(() => {
    const balances = initialData?.previousQuarterBalances;
    return balances;
  }, [initialData]);

  // Extract quarterSequence from initialData for UI indicator
  // Requirements: 4.3
  const quarterSequence = useMemo<QuarterSequence | undefined>(() => {
    const sequence = initialData?.quarterSequence;
    return sequence;
  }, [initialData]);

  const openingBalance = useMemo(() => {
    const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
    const value = Number(form.formData[openingBalanceCode]?.[quarterKey]) || 0;
    return value;
  }, [form.formData, openingBalanceCode, quarter]);

  // Use expense calculations hook to compute Cash at Bank and Payables
  // Pass previousQuarterBalances for quarterly rollover support
  // Requirements: 4.1, 4.2
  const { cashAtBank, payables, totalPaid, totalUnpaid } = useExpenseCalculations({
    formData: form.formData,
    openingBalance,
    activities: form.activities,
    quarter,
    previousQuarterBalances,  // NEW: Pass previous quarter balances for rollover
    projectType,  // NEW: Pass project type for code mapping
    facilityType,  // NEW: Pass facility type for code mapping
  });

  // Auto-update Section D (Cash at Bank) and Section E (Payables) with computed values
  // Use refs to track previous values and prevent infinite loops
  const prevCashAtBankRef = useRef<number>();
  const prevPayablesRef = useRef<Record<string, number>>({});
  
  useEffect(() => {
    // Skip auto-update in view mode only (read-only)
    if (effectiveMode === 'view') {
      return;
    }
    
    if (!form.activities) return;

    // Update Cash at Bank (D-1)
    // projectType is already normalized to MAL (not Malaria) at the page level
    const projectPrefix = projectType.toUpperCase();
    const facilityPrefix = facilityType === 'health_center' ? 'HEALTH_CENTER' : 'HOSPITAL';
    const cashAtBankCode = `${projectPrefix}_EXEC_${facilityPrefix}_D_1`;
    
    const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
    const currentCashValue = form.formData[cashAtBankCode]?.[quarterKey];
    
    // Only update if the computed value has changed (not the form value)
    if (prevCashAtBankRef.current !== cashAtBank && currentCashValue !== cashAtBank) {
      prevCashAtBankRef.current = cashAtBank;
      form.onFieldChange(cashAtBankCode, cashAtBank);
    }

    // Update all payable category fields
    // Get all Section E codes from formData
    const allSectionECodes = Object.keys(form.formData).filter(code => code.includes('_E_'));
    
    // Update payables that have values
    Object.entries(payables).forEach(([payableCode, amount]) => {
      const currentPayableValue = form.formData[payableCode]?.[quarterKey];
      
      // Only update if the computed value has changed
      if (prevPayablesRef.current[payableCode] !== amount && currentPayableValue !== amount) {
        prevPayablesRef.current[payableCode] = amount;
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
  }, [cashAtBank, payables, form.activities, projectType, facilityType, quarter, effectiveMode]);

  function buildSubmissionActivities() {
    const entries = Object.entries(form.formData || {});
    const activities = entries
      .map(([code, v]: any) => ({
        code,
        q1: Number(v?.q1) || 0,
        q2: Number(v?.q2) || 0,
        q3: Number(v?.q3) || 0,
        q4: Number(v?.q4) || 0,
        comment: typeof v?.comment === "string" ? v.comment : "",
        // Include payment tracking data (now supports quarter-specific format)
        paymentStatus: v?.paymentStatus || "unpaid",
        amountPaid: v?.amountPaid || 0,
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
    try {
      const formValues = form.formData;
      const formRows: any[] = [];
      const expandedRows: string[] = [];
      saveTemporary(draftId, formRows as any, formValues as any, expandedRows, draftMeta);
    } catch (err) {
      console.error("autosave:error", err);
    }
  }, [saveTemporary, draftId, draftMeta, form.formData]);

  // Auto-save when debounced server compute is done and form is dirty
  useEffect(() => {
    if (!form.isDirty || isReadOnly) return;  
    saveDraft();
    // Only depend on data and id; saveTemporary is stable via selector
  }, [form.formData, form.isDirty, draftId, isReadOnly]);

  // Restore draft once after activities are ready
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    const hasActivities = Array.isArray(form.activities) && (form.activities as any).length > 0;
    if (!hasActivities) return;
    
    // Skip temporary restore in edit/readOnly mode when we have initial data - we want to load the saved execution data
    if ((mode === "edit" || mode === "readOnly") && initialData && Object.keys(initialData).length > 0) {
      restoredRef.current = true;
      return;
    }
    
    const save = restoreTemporary(draftId);
    if (save && save.formValues && Object.keys(save.formValues).length > 0) {
      // Merge to preserve schema-initialized keys; prefer saved values
      const merged = { ...form.formData, ...(save.formValues as any) } as any;
      form.setFormData(merged);
      restoredRef.current = true;
    } else {
      restoredRef.current = true;
    }
  }, [draftId, form.activities, restoreTemporary, mode, initialData]);
  // Render quarter sequence indicator
  // Requirements: 4.3
  const renderQuarterSequenceIndicator = () => {
    if (!quarterSequence) return null;

    return (
      <div className="rounded-lg p-0 mb-4">
        {/* <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-blue-900">Quarter Navigation:</span>
          <div className="flex items-center gap-1">
            {quarterSequence.previous && (
              <>
                <span className="text-blue-600">{quarterSequence.previous}</span>
                <span className="text-blue-400">→</span>
              </>
            )}
            <span className="font-bold text-blue-900 bg-blue-100 px-2 py-1 rounded">
              {quarterSequence.current}
            </span>
            {quarterSequence.next && (
              <>
                <span className="text-blue-400">→</span>
                <span className="text-blue-600">{quarterSequence.next}</span>
              </>
            )}
          </div>
          {previousQuarterBalances?.exists && (
            <span className="ml-4 text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
              ✓ Balances rolled over from {previousQuarterBalances.quarter}
            </span>
          )}
          {quarterSequence.isFirstQuarter && (
            <span className="ml-4 text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
              First quarter - starting fresh
            </span>
          )}
        </div> */}
      </div>
    );
  };

  // Extract current opening balances from form data
  // Requirements: 10.4, 11.6
  const currentOpeningBalances = useMemo<ClosingBalances>(() => {
    if (!form.activities) {
      return { D: {}, E: {} };
    }

    const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
    const balances: ClosingBalances = { D: {}, E: {} };

    // Extract Section D opening balances
    Object.keys(form.formData).forEach(code => {
      if (code.includes('_D_')) {
        const value = Number(form.formData[code]?.[quarterKey]) || 0;
        balances.D[code] = value;
      } else if (code.includes('_E_')) {
        const value = Number(form.formData[code]?.[quarterKey]) || 0;
        balances.E[code] = value;
      }
    });

    return balances;
  }, [form.formData, form.activities, quarter]);

  // Handle accepting recalculation changes
  // Requirements: 10.4
  const handleAcceptRecalculation = useCallback(() => {
    if (!previousQuarterBalances?.exists || !previousQuarterBalances.closingBalances) {
      return;
    }

    const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';

    console.group('🔍 [Q2 ROLLOVER DEBUG] Applying Previous Quarter Balances');
    console.log('Current Quarter:', quarter);
    console.log('Previous Quarter:', previousQuarterBalances.quarter);
    console.log('Previous Quarter Balances:', previousQuarterBalances);

    // Apply previous quarter closing balances as current opening balances
    // Section D
    console.group('Applying Section D Balances');
    const sectionDEntries = Object.entries(previousQuarterBalances.closingBalances.D || {});
    console.log(`Total Section D entries to apply: ${sectionDEntries.length}`);
    
    sectionDEntries.forEach(([code, value]) => {
      console.log(`  Setting ${code} = ${value}`);
      form.onFieldChange(code, value);
    });
    console.groupEnd();

    // Section E
    console.group('Applying Section E Balances');
    const sectionEEntries = Object.entries(previousQuarterBalances.closingBalances.E || {});
    console.log(`Total Section E entries to apply: ${sectionEEntries.length}`);
    
    sectionEEntries.forEach(([code, value]) => {
      console.log(`  Setting ${code} = ${value}`);
      form.onFieldChange(code, value);
    });
    console.groupEnd();

    // Verify what was actually set in formData
    console.group('Verification: Form Data After Rollover');
    const formDataKeys = Object.keys(form.formData);
    console.log(`Total form data keys: ${formDataKeys.length}`);
    
    const dKeys = formDataKeys.filter(k => k.includes('_D_'));
    console.log(`Section D keys in formData: ${dKeys.length}`);
    dKeys.forEach(key => {
      const value = form.formData[key];
      console.log(`  ${key}: q1=${value?.q1}, q2=${value?.q2}, q3=${value?.q3}, q4=${value?.q4}`);
    });
    
    const vatKeys = dKeys.filter(k => k.includes('_VAT_'));
    console.log(`VAT receivable keys in formData: ${vatKeys.length}`);
    vatKeys.forEach(key => {
      console.log(`  ${key}:`, form.formData[key]);
    });
    
    console.groupEnd();
    console.groupEnd();

    toast.success('Opening balances updated', {
      description: `Applied closing balances from ${previousQuarterBalances.quarter}`,
    });
  }, [previousQuarterBalances, quarter, form.onFieldChange]);

  // Handle reviewing manually
  // Requirements: 10.4
  const handleReviewManually = useCallback(() => {
    // Scroll to the first mismatch or show a modal with details
    // For now, just show a toast with guidance
    toast.info('Review opening balances', {
      description: 'Please review Section D and E opening balances and adjust them manually if needed.',
    });
  }, []);

  return (
    <ExecutionFormProvider value={{
      formData: form.formData,
      computedValues: form.computedValues,
      onFieldChange: isReadOnly ? () => {} : form.onFieldChange,
      onCommentChange: isReadOnly ? () => {} : form.onCommentChange,
      updateExpensePayment: isReadOnly ? () => {} : form.updateExpensePayment,
      updateVATExpense: isReadOnly ? () => {} : form.updateVATExpense,
      clearVAT: isReadOnly ? () => {} : form.clearVAT,
      clearPayable: isReadOnly ? () => {} : form.clearPayable,
      validationErrors: form.validationErrors,
      clientValidationErrors: form.clientValidationErrors,  // NEW: Client-side validation errors
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
      previousQuarterBalances: form.previousQuarterBalances,
      miscValidationError: null,
      otherReceivableCode: null,
    }}>
      <ExecutionActionsProvider
        value={{
          isSubmitting: form.status.isCalculating || form.status.isValidating,
          isDirty: isReadOnly ? false : form.isDirty,
          isValid: isReadOnly ? true : form.isValid,
          validationErrors: form.validationErrors,
          lastSaved: null,
          onSaveDraft: () => {
            if (isReadOnly) return;
            saveDraft();
          },
          onSubmit: async () => {
            try {
              if (isReadOnly) {
                return;
              }
              if (!(form.isValid && (form as any).canSubmitExecution)) return;
              const programParam = searchParams?.get("program");
              const programAsProjectId = programParam && /^\d+$/.test(programParam) ? Number(programParam) : null;
              const projectId = effectiveMode === "edit" ? (projectIdProp ?? 0) : (programAsProjectId ?? (Number(searchParams?.get("projectId") || 0) || 0));
              const facilityId = effectiveMode === "edit" ? (facilityIdProp ?? 0) : (Number(searchParams?.get("facilityId") || 0) || 0);
              const reportingPeriodId = effectiveMode === "edit"
                ? (reportingPeriodIdProp ?? (currentReportingPeriod?.id ?? 0))
                : (Number(searchParams?.get("reportingPeriodId") || currentReportingPeriod?.id || 0) || 0);
              const facilityName = effectiveMode === "edit" ? (facilityNameProp ?? "") : (searchParams?.get("facilityName") || "");
              const programParamEffective = effectiveMode === "edit" ? (programNameProp ?? projectType) : (searchParams?.get("program") || projectType);
              const schemaId = effectiveMode === "edit" ? (schemaIdProp ?? (form.schema as any)?.id ?? 0) : ((form.schema as any)?.id ?? 0);
              const activities = buildSubmissionActivities();
              if (!schemaId || !projectId || !facilityId || !reportingPeriodId || activities.length === 0) {
                toast.error("Missing required fields to submit execution", {
                  description: `schemaId=${schemaId} projectId=${projectId} facilityId=${facilityId} reportingPeriodId=${reportingPeriodId} activities=${activities.length}`,
                });
                return;
              }
              const json = {
                schemaId,
                projectId,
                facilityId,
                reportingPeriodId,
                formData: { activities, quarter },
                metadata: {
                  projectType,
                  facilityType,
                  quarter,
                  facilityName,
                  program: programParamEffective,
                  projectId,
                  facilityId,
                  reportingPeriodId,
                  source: "dynamic-execution-v2",
                },
              } as any;
              
              if (effectiveMode === "edit" && executionId) {
                const updateBody = { formData: { activities, quarter } } as any;
                const updated = await updateExecutionMutation.mutateAsync({ params: { id: executionId }, body: updateBody });
                
                // Extract cascade impact from response
                // Requirements: 8.5
                if (updated?.cascadeImpact && updated.cascadeImpact.status !== 'none') {
                  setCascadeImpact(updated.cascadeImpact);
                  setShowCascadeNotification(true);
                  
                  // Show toast for immediate feedback
                  toast.success('Quarter updated successfully', {
                    description: `${updated.cascadeImpact.affectedQuarters.length} ${updated.cascadeImpact.affectedQuarters.length === 1 ? 'quarter' : 'quarters'} affected`,
                  });
                }
              } else {
                const created = await createExecutionMutation.mutateAsync(json);
              }
              const facName = facilityName;
              const facType = searchParams?.get("facilityType") || facilityType;
              const programParam2 = programParamEffective;
              // router.push(`/dashboard/dynamic-execution?facilityName=${encodeURIComponent(facName)}&facilityType=${encodeURIComponent(String(facType))}&projectType=${encodeURIComponent(String(programParam2))}`);
              router.push(`/dashboard/execution`);
            } catch (err) {
              console.error("submit:execution:error", err);
              toast.error("Failed to submit execution", { description: String((err as any)?.message || err) });
            }
          },
          onCancel: () => {
            // navigate back if router available later
            console.log({ action: "cancelExecution" });
          },
        }}
      >
        <div className="space-y-4">
          {renderQuarterSequenceIndicator()}
          <CascadeImpactNotification
            cascadeImpact={cascadeImpact}
            currentQuarter={quarter}
            isVisible={showCascadeNotification}
            onDismiss={() => setShowCascadeNotification(false)}
            onViewQuarter={(targetQuarter) => {
              // Navigate to the affected quarter
              const currentParams = new URLSearchParams(searchParams?.toString() || '');
              currentParams.set('quarter', targetQuarter);
              router.push(`${window.location.pathname}?${currentParams.toString()}`);
            }}
          />
          <ReconciliationWarningBanner
            previousQuarterBalances={previousQuarterBalances}
            currentOpeningBalances={currentOpeningBalances}
            activities={form.activities || {}}
            onAcceptChanges={handleAcceptRecalculation}
            onReviewManually={handleReviewManually}
            isReadOnly={isReadOnly}
            projectType={projectType}
            facilityType={facilityType}
          />
          <ValidationErrorBanner />
          <ExecutionHeader />
          <ExecutionTable />
          {!isReadOnly ? (
              <FormActions
              module="execution"
              onSaveDraft={saveDraft}
                onSubmit={async () => {
                  if (isReadOnly) return;
                  if (createExecutionMutation.isPending) return;
                  if (!(form.isValid && (form as any).canSubmitExecution)) return;
                  const programParamRaw = searchParams?.get("program");
                  const programAsProjectId2 = programParamRaw && /^\d+$/.test(programParamRaw) ? Number(programParamRaw) : null;
                  const projectId = effectiveMode === "edit" ? (projectIdProp ?? 0) : (programAsProjectId2 ?? (Number(searchParams?.get("projectId") || 0) || 0));
                const facilityId = effectiveMode === "edit" ? (facilityIdProp ?? 0) : (Number(searchParams?.get("facilityId") || 0) || 0);
                  const reportingPeriodId = effectiveMode === "edit"
                    ? (reportingPeriodIdProp ?? (currentReportingPeriod?.id ?? 0))
                    : (Number(searchParams?.get("reportingPeriodId") || currentReportingPeriod?.id || 0) || 0);
                const facilityName = effectiveMode === "edit" ? (facilityNameProp ?? "") : (searchParams?.get("facilityName") || "");
                  const programParam3 = effectiveMode === "edit" ? (programNameProp ?? projectType) : (searchParams?.get("program") || projectType);
                const schemaId = effectiveMode === "edit" ? (schemaIdProp ?? (form.schema as any)?.id ?? 0) : ((form.schema as any)?.id ?? 0);
                const activities = buildSubmissionActivities();
                  if (!schemaId || !projectId || !facilityId || !reportingPeriodId || activities.length === 0) {
                    toast.error("Missing required fields to submit execution", {
                      description: `schemaId=${schemaId} projectId=${projectId} facilityId=${facilityId} reportingPeriodId=${reportingPeriodId} activities=${activities.length}`,
                    });
                    return;
                  }
                const json = {
                  schemaId,
                  projectId,
                  facilityId,
                  reportingPeriodId,
                  formData: { activities, quarter },
                  metadata: {
                    projectType,
                    facilityType,
                    quarter,
                    facilityName,
                    program: programParam3,
                    projectId,
                    facilityId,
                    reportingPeriodId,
                    source: "dynamic-execution-v2",
                  },
                } as any;
                if (effectiveMode === "edit" && executionId) {
                  const updateBody2 = { formData: { activities, quarter } } as any;
                  const updated2 = await updateExecutionMutation.mutateAsync({ params: { id: executionId }, body: updateBody2 });
                  
                  // Extract cascade impact from response
                  // Requirements: 8.5
                  if (updated2?.cascadeImpact && updated2.cascadeImpact.status !== 'none') {
                    setCascadeImpact(updated2.cascadeImpact);
                    setShowCascadeNotification(true);
                    
                    // Show toast for immediate feedback
                    toast.success('Quarter updated successfully', {
                      description: `${updated2.cascadeImpact.affectedQuarters.length} ${updated2.cascadeImpact.affectedQuarters.length === 1 ? 'quarter' : 'quarters'} affected`,
                    });
                  }
                } else {
                  const created2 = await createExecutionMutation.mutateAsync(json);
                }
                const facName = facilityName;
                const facType = searchParams?.get("facilityType") || facilityType;
                  const programParam4 = programParam3;
                router.push(`/dashboard/execution?facilityName=${encodeURIComponent(facName)}&facilityType=${encodeURIComponent(String(facType))}&projectType=${encodeURIComponent(String(programParam4))}`);
              }}
              onCancel={() => console.log({ action: "cancelClick" })}
              isSubmitting={createExecutionMutation.isPending || form.status.isCalculating || form.status.isValidating}
              isDirty={form.isDirty}
              isValid={form.isValid && (form as any).canCreateReport}
              validationErrors={form.validationErrors}
              submitLabel={effectiveMode === "edit" ? "Update Execution" : "Submit Execution"}
              showStatementButtons
              onGenerateStatement={() => console.log({ action: "generateStatement" })}
              onViewStatement={() => console.log({ action: "viewStatement" })}
              lastSaved={lastSavedIso ? new Date(lastSavedIso) : undefined}
            />
          ) : null}
        </div>
      </ExecutionActionsProvider>
    </ExecutionFormProvider>
  );
}

export default EnhancedExecutionForm;


