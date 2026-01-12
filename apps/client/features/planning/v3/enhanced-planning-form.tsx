"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  Save,
  Send,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  History,
  ChevronDown
} from 'lucide-react';

import {
  usePlanningForm,
  useCreatePlanning,
  useUpdatePlanning,
  usePlanningDetail,
  usePlanningDataSummary
} from '@/hooks/queries';

import {
  transformActivitiesToCategories,
  formatCurrency,
  PlanningStorage,
  exportPlanningData,
  handleApiError,
  prepareFormDataForSubmission
} from '@/lib/planning';

import dynamic from 'next/dynamic';
import { PlanningFormProvider } from './planning-form-context';

const EnhancedCategorySection = dynamic(
  () => import('./enhanced-category-section').then((mod) => ({ default: mod.EnhancedCategorySection })),
  {
    loading: () => (
      <div className="space-y-4 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-24 bg-gray-200 rounded" />
        </div>
      </div>
    ),
  }
);

const EnhancedFormActions = dynamic(
  () => import('./enhanced-form-actions').then((mod) => ({ default: mod.EnhancedFormActions })),
  { ssr: false }
);

interface EnhancedPlanningFormProps {
  mode: 'create' | 'edit' | 'view';
  planningId?: string;
  projectId: number;
  facilityId: number;
  reportingPeriodId?: number;
  onSuccess?: (data: any) => void;
  onCancel?: () => void;
  // Props from facility filter dialog
  facilityName?: string;
  program?: string;
  facilityType?: string;
  // Whether to show the header section (default: true for backward compatibility)
  showHeader?: boolean;
  // Readonly mode: disables inputs and hides actions
  readOnly?: boolean;
  // Callback for unsaved changes detection
  onUnsavedChanges?: (hasChanges: boolean) => void;
}

