'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FormProvider, SubmitHandler } from 'react-hook-form';
import { toast } from 'sonner';

import {
  useTempSaveForPlanForm,
} from '@/features/planning/stores/plan-temp-save-store';
import {
  capturePlanState,
  restorePlanState,
  createPlanMetadata,
  formatSaveTime,
} from '@/features/planning/utils/plan-temp-save-utils';

import { PlanMetadataHeader } from './plan-metadata-header';
import { FormErrorSummary } from './form-error-summary';
import { PlanActivitiesTable } from './plan-activities-table';
import { PlanFormActions } from './plan-form-actions';
import { PlanMetadata } from '../types';
import { usePlanningForm, type PlanningFormData } from '@/hooks/use-planning-form';

interface PlanFormProps {
  isHospital?: boolean;
  initialActivities?: any[];
  isEdit?: boolean;
  isReadOnly?: boolean;
  planId?: string;
  // New identifiers and configuration
  projectId?: string;
  facilityId?: string;
  reportingPeriodId?: string;
  projectType?: 'HIV' | 'Malaria' | 'TB';
  facilityType?: 'hospital' | 'health_center';
  /**
   * Callback executed on successful submission.
   * The parent component is responsible for any navigation after submission.
   */
  onSubmitSuccess?: (plan: PlanningFormData) => void;
  onSuccess?: (plan: any) => void;
  onCancel?: () => void;
  metadata?: PlanMetadata;
  prefillActivities?: Record<string, any>;
}

/**
 * Renders a comprehensive form for creating and editing financial plans.
 * 
 * This component dynamically uses HIV, Malaria, or TB schemas based on the program
 * specified in the metadata. It uses `react-hook-form` with Zod schema validation.
 * 
 * @param {PlanFormProps} props - The props for the component.
 */
