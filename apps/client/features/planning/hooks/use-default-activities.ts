import { useGenerateDefaultActivities } from '@/features/planning-config/api/use-planning-activities';

/**
 * Unified hook to fetch default activities for any program/facility combination.
 * Keeps API details in one place.
 */
export const useDefaultActivities = (
  program: 'HIV' | 'TB' | 'MAL',
  facilityType: 'hospital' | 'health_center'
) => {
  const activities = useGenerateDefaultActivities(program, facilityType);
  return activities;
}; 