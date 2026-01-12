import React from 'react';
import { useRouter } from 'next/navigation';
import { FormActions } from '@/features/shared/form-actions';

export interface PlanFormActionsProps {
  isSubmitting: boolean;
  isEdit?: boolean;
  isReadOnly?: boolean;
  onTempSave?: () => void;
  isTempSaving?: boolean;
  canTempSave?: boolean;
  onCancel?: () => void;
}

export function PlanFormActions({
  isSubmitting,
  isEdit = false,
  isReadOnly = false,
  onTempSave,
  isTempSaving = false,
  canTempSave = true,
  onCancel,
}: PlanFormActionsProps) {
  const router = useRouter();

  if (isReadOnly) {
    return (
      <FormActions
        module="planning"
        onCancel={() => router.push('/dashboard/planning')}
        isSubmitting={false}
        isDirty={false}
        isValid
        canSaveDraft={false}
        submitLabel={isEdit ? 'Update Plan' : 'Save Plan'}
      />
    );
  }

  return (
    <FormActions
      module="planning"
      onCancel={() => {
        if (onCancel) return onCancel();
        router.push('/dashboard/planning');
      }}
      onSaveDraft={onTempSave}
      isSubmitting={isSubmitting}
      isDirty={true}
      isValid
      draftLabel={isTempSaving ? 'Saving Draft...' : 'Save Draft'}
      canSaveDraft={canTempSave && !isTempSaving}
      submitLabel={isEdit ? 'Update Plan' : 'Save Plan'}
    />
  );
} 