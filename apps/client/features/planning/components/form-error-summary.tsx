import React from 'react';
import { FieldErrors } from 'react-hook-form';

interface FormErrorSummaryProps {
  errors: FieldErrors;
}

export function FormErrorSummary({ errors }: FormErrorSummaryProps) {
  if (Object.keys(errors).length === 0) {
    return null;
  }

  return (
    <div className="bg-red-50 p-4 rounded-md border border-red-200 mb-4">
      <p className="text-red-600 font-medium">Please fix the following errors:</p>
      <ul className="list-disc ml-5 mt-2 text-red-600 text-sm">
        {errors.activities && (
          <>
            {Array.isArray(errors.activities) ? (
              errors.activities.map((error, index) => (
                error && <li key={index}>Activity {index + 1}: {error.message || 'Invalid data'}</li>
              ))
            ) : (
              <li>{(errors.activities as any)?.message || 'Activity data is incomplete or invalid'}</li>
            )}
          </>
        )}
        {errors.generalTotalBudget && (
          <li>General Total Budget: {(errors.generalTotalBudget as any)?.message}</li>
        )}
        {Object.entries(errors).map(([field, error]) => {
          if (field !== 'activities' && field !== 'generalTotalBudget' && (error as any)?.message) {
            return (
              <li key={field}>
                <span className="capitalize">{field.replace(/_/g, ' ')}:</span> {(error as any).message}
              </li>
            );
          }
          return null;
        })}
      </ul>
    </div>
  );
} 