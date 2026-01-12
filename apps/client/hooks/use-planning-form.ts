import { useState, useCallback, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { usePlanningSchema } from "./queries/planning/use-get-planning-schema";
import { usePlanningActivities } from "./queries/planning/use-planning-activities";
import { useFormCalculations } from "./mutations/use-form-calculations";
import { useDebounce } from "@/hooks/use-debounce";

interface UsePlanningFormParams {
  projectType: 'HIV' | 'Malaria' | 'TB';
  facilityType: 'hospital' | 'health_center';
  initialData?: Record<string, any>;
  onDataChange?: (data: Record<string, any>) => void;
  validationMode?: 'onChange' | 'onBlur' | 'manual';
}

export function usePlanningForm({
  projectType,
  facilityType,
  initialData = {},
  onDataChange,
  validationMode = 'onBlur'
}: UsePlanningFormParams) {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [validationErrors, setValidationErrors] = useState<Record<string, any>>({});

  // Don't debounce for calculations - we want immediate updates
  const debouncedFormData = useDebounce(formData, 100); // Reduced from 300ms to 100ms

  // Hooks
  const schemaQuery = usePlanningSchema({ projectType, facilityType });
  const activitiesQuery = usePlanningActivities({ projectType, facilityType });
  
  // Use immediate formData for calculations, not debounced
  const calculations = useFormCalculations(formData, schemaQuery.data?.data?.schema, activitiesQuery.data?.data);

  const form = useForm({
    defaultValues: initialData,
    mode: validationMode === 'manual' ? 'onSubmit' : validationMode,
  });

  // Initialize form with schema-based default values
  useEffect(() => {
    if (schemaQuery.data?.data?.schema && activitiesQuery.data?.data) {
      const activities = activitiesQuery.data.data;
      
      const defaultValues = activities.reduce((acc: Record<string, any>, activity: any) => {
        acc[activity.id.toString()] = {
          frequency: 1,
          unit_cost: 0,
          q1_count: 0,
          q2_count: activity.isAnnualOnly ? 0 : 0,
          q3_count: activity.isAnnualOnly ? 0 : 0,
          q4_count: activity.isAnnualOnly ? 0 : 0,
          comments: '',
          ...initialData[activity.id.toString()]
        };
        return acc;
      }, {});

      setFormData(prev => ({ ...defaultValues, ...prev }));
      form.reset(defaultValues);
    }
  }, [schemaQuery.data, activitiesQuery.data, initialData, form]);

  // Handle form data changes - immediate update for calculations
  const handleFieldChange = useCallback((activityId: string, fieldKey: string, value: any) => {
    // Update form data immediately for real-time calculations
    setFormData(prev => {
      const newFormData = {
        ...prev,
        [activityId]: {
          ...prev[activityId],
          [fieldKey]: value
        }
      };
      
      // Call onDataChange immediately
      onDataChange?.(newFormData);
      return newFormData;
    });
    
    // Also update react-hook-form
    form.setValue(`${activityId}.${fieldKey}`, value, { shouldDirty: true });
  }, [form, onDataChange]);

  // Only use debounced data for validation and API calls
  useEffect(() => {
    if (validationMode !== 'manual' && Object.keys(debouncedFormData).length > 0) {
      // Validation logic here if needed
    }
  }, [debouncedFormData, validationMode]);

  const validateForm = useCallback(async () => {
    // Validation logic
    return { isValid: true, errors: {} };
  }, [formData]);

  const calculateTotals = useCallback(async () => {
    // Manual calculation trigger if needed
    return calculations;
  }, [calculations]);

  const isLoading = schemaQuery.isLoading || activitiesQuery.isLoading;
  const error = schemaQuery.error || activitiesQuery.error;

  return {
    // Form state
    form,
    formData,
    setFormData,
    
    // Validation
    validationErrors,
    isValidating: false,
    validateForm,
    
    // Calculations - using immediate calculations
    calculations,
    calculatedValues: calculations,
    isCalculating: false,
    calculateTotals,
    
    // Data
    schema: schemaQuery.data?.data,
    activities: activitiesQuery.data?.data,
    
    // Handlers
    handleFieldChange,
    
    // Status
    isLoading,
    error,
    isDirty: form.formState.isDirty,
    isValid: Object.keys(validationErrors).length === 0,
    
    // Utils
    reset: () => {
      form.reset();
      setFormData(initialData);
      setValidationErrors({});
    }
  };
}