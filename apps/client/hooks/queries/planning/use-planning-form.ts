import { useState, useCallback, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { usePlanningActivities } from "./use-planning-activities";
import { usePlanningSchema } from "./use-get-planning-schema";
import { useFormCalculations } from "../../mutations/use-form-calculations";

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
  const [isInitialized, setIsInitialized] = useState(false);

  console.log('🏗️ Form Data State:', formData); // Debug log

  // Hooks
  const schemaQuery = usePlanningSchema({ projectType, facilityType });
  const activitiesQuery = usePlanningActivities({ projectType, facilityType });
  
  // Use immediate formData for calculations
  const calculations = useFormCalculations(formData, schemaQuery.data?.data?.schema, activitiesQuery.data?.data);

  const form = useForm({
    defaultValues: initialData,
    mode: validationMode === 'manual' ? 'onSubmit' : validationMode,
  });

  // Initialize form data when activities load or when initialData changes
  useEffect(() => {
    if (activitiesQuery.data?.data) {
      console.log('🚀 Initializing form with activities:', activitiesQuery.data.data);
      console.log('📊 Initial data provided:', initialData);
      
      const activities = activitiesQuery.data.data;
      const initialFormData: Record<string, any> = {};
      
      activities.forEach((activity: any) => {
        const activityId = activity.id.toString();
        initialFormData[activityId] = {
          frequency: initialData[activityId]?.frequency || 1,
          unit_cost: initialData[activityId]?.unit_cost || 0,
          q1_count: initialData[activityId]?.q1_count || 0,
          q2_count: initialData[activityId]?.q2_count || 0,
          q3_count: initialData[activityId]?.q3_count || 0,
          q4_count: initialData[activityId]?.q4_count || 0,
          comments: initialData[activityId]?.comments || '',
        };
      });
      
      console.log('📝 Setting initial form data:', initialFormData);
      setFormData(initialFormData);
      
      // Update react-hook-form with the initial data
      Object.entries(initialFormData).forEach(([activityId, data]) => {
        Object.entries(data).forEach(([fieldKey, value]) => {
          form.setValue(`activities.${activityId}.${fieldKey}`, value, { shouldDirty: false });
        });
      });
      
      setIsInitialized(true);
    }
  }, [activitiesQuery.data, initialData, form]);

  // Reset form when project type or facility type changes
  useEffect(() => {
    if (isInitialized) {
      console.log('🔄 Project type or facility type changed, resetting form');
      setIsInitialized(false);
      setFormData({});
    }
  }, [projectType, facilityType]);

  // Handle individual field changes
  const handleFieldChange = useCallback((activityId: string, fieldKey: string, value: any) => {
    console.log('🔄 Field change:', { activityId, fieldKey, value }); // Debug log
    
    setFormData(prevFormData => {
      const newFormData = {
        ...prevFormData,
        [activityId]: {
          ...prevFormData[activityId],
          [fieldKey]: value
        }
      };
      
      console.log('📊 New form data after change:', newFormData); // Debug log
      
      // Call onDataChange callback
      setTimeout(() => onDataChange?.(newFormData), 0);
      
      return newFormData;
    });
    
    // Also update react-hook-form for validation
    form.setValue(`activities.${activityId}.${fieldKey}`, value, { shouldDirty: true });
  }, [form, onDataChange]);

  const validateForm = useCallback(async () => {
    return { isValid: true, errors: {} };
  }, []);

  const calculateTotals = useCallback(async () => {
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
    
    // Calculations
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
      setIsInitialized(false);
    }
  };
}