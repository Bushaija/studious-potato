import { useMemo, useState, useEffect } from 'react';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { planSchema } from '@/features/planning/schema/malaria/plan-form-schema';
import type { Activity, Plan } from '@/features/planning/schema/malaria/plan-form-schema';

import { useDefaultActivities } from '@/features/planning/hooks/use-default-activities';
import { useCategorizedActivities } from '@/features/planning-config/api/use-planning-activities';

interface UsePlanFormProps {
  isHospital?: boolean;
  initialActivities?: Activity[];
}

export function usePlanForm({ 
  isHospital = false, 
  initialActivities 
}: UsePlanFormProps) {
  const facilityType: 'hospital' | 'health_center' = isHospital ? 'hospital' : 'health_center';

  const defaultActivities = useDefaultActivities('MAL', facilityType);
const { activityCategories } = useCategorizedActivities('MAL', facilityType);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (activityCategories && Object.keys(activityCategories).length > 0) {
      const expanded: Record<string, boolean> = {};
      Object.keys(activityCategories).forEach((cat) => (expanded[cat] = true));
      setExpandedCategories(expanded);
    }
  }, [activityCategories]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const form = useForm<Plan>({
    resolver: zodResolver(planSchema) as Resolver<Plan>,
    defaultValues: {
      activities: initialActivities && initialActivities.length > 0 ? initialActivities : defaultActivities,
      generalTotalBudget: 0
    }
  });

  const { watch, setValue, reset } = form;

  // Reset form when initialActivities changes (e.g., when API data loads)
  useEffect(() => {
    console.log('🐛 Malaria Form Hook - initialActivities changed:', {
      initialActivitiesLength: initialActivities?.length || 0,
      initialActivities: initialActivities?.slice(0, 3), // Log first 3 for debugging
      hasInitialActivities: !!initialActivities && initialActivities.length > 0
    });
    
    if (initialActivities && initialActivities.length > 0) {
      const totalBudget = initialActivities.reduce((sum, activity) => sum + (activity.totalBudget || 0), 0);
      console.log('🐛 Malaria Form Hook - Resetting form with data:', {
        activitiesCount: initialActivities.length,
        totalBudget
      });
      
      reset({
        activities: initialActivities,
        generalTotalBudget: totalBudget
      });
    }
    }, [initialActivities, reset]);
  
  const activities = watch('activities');
  
  // reset when defaults arrive
  useEffect(() => {
    if ((!initialActivities || initialActivities.length === 0) && defaultActivities.length > 0 && activities.length === 0) {
      reset({
        activities: defaultActivities as any,
        generalTotalBudget: 0,
      });
    }
  }, [defaultActivities, initialActivities, activities.length, reset]);

  useEffect(() => {
    const total = activities.reduce((sum, activity) => sum + (activity.totalBudget || 0), 0);
    setValue('generalTotalBudget', total);
  }, [activities, setValue]);

  const categorizedActivities = useMemo(() => {
    const result: Record<string, Activity[]> = {};
    activities.forEach(activity => {
      const category = activity.activityCategory;
      if (!result[category]) {
        result[category] = [];
      }
      result[category].push(activity);
    });
    return result;
  }, [activities]);

  const activityIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    activities.forEach((activity, index) => {
      const key = `${activity.activityCategory}-${activity.typeOfActivity}-${activity.activity || ''}`;
      map.set(key, index);
    });
    return map;
  }, [activities]);

  const getActivityIndex = (activity: Activity) => {
    const key = `${activity.activityCategory}-${activity.typeOfActivity}-${activity.activity || ''}`;
    return activityIndexMap.get(key) ?? -1;
  };

  const categoryTotals = useMemo(() => {
    const totals: Record<string, { amountQ1: number; amountQ2: number; amountQ3: number; amountQ4: number; totalBudget: number; }> = {};
    Object.keys(activityCategories || {}).forEach(category => {
      const categoryActivities = categorizedActivities[category] || [];
      totals[category] = {
        amountQ1: categoryActivities.reduce((sum, act) => sum + (act.amountQ1 || 0), 0),
        amountQ2: categoryActivities.reduce((sum, act) => sum + (act.amountQ2 || 0), 0),
        amountQ3: categoryActivities.reduce((sum, act) => sum + (act.amountQ3 || 0), 0),
        amountQ4: categoryActivities.reduce((sum, act) => sum + (act.amountQ4 || 0), 0),
        totalBudget: categoryActivities.reduce((sum, act) => sum + (act.totalBudget || 0), 0),
      };
    });
    return totals;
  }, [categorizedActivities, activityCategories]);

  return {
    form,
    activities,
    activityCategories,
    expandedCategories,
    toggleCategory,
    categorizedActivities,
    getActivityIndex,
    categoryTotals,
  };
} 