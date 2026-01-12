'use client'
import { toast } from 'sonner';

export function useAppToast() {
  const showSuccessToast = (message: string, description?: string) => {
    toast.success(message, {
      description: description,
      duration: 3000,
    });
  };

  const showErrorToast = (message: string, description?: string) => {
    toast.error(message, {
      description: description,
      duration: 5000,
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });
  };

  return { showSuccessToast, showErrorToast };
} 