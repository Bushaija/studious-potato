"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { EnhancedPlanningForm } from '@/features/planning/v3/enhanced-planning-form';
import { usePlanningCreationContext } from './planning-creation-tabs';

interface ManualEntryTabProps {
  onUnsavedChanges?: (hasChanges: boolean) => void;
  onSuccess?: (data: any) => void;
  onCancel?: () => void;
  onSaveDraftRequest?: () => void;
  className?: string;
}

export const ManualEntryTab: React.FC<ManualEntryTabProps> = ({
  onUnsavedChanges,
  onSuccess,
  onCancel,
  onSaveDraftRequest,
  className
}) => {
  const context = usePlanningCreationContext();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveDraftTrigger, setSaveDraftTrigger] = useState(0);

  // Monitor form changes and notify parent
  useEffect(() => {
    onUnsavedChanges?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChanges]);

  // Handle save draft request from parent
  useEffect(() => {
    if (onSaveDraftRequest) {
      // Trigger save draft in the form
      setSaveDraftTrigger(prev => prev + 1);
    }
  }, [onSaveDraftRequest]);

  // Handle form success
  const handleFormSuccess = useCallback((data: any) => {
    setHasUnsavedChanges(false);
    onSuccess?.(data);
  }, [onSuccess]);

  // Handle form cancel
  const handleFormCancel = useCallback(() => {
    setHasUnsavedChanges(false);
    onCancel?.();
  }, [onCancel]);

  return (
    <div className={className}>
      <EnhancedPlanningForm
        mode="create"
        projectId={context.projectId}
        facilityId={context.facilityId}
        reportingPeriodId={context.reportingPeriodId}
        facilityName={context.facilityName}
        program={context.program}
        facilityType={context.facilityType}
        showHeader={false} // Don't show header since we have tab header
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
        onUnsavedChanges={setHasUnsavedChanges}
      />
    </div>
  );
};