export const EnhancedPlanningForm: React.FC<EnhancedPlanningFormProps> = ({
  mode,
  planningId,
  projectId,
  facilityId,
  reportingPeriodId,
  onSuccess,
  onCancel,
  facilityName,
  program,
  facilityType: propFacilityType,
  showHeader = true,
  readOnly = false,
  onUnsavedChanges
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Derive readonly from mode or explicit prop
  const isReadOnly = mode === 'view' || readOnly;

  // Form state - use props if available, otherwise extract from existing data or defaults
  const [projectType, setProjectType] = useState<'HIV' | 'TB' | 'Malaria'>(
    (program as 'HIV' | 'TB' | 'Malaria') || 'HIV'
  );
  const [facilityType, setFacilityType] = useState<'hospital' | 'health_center'>(
    (propFacilityType as 'hospital' | 'health_center') || 'hospital'
  );
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Load existing data for edit and view modes
  const { data: existingData, isLoading: isLoadingExisting } = usePlanningDetail(
    (mode === 'edit' || mode === 'view') ? planningId! : null
  );

  // Extract project type and facility type from existing data in edit or view mode
  useEffect(() => {
    if ((mode === 'edit' || mode === 'view') && existingData && !program && !propFacilityType) {

      // Extract from metadata or schema
      const projectTypeFromData = existingData.metadata?.projectType || existingData.schema?.projectType;
      const facilityTypeFromData = existingData.metadata?.facilityType || existingData.schema?.facilityType;

      if (projectTypeFromData) {
        setProjectType(projectTypeFromData as 'HIV' | 'TB' | 'Malaria');
      }
      if (facilityTypeFromData) {
        setFacilityType(facilityTypeFromData as 'hospital' | 'health_center');
      }
    }
  }, [mode, existingData, program, propFacilityType]);

  // Helper function to construct storage key with reportingPeriodId
  const getStorageKey = useCallback(() => {
    const periodId = reportingPeriodId ?? 1;
    if (!reportingPeriodId) {
      console.warn('reportingPeriodId is undefined, defaulting to 1');
    }
    return `${projectType}_${facilityType}_${projectId}_${facilityId}_${periodId}`;
  }, [projectType, facilityType, projectId, facilityId, reportingPeriodId]);

  // Initialize form with existing data or defaults
  const initialData = useMemo(() => {
    if ((mode === 'edit' || mode === 'view') && existingData) {
      const formData = existingData.formData?.activities || {};
      return formData;
    }

    // Try new key format first
    const newStorageKey = getStorageKey();
    let data = PlanningStorage.loadDraft(newStorageKey) || PlanningStorage.loadAutoSave(newStorageKey);

    // Backward compatibility: try old key format if no data found
    if (!data || Object.keys(data).length === 0) {
      const oldStorageKey = `${projectType}_${facilityType}_${projectId}_${facilityId}`;
      data = PlanningStorage.loadDraft(oldStorageKey) || PlanningStorage.loadAutoSave(oldStorageKey);

      // Migrate old data to new key format
      if (data && Object.keys(data).length > 0) {
        console.log('Migrating draft data to new storage key format');
        PlanningStorage.saveDraft(newStorageKey, data);
        PlanningStorage.removeDraft(oldStorageKey);
        // Also remove old auto-save if it exists
        localStorage.removeItem(`planning_autosave_${oldStorageKey}`);
      }
    }

    return data || {};
  }, [mode, existingData, projectType, facilityType, projectId, facilityId, reportingPeriodId, getStorageKey]);

  // Create a key to force re-render when data changes
  const formKey = useMemo(() => {
    return `${mode}-${planningId}-${projectType}-${facilityType}-${JSON.stringify(initialData)}`;
  }, [mode, planningId, projectType, facilityType, initialData]);

  // Main planning form hook - only initialize when we have the correct project type and facility type
  const planningFormResult = usePlanningForm({
    projectType,
    facilityType,
    initialData
  });


  const {
    form,
    formData: hookFormData,
    activities,
    schema: formSchema,
    isLoading,
    error,
    handleFieldChange: hookHandleFieldChange,
  } = planningFormResult;

  // Extract form data from hook
  const formData = hookFormData || {};


  // Use watched values directly for calculations - this ensures real-time updates
  const effectiveFormData = formData;

  // Calculate individual activity calculations
  const calculations = useMemo(() => {
    const calc: Record<string, any> = {};

    if (activities && formData) {
      activities.forEach((activity: any) => {
        const activityData = formData[activity.id.toString()];
        if (activityData) {
          const toNum = (v: any, d = 0) => {
            const n = typeof v === 'string' ? parseFloat(v.replace(/[,$\s]/g, '')) : v;
            return Number.isFinite(n) ? Number(n) : d;
          };
          const unitCost = toNum(activityData.unit_cost, 0);
          const frequency = toNum(activityData.frequency, 1);
          const q1Count = toNum(activityData.q1_count, 0);
          const q2Count = toNum(activityData.q2_count, 0);
          const q3Count = toNum(activityData.q3_count, 0);
          const q4Count = toNum(activityData.q4_count, 0);

          const q1Amount = frequency * unitCost * q1Count;
          const q2Amount = frequency * unitCost * q2Count;
          const q3Amount = frequency * unitCost * q3Count;
          const q4Amount = frequency * unitCost * q4Count;
          const totalAmount = q1Amount + q2Amount + q3Amount + q4Amount;

          calc[activity.id.toString()] = {
            q1Amount,
            q2Amount,
            q3Amount,
            q4Amount,
            totalAmount
          };
        }
      });
    }

    return calc;
  }, [activities, formData]);

  // Mock validation and calculation states for compatibility
  const validationErrors = {};
  const isValidating = false;
  const validateForm = async () => ({ isValid: true, errors: {} });
  const isCalculating = false;
  const isDirty = form?.formState?.isDirty || false;
  const isValid = true;
  const reset = () => form?.reset();

  // Mutations
  const createMutation = useCreatePlanning();
  const updateMutation = useUpdatePlanning({
    onSuccess: (data) => {
      const storageKey = getStorageKey();
      PlanningStorage.removeDraft(storageKey);
      setHasUnsavedChanges(false);
      onSuccess?.(data);
    }
  });

  // Transform activities into categories
  const categories = useMemo(() => {
    if (!activities) return [];
    return transformActivitiesToCategories(activities);
  }, [activities]);

  // Initialize expanded categories
  useEffect(() => {
    const defaultExpanded = categories.reduce((acc, category) => {
      acc[category.id] = true;
      return acc;
    }, {} as Record<number, boolean>);
    setExpandedCategories(defaultExpanded);
  }, [categories]);

  // Notify parent of unsaved changes
  useEffect(() => {
    onUnsavedChanges?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChanges]);

  // Enhanced field change handler with validation
  const handleFieldChange = useCallback(async (activityId: string, fieldKey: string, value: any) => {
    try {
      // Use the hook's handleFieldChange to ensure state updates
      hookHandleFieldChange(activityId, fieldKey, value);

      // Field change logged for debugging

      setHasUnsavedChanges(true);
      // Auto-save every 30 seconds of inactivity
      const storageKey = getStorageKey();
      const currentFormData = formData || {};
      PlanningStorage.autoSave(storageKey, currentFormData);
      setAutoSaveStatus('saved');

      // Validate specific field if needed
      if (fieldKey === 'unit_cost' && typeof value === 'string') {
        const numericValue = parseFloat(value.replace(/[,$\s]/g, ''));
        if (numericValue < 0) {
          toast.error('Unit cost cannot be negative');
          return;
        }
      }
    } catch (error) {
      const planningError = handleApiError(error);
      toast.error(planningError.message);
    }
  }, [hookHandleFieldChange, projectType, facilityType, projectId, facilityId, reportingPeriodId, formData, getStorageKey]);

  // Calculate grand totals
  const grandTotals = useMemo(() => {
    if (!categories) {
      return {
        q1Amount: 0,
        q2Amount: 0,
        q3Amount: 0,
        q4Amount: 0,
        totalAmount: 0
      };
    }

    const result = categories.reduce((totals, category) => {
      if (category?.activities) {
        category.activities.forEach(activity => {
          if (activity?.id) {
            const activityData = formData[activity.id.toString()];

            if (activityData) {
              const toNum = (v: any, d = 0) => {
                const n = typeof v === 'string' ? parseFloat(v.replace(/[,$\s]/g, '')) : v;
                return Number.isFinite(n) ? Number(n) : d;
              };
              const unitCost = toNum(activityData.unit_cost, 0);
              const frequency = toNum(activityData.frequency, 1);
              const q1Count = toNum(activityData.q1_count, 0);
              const q2Count = toNum(activityData.q2_count, 0);
              const q3Count = toNum(activityData.q3_count, 0);
              const q4Count = toNum(activityData.q4_count, 0);

              const q1Amount = frequency * unitCost * q1Count;
              const q2Amount = frequency * unitCost * q2Count;
              const q3Amount = frequency * unitCost * q3Count;
              const q4Amount = frequency * unitCost * q4Count;
              const totalAmount = q1Amount + q2Amount + q3Amount + q4Amount;

              totals.q1Amount += q1Amount;
              totals.q2Amount += q2Amount;
              totals.q3Amount += q3Amount;
              totals.q4Amount += q4Amount;
              totals.totalAmount += totalAmount;
            }
          }
        });
      }
      return totals;
    }, {
      q1Amount: 0,
      q2Amount: 0,
      q3Amount: 0,
      q4Amount: 0,
      totalAmount: 0
    });

    return result;
  }, [categories, formData]);

  // Toggle category expansion
  const toggleCategory = useCallback((categoryId: number) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  }, []);

  // Save draft
  const handleSaveDraft = useCallback(async () => {
    try {
      const storageKey = getStorageKey();
      PlanningStorage.saveDraft(storageKey, formData);
      toast.success('Draft saved successfully');
      setHasUnsavedChanges(false);
    } catch (error) {
      toast.error('Failed to save draft');
    }
  }, [formData, projectType, facilityType, projectId, facilityId, reportingPeriodId, getStorageKey]);

  // Submit form
  const handleSubmit = useCallback(async () => {

    try {
      const validation = await validateForm();

      if (!validation.isValid) {
        toast.error('Please fix validation errors before submitting');
        return;
      }

      // Check if we have form schema
      if (!formSchema?.id) {
        toast.error('Form schema not loaded. Please refresh the page.');
        return;
      }

      // Check if we have form data
      if (!formData || Object.keys(formData).length === 0) {
        toast.error('No data to submit. Please fill in some activities.');
        return;
      }

      // Determine operation type for proper messaging
      const operationType = mode === 'create' ? 'Creating' : 'Updating';
      
      // Prepare data for submission with progress feedback
      const toastId = toast.loading(`${operationType} planning data... 0%`);
      const activityIds = Object.keys(formData || {});
      const totalRows = activityIds.length || 1;
      const normalizedActivities: Record<string, any> = {};

      activityIds.forEach((id, i) => {
        const a: any = (formData as any)[id] || {};
        const toNum = (v: any, d = 0) => {
          const n = typeof v === 'string' ? parseFloat(v.replace(/[,$\s]/g, '')) : v;
          return Number.isFinite(n) ? Number(n) : d;
        };
        const unit_cost = toNum(a.unit_cost ?? a.unitCost, 0);
        const frequency = toNum(a.frequency, 1);
        const q1_count = toNum(a.q1_count ?? a.q1Count, 0);
        const q2_count = toNum(a.q2_count ?? a.q2Count, 0);
        const q3_count = toNum(a.q3_count ?? a.q3Count, 0);
        const q4_count = toNum(a.q4_count ?? a.q4Count, 0);
        const comments = (a.comments ?? '').toString().trim();

        normalizedActivities[id] = {
          frequency,
          unit_cost,
          q1_count,
          q2_count,
          q3_count,
          q4_count,
          comments,
        };

        const percent = Math.round(((i + 1) / totalRows) * 100);
        toast.loading(`${operationType} planning data... ${percent}%`, {
          id: toastId,
          description: `Processing activity ${i + 1} of ${totalRows}`
        });
      });

      const submissionData = { activities: normalizedActivities } as any;

      if (mode === 'create') {
        const result = await createMutation.mutateAsync({
          schemaId: formSchema.id,
          projectId,
          facilityId,
          reportingPeriodId,
          formData: submissionData,
          metadata: {
            projectType,
            facilityType,
            submittedAt: new Date().toISOString()
          }
        });
        
        // Synchronize data before redirect - invalidate both query keys
        await queryClient.invalidateQueries({ queryKey: ['planning', 'list'] });
        await queryClient.invalidateQueries({ queryKey: ['planning-activities'] });
        
        // Wait for refetch to complete to ensure data is synchronized
        try {
          await queryClient.refetchQueries({ 
            queryKey: ['planning', 'list'],
            type: 'active'
          });
          await queryClient.refetchQueries({ 
            queryKey: ['planning-activities'],
            type: 'active'
          });
        } catch (refetchError) {
          // Log warning but still proceed - data will load on page
          console.warn('Refetch failed, but proceeding with redirect:', refetchError);
        }
        
        // Show success toast AFTER loading completes
        toast.success('Planning data created successfully!', { id: toastId });
        
        // Call success callback
        onSuccess?.(result);
        
        // Redirect after a brief delay to ensure success toast is visible
        setTimeout(() => {
          router.push('/dashboard/planning');
        }, 500);
        
      } else {
        const result = await updateMutation.mutateAsync({
          id: planningId!,
          data: {
            formData: submissionData,
            reportingPeriodId,
            metadata: {
              projectType,
              facilityType,
              updatedAt: new Date().toISOString()
            }
          }
        });
        
        // Synchronize data before redirect - invalidate both query keys
        await queryClient.invalidateQueries({ queryKey: ['planning', 'list'] });
        await queryClient.invalidateQueries({ queryKey: ['planning-activities'] });
        
        // Wait for refetch to complete to ensure data is synchronized
        try {
          await queryClient.refetchQueries({ 
            queryKey: ['planning', 'list'],
            type: 'active'
          });
          await queryClient.refetchQueries({ 
            queryKey: ['planning-activities'],
            type: 'active'
          });
        } catch (refetchError) {
          // Log warning but still proceed - data will load on page
          console.warn('Refetch failed, but proceeding with redirect:', refetchError);
        }
        
        // Show success toast AFTER loading completes
        toast.success('Planning data updated successfully!', { id: toastId });
        
        // Call success callback
        onSuccess?.(result);
        
        // Redirect after a brief delay to ensure success toast is visible
        setTimeout(() => {
          router.push('/dashboard/planning');
        }, 500);
      }
    } catch (error) {
      console.error('❌ Submit error:', error);
      const planningError = handleApiError(error);
      
      // Show descriptive error message from handleApiError
      toast.error(planningError.message, {
        description: planningError.code !== 'UNKNOWN_ERROR' 
          ? `Error code: ${planningError.code}` 
          : undefined,
        duration: 5000,
      });
      
      // User stays on form page to retry - no redirect on error
    }
  }, [
    validateForm,
    formData,
    mode,
    formSchema,
    projectId,
    facilityId,
    reportingPeriodId,
    projectType,
    facilityType,
    createMutation,
    updateMutation,
    planningId,
    queryClient,
    onSuccess,
    router
  ]);

  // Export data
  const handleExport = useCallback(() => {
    if (!activities || !formData) return;

    const exportData = [{
      id: mode === 'edit' ? parseInt(planningId!) : 0,
      schemaId: formSchema?.id || 0,
      projectId,
      facilityId,
      reportingPeriodId,
      formData: { activities: formData },
      computedValues: calculations,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }];

    exportPlanningData(exportData as any, activities, {
      format: 'csv',
      includeCalculations: true,
      filename: `planning-${projectType}-${facilityType}-${Date.now()}`
    });
  }, [activities, formData, calculations, mode, planningId, formSchema, projectId, facilityId, reportingPeriodId, projectType, facilityType]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmed) return;
    }

    const storageKey = getStorageKey();
    PlanningStorage.removeDraft(storageKey);

    onCancel?.();
    router.back();
  }, [hasUnsavedChanges, projectType, facilityType, projectId, facilityId, reportingPeriodId, onCancel, router, getStorageKey]);

  // Loading states
  if (isLoading || ((mode === 'edit' || mode === 'view') && isLoadingExisting)) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading planning form...</p>
        </CardContent>
      </Card>
    );
  }
  // Error states
  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{typeof error === 'string' ? error : 'An error occurred'}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }


  return (
    <PlanningFormProvider
      key={formKey}
      value={{
        formData: formData,
        calculations,
        handleFieldChange,
        validationErrors,
        isCalculating,
        isValidating
      }}
    >
      <div>
        {/* Header - only show if showHeader is true */}
        {showHeader && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {mode === 'create' ? 'Create Planning Data' : 'Edit Planning Data'}
                    {hasUnsavedChanges && (
                      <Badge variant="outline" className="text-amber-600">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Unsaved Changes
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">{projectType}</Badge>
                    <Badge variant="secondary">
                      {facilityType === 'health_center' ? 'Health Center' : 'Hospital'}
                    </Badge>
                    {facilityName && (
                      <Badge variant="outline">
                        {facilityName}
                      </Badge>
                    )}
                    {formSchema && (
                      <Badge variant="outline">
                        Schema: {formSchema.name} v{formSchema.version}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {autoSaveStatus === 'saved' && (
                    <div className="flex items-center text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Auto-saved
                    </div>
                  )}
                  {autoSaveStatus === 'saving' && (
                    <div className="flex items-center text-blue-600 text-sm">
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Saving...
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            {/* Only show editable filters in create mode */}
            {mode === 'create' && (
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project Type</Label>
                    <Select
                      value={projectType}
                      onValueChange={(value: any) => setProjectType(value)}
                      disabled={!!program || isReadOnly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HIV">HIV</SelectItem>
                        <SelectItem value="TB">TB</SelectItem>
                        <SelectItem value="Malaria">Malaria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Facility Type</Label>
                    <Select
                      value={facilityType}
                      onValueChange={(value: any) => setFacilityType(value)}
                      disabled={!!propFacilityType || isReadOnly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hospital">Hospital</SelectItem>
                        <SelectItem value="health_center">Health Center</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Validation Alerts */}
        {validationErrors && Object.keys(validationErrors).length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold">Please fix the following errors:</p>
                <ul className="list-disc list-inside space-y-1">
                  {Object.entries(validationErrors).map(([field, errors]) => (
                    <li key={field} className="text-sm">
                      {field}: {Array.isArray(errors) ? errors.join(', ') : String(errors)}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Activities Table */}
        <Card className='p-0 mt-4'>
          <CardHeader className=''>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {formSchema?.schema?.title || 'Planning Activities'}
                <Badge variant="outline">{categories.length} categories</Badge>
                {isCalculating && (
                  <div className="flex items-center text-blue-600">
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    <span className="text-sm">Calculating...</span>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={!activities || !formData || Object.keys(formData).length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardTitle>
          </CardHeader>

          <CardContent className="">
            <div className="overflow-x-auto">
              <table className={`w-full ${isReadOnly ? 'pointer-events-none opacity-95' : ''}`}>
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left text-sm font-semibold text-gray-900 sticky left-0 bg-gray-50 border-r min-w-[300px]">
                      Activity Category
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-24">
                      Frequency
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-32">
                      Unit Cost (RWF)
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-24">
                      Q1 Count
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-24">
                      Q2 Count
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-24">
                      Q3 Count
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-24">
                      Q4 Count
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-32">
                      Q1 Amount
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-32">
                      Q2 Amount
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-32">
                      Q3 Amount
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-32">
                      Q4 Amount
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 w-36">
                      Total Budget
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 min-w-[200px]">
                      Comments
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(category => (
                    <EnhancedCategorySection
                      key={category.id}
                      category={category}
                      isExpanded={expandedCategories[category.id]}
                      onToggle={() => toggleCategory(category.id)}
                    />
                  ))}

                  {/* Grand Total Row */}
                  <tr className="bg-blue-50 border-double border-t-4 border-blue-300 font-bold text-[14px] bg-blue-100">
                    <td className="ml-4 text-blue-900 sticky left-0 bg-blue-80 border-r">
                      <span className="ml-12">GRAND TOTAL</span>
                    </td>
                    <td className="p-2 text-center">-</td>
                    <td className="p-2 text-center">-</td>
                    <td className="p-2 text-center">-</td>
                    <td className="p-2 text-center">-</td>
                    <td className="p-2 text-center">-</td>
                    <td className="p-2 text-center">-</td>
                    <td className="p-2 text-center font-semibold text-blue-900">
                      {formatCurrency(grandTotals.q1Amount)}
                    </td>
                    <td className="p-2 text-center font-semibold text-blue-900">
                      {formatCurrency(grandTotals.q2Amount)}
                    </td>
                    <td className="p-2 text-center font-semibold text-blue-900">
                      {formatCurrency(grandTotals.q3Amount)}
                    </td>
                    <td className="p-2 text-center font-semibold text-blue-900">
                      {formatCurrency(grandTotals.q4Amount)}
                    </td>
                    <td className="p-2 text-center text-blue-900 font-bold border-2 border-blue-300">
                      {formatCurrency(grandTotals.totalAmount)}
                    </td>
                    <td className="p-2">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        {!isReadOnly && (
          <EnhancedFormActions
            onSaveDraft={handleSaveDraft}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            isDirty={isDirty || hasUnsavedChanges}
            isValid={isValid}
            mode={mode}
          />
        )}

        {/* Summary Stats */}
        {/* <Card>
          <CardHeader>
            <CardTitle className="text-sm">Form Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-xs">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="font-semibold text-blue-600">
                  {formatCurrency(grandTotals.totalAmount)}
                </div>
                <div className="text-gray-500">Total Budget</div>
              </div>
              <div>
                <div className="font-semibold">
                  {categories.reduce((sum, cat) => sum + cat.activities.length, 0)}
                </div>
                <div className="text-gray-500">Activities</div>
              </div>
              <div>
                <div className="font-semibold">
                  {formData ? Object.keys(formData).filter(id => {
                    const data = formData[id];
                    return data && (data.q1_count > 0 || data.q2_count > 0 || data.q3_count > 0 || data.q4_count > 0);
                  }).length : 0}
                </div>
                <div className="text-gray-500">With Data</div>
              </div>
              <div>
                <div className="font-semibold">
                  {isValid ? (
                    <span className="text-green-600">Valid</span>
                  ) : (
                    <span className="text-red-600">Invalid</span>
                  )}
                </div>
                <div className="text-gray-500">Status</div>
              </div>
            </div>
          </CardContent>
        </Card> */}
      </div>
    </PlanningFormProvider>
  );
};