export function PlanForm({ 
  isHospital = false, 
  initialActivities,
  isEdit = false,
  isReadOnly = false,
  planId,
  onSubmitSuccess,
  onSuccess,
  onCancel,
  projectId,
  facilityId,
  reportingPeriodId,
  projectType,
  facilityType,
  metadata = {}
  , prefillActivities
}: PlanFormProps) {
  const [isDirty, setIsDirty] = useState(false);
  const [isTempSaving, setIsTempSaving] = useState(false);
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);

  // Build metadata for temp save
  const planTempMetadata = useMemo(() =>
    createPlanMetadata({
      facilityName: metadata?.facilityName,
      facilityType: (facilityType ?? metadata?.facilityType) as any,
      programName: (projectType ?? metadata?.program) as any,
    }),
  [metadata, projectType, facilityType]);

  // Header metadata should reflect current selection/params
  const headerMetadata: PlanMetadata = useMemo(() => ({
    program: (projectType ?? metadata?.program) as any,
    facilityName: metadata?.facilityName,
    facilityType: (facilityType ?? metadata?.facilityType) as any,
  }), [projectType, facilityType, metadata]);

  

  const {
    saveTemporary,
    restoreTemporary,
    hasSave,
    save: existingSave,
    lastSaved,
    removeTemporary,
  } = useTempSaveForPlanForm(planTempMetadata);

  // form-dependent hooks will be defined after form is available (below).

  // Determine which program to use based on metadata
  const effectiveProgram = (projectType ?? metadata.program) as string | undefined;
  const programLower = effectiveProgram?.toLowerCase();
  const isHIVProgram = programLower?.includes('hiv') || !effectiveProgram; // Default to HIV if no program specified
  const isMalariaProgram = programLower?.includes('malaria') || programLower === 'mal';
  const isTBProgram = programLower?.includes('tb') || programLower?.includes('tuberculosis');
  
  // Use the appropriate hook based on program
  // If project-driven props are provided, prefer the consolidated planning hook
  const shouldUsePlanningHook = Boolean(projectId && facilityId);
  const hookProgram: 'HIV' | 'Malaria' | 'TB' | undefined = (projectType as any) ?? (metadata.program as any);
  const hookFacilityType: 'hospital' | 'health_center' | undefined = (facilityType as any) ?? (metadata.facilityType as any);
  const stableParams = useMemo(() => ({
    projectId: projectId ? String(projectId) : undefined,
    facilityId: facilityId ? String(facilityId) : undefined,
    reportingPeriodId: reportingPeriodId ? String(reportingPeriodId) : undefined,
    projectType: hookProgram,
    facilityType: hookFacilityType,
    isEdit,
    isReadOnly,
    prefillActivities,
  }), [projectId, facilityId, reportingPeriodId, hookProgram, hookFacilityType, isEdit, isReadOnly, prefillActivities]);
  
  const planningHook = usePlanningForm({
    ...stableParams,
    enabled: shouldUsePlanningHook && Boolean(hookProgram) && Boolean(hookFacilityType),
  });

  // Legacy program-specific hooks removed in favor of schema-driven hook
  // Initialize adapter variables for existing table contracts
  let form: any;
  let activities: any;
  let activityCategories: Record<string, any[]> = {};
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  let toggleCategory: (category: string) => void = () => {};
  let categorizedActivities: Record<string, any[]> = {};
  let getActivityIndex: (activity: any) => number = () => -1;
  let categoryTotals: Record<string, any> = {};

  // Initialize expanded categories when categorizedActivities becomes available
  useEffect(() => {
    if (!planningHook) return;
    // Initialize only once or when there are no tracked categories
    if (Object.keys(expandedCategories).length > 0) return;
    const categories = Object.keys(planningHook.categorizedActivities);
    const defaultExpanded = categories.reduce((acc: Record<string, boolean>, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setExpandedCategories(defaultExpanded);
  }, [planningHook?.categorizedActivities, expandedCategories]);

  if (planningHook) {
    toggleCategory = (category: string) => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));

    // Build entry descriptors per category to drive rows
    const activityEntriesByCategory: Record<string, { activity: string; typeOfActivity: string; id: string }[]> = {};
    const activityIdOrder: string[] = [];

    

    planningHook.activities.forEach((a: any) => {
      const cat = a.categoryName;
      if (!activityEntriesByCategory[cat]) activityEntriesByCategory[cat] = [];
      activityEntriesByCategory[cat].push({ activity: a.name, typeOfActivity: a.name, id: String(a.id) });
      activityIdOrder.push(String(a.id));
    });

    // Map to existing table contracts
    activityCategories = Object.keys(activityEntriesByCategory).reduce((acc: Record<string, any[]>, key) => {
      acc[key] = activityEntriesByCategory[key].map(e => ({ activity: e.activity, typeOfActivity: e.typeOfActivity }));
      return acc;
    }, {} as Record<string, any[]>);

    categorizedActivities = Object.keys(activityEntriesByCategory).reduce((acc: Record<string, any[]>, key) => {
      acc[key] = activityEntriesByCategory[key].map(e => ({
        activityCategory: key,
        typeOfActivity: e.typeOfActivity,
        activity: e.activity,
      }));
      return acc;
    }, {} as Record<string, any[]>);

    // Category totals mapping
    categoryTotals = Object.keys(planningHook.categoryTotals).reduce((acc: Record<string, any>, key) => {
      const t = (planningHook.categoryTotals as any)[key];
      acc[key] = {
        amountQ1: t.q1_amount,
        amountQ2: t.q2_amount,
        amountQ3: t.q3_amount,
        amountQ4: t.q4_amount,
        totalBudget: t.total_budget,
      };
      return acc;
    }, {} as Record<string, any>);

    // General totals activity array for footer computations
    const totals = Object.values(planningHook.categoryTotals);
    const sum = (k: 'q1_amount' | 'q2_amount' | 'q3_amount' | 'q4_amount') => totals.reduce((s: number, t: any) => s + (t[k] || 0), 0);
    activities = [{
      amountQ1: sum('q1_amount'),
      amountQ2: sum('q2_amount'),
      amountQ3: sum('q3_amount'),
      amountQ4: sum('q4_amount'),
    }];

    // Index mapping for rows
    const entryKeyToIndex: Record<string, number> = {};
    activityIdOrder.forEach((id, idx) => { entryKeyToIndex[id] = idx; });
    getActivityIndex = (activity: any) => {
      const found = planningHook.activities.find(a => (a.name === activity.typeOfActivity) || (a.name === activity.activity));
      return found ? entryKeyToIndex[String(found.id)] : -1;
    };

    // Form adapter to map index-based fields to id-keyed fields (memoized to stabilize identity)
    const underlying = planningHook.form as any;
    const adapted = useMemo(() => {
      const indexToId = (index: number): string => activityIdOrder[index];
      const mapField = (index: number, name: string): string => {
        const id = indexToId(index);
        switch (name) {
          case 'unitCost': return `activities.${id}.unit_cost`;
          case 'countQ1': return `activities.${id}.q1_count`;
          case 'countQ2': return `activities.${id}.q2_count`;
          case 'countQ3': return `activities.${id}.q3_count`;
          case 'countQ4': return `activities.${id}.q4_count`;
          case 'frequency': return `activities.${id}.frequency`;
          case 'comment': return `activities.${id}.comments`;
          case 'amountQ1': return `activities.${id}.amountQ1`;
          case 'amountQ2': return `activities.${id}.amountQ2`;
          case 'amountQ3': return `activities.${id}.amountQ3`;
          case 'amountQ4': return `activities.${id}.amountQ4`;
          case 'totalBudget': return `activities.${id}.totalBudget`;
          default: return `activities.${id}.${name}`;
        }
      };

      return {
        ...underlying,
        register: (fieldPath: string, options?: any) => {
          const match = fieldPath.match(/^activities\.(\d+)\.(.+)$/);
          if (match) {
            const [, idxStr, name] = match;
            const idx = Number(idxStr);
            const isNumeric = name !== 'comment';
            const merged = options ?? (isNumeric
              ? {
                  valueAsNumber: true,
                  setValueAs: (v: any) => (v === '' || v == null ? 0 : Number(v)),
                }
              : undefined);
            return underlying.register(mapField(idx, name), merged);
          }
          return underlying.register(fieldPath, options);
        },
        watch: (name?: any, defaultValue?: any) => {
          if (typeof name === 'string') {
            const match = name.match(/^activities\.(\d+)\.(.+)$/);
            if (match) {
              const [, idxStr, fname] = match;
              const idx = Number(idxStr);
              return underlying.watch(mapField(idx, fname), defaultValue);
            }
          }
          return underlying.watch(name, defaultValue);
        },
        setValue: (field: string, value: any, options?: any) => {
          const match = field.match(/^activities\.(\d+)\.(.+)$/);
          if (match) {
            const [, idxStr, fname] = match;
            const idx = Number(idxStr);
            return underlying.setValue(mapField(idx, fname), value, options);
          }
          return underlying.setValue(field, value, options);
        },
        formState: underlying.formState,
      } as any;
    }, [underlying, activityIdOrder.join(',')]);

    form = adapted;
  }

  // Guard against uninitialized form
  if (!planningHook) return null;

  const isSubmitting = planningHook?.isSubmitting ?? false;
  const { handleSubmit, formState: { errors } } = form;
  
  const onSubmit: SubmitHandler<PlanningFormData> = async (data) => {
    if (isReadOnly) return;

    // If parent supplied its own handler, use it and skip the legacy submitPlan
    if (onSubmitSuccess || onSuccess) {
      try {
        await (onSubmitSuccess ?? onSuccess)?.(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        toast.error(errorMessage);
        console.error("[PlanForm] parent onSuccess threw", error)
      }
      return;
    }

    // Consolidated hook submit
    try {
      if (planningHook) {
        const results = await planningHook.handleSubmit(planningHook.form.getValues());
        return results;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast.error(errorMessage);
    }
  };

  // ---------------- Temp Save & Dirty Tracking ----------------

  // Track dirty state when form values change
  useEffect(() => {
    if (!form) return;
    
    const subscription = form.watch((value: any, { name, type }: { name?: string; type?: string }) => {
      if (type === 'change') {
        setIsDirty(true);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  // Show restore banner if draft exists
  useEffect(() => {
    if (hasSave) {
      setShowRestoreBanner(true);
    }
  }, [hasSave]);

  // Save draft handler
  const handleTempSave = useCallback(() => {
    if (!planTempMetadata) return;
    setIsTempSaving(true);
    try {
      const planData = capturePlanState(form as any);
      saveTemporary(planData as any);
      setIsDirty(false);
      toast.success('Draft saved');
    } catch (err) {
      toast.error('Failed to save draft');
    } finally {
      setIsTempSaving(false);
    }
  }, [planTempMetadata, form, saveTemporary]);

  // Restore draft handler
  const handleRestoreDraft = useCallback(() => {
    const saved = restoreTemporary();
    if (saved) {
      restorePlanState(saved as any, form as any);
      toast.success('Draft restored');
      setShowRestoreBanner(false);
      setIsDirty(false);
    }
  }, [restoreTemporary, form]);


  return (
    <FormProvider {...(form as any)}>
      {(!isReadOnly) && showRestoreBanner && existingSave && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-blue-900 font-medium">Draft Available</p>
              <p className="text-sm text-blue-700">Saved {formatSaveTime(existingSave.timestamps.lastSaved)}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-sm text-blue-700 hover:underline"
                onClick={handleRestoreDraft}
              >
                Restore
              </button>
              <button
                type="button"
                className="text-sm text-gray-600 hover:underline"
                onClick={() => {
                  removeTemporary();
                  setShowRestoreBanner(false);
                }}
              >
                Discard
              </button>
              <button
                type="button"
                className="text-sm hover:underline"
                onClick={() => setShowRestoreBanner(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit, () => {
          toast.error('Please fix validation errors before saving')
        })}
        className="space-y-4"
      >
        <div className="flex justify-between items-center bg-gray-100 border-1 border-gray-200 rounded-md p-2">
            <PlanMetadataHeader {...headerMetadata} />
            <PlanFormActions 
              isSubmitting={isSubmitting}
              isEdit={isEdit}
              isReadOnly={isReadOnly}
              onTempSave={planTempMetadata ? handleTempSave : undefined}
              isTempSaving={isTempSaving}
              canTempSave={isDirty && !isTempSaving}
              onCancel={onCancel}
            />
        </div>
        
        <div className="px-4">
            <FormErrorSummary errors={errors} />
        </div>

        
        <PlanActivitiesTable
          form={form as any}
          activitiesData={{
            activities,
            activityCategories,
            categorizedActivities,
            categoryTotals,
            expandedCategories
          }}
          getActivityIndex={getActivityIndex}
          toggleCategory={toggleCategory}
          isReadOnly={isReadOnly}
          program={effectiveProgram}
        />
        
        <div className="flex justify-end text-sm text-gray-500 px-4">
            <span className="font-semibold">Note:</span> All fields are required. Budget totals must match annual allocations.
        </div>
        
      </form>
    </FormProvider>
  );
} 