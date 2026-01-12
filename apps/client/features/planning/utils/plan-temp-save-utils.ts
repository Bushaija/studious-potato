import { UseFormReturn } from 'react-hook-form';
import { PlanTempSaveData, PlanTempSaveMetadata } from '@/features/planning/stores/plan-temp-save-store';

export const capturePlanState = (methods: UseFormReturn<any>): any => {
  // Shallow clone is sufficient as RHF values are plain objects
  return JSON.parse(JSON.stringify(methods.getValues()));
};

export const restorePlanState = (saved: PlanTempSaveData, methods: UseFormReturn<any>): void => {
  if (!saved?.planData) return;
  methods.reset(saved.planData as any);
};

export const formatSaveTime = (timestamp?: string): string => {
  if (!timestamp) return 'unknown';
  const date = new Date(timestamp);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

// Create metadata from PlanForm props
export const createPlanMetadata = (props: {
  facilityName?: string;
  facilityType?: string;
  programName?: string;
}): PlanTempSaveMetadata | null => {
  if (!props.facilityName) return null; // Need at least facility to scope save
  return {
    facilityName: props.facilityName,
    facilityType: props.facilityType,
    programName: props.programName,
  };
}; 