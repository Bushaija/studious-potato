"use client"

import React from 'react';
import { AlertCircle, XCircle } from 'lucide-react';
import { useExecutionFormContext } from '@/features/execution/execution-form-context';

/**
 * Validation Error Banner Component
 * 
 * Displays client-side validation errors at the top of the execution form
 * Requirements: 11.5
 */
export function ValidationErrorBanner() {
  const { clientValidationErrors } = useExecutionFormContext();

  if (!clientValidationErrors || clientValidationErrors.length === 0) {
    return null;
  }

  // Group errors by type
  const errors = clientValidationErrors.filter(e => e.type === 'error');
  const warnings = clientValidationErrors.filter(e => e.type === 'warning');

  return (
    <div className="space-y-2 mb-4">
      {/* {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900 mb-2">
                Validation Errors ({errors.length})
              </h3>
              <ul className="space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-800">
                    • {error.message}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-red-700 mt-2">
                Please correct these errors before submitting the form.
              </p>
            </div>
          </div>
        </div>
      )} */}

      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-900 mb-2">
                Warnings ({warnings.length})
              </h3>
              <ul className="space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-800">
                    • {warning.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
