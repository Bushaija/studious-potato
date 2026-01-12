import React, { createContext, useContext } from 'react';

interface PlanningFormContextValue {
  formData: Record<string, any>;
  calculations: Record<string, Record<string, number>>;
  handleFieldChange: (activityId: string, fieldKey: string, value: any) => void;
  validationErrors: Record<string, any>;
  isCalculating: boolean;
  isValidating: boolean;
}

const PlanningFormContext = createContext<PlanningFormContextValue | null>(null);

export const PlanningFormProvider: React.FC<{
  value: PlanningFormContextValue;
  children: React.ReactNode;
}> = ({ value, children }) => {
  
  return (
    <PlanningFormContext.Provider value={value}>
      {children}
    </PlanningFormContext.Provider>
  );
};

export const usePlanningFormContext = () => {
  const context = useContext(PlanningFormContext);
  if (!context) {
    throw new Error('usePlanningFormContext must be used within PlanningFormProvider');
  }
  return context;
};

// Debug component to help troubleshoot
export const PlanningFormDebugPanel: React.FC = () => {
  const context = usePlanningFormContext();
  
  return (
    <div className="bg-gray-100 p-4 rounded-lg text-xs font-mono">
      <h4 className="font-bold mb-2">Debug Info:</h4>
      <div className="space-y-2">
        <div>
          <strong>Form Data Keys:</strong> {Object.keys(context.formData).join(', ')}
        </div>
        <div>
          <strong>Calculation Keys:</strong> {Object.keys(context.calculations).join(', ')}
        </div>
        <div>
          <strong>Sample Activity Data:</strong>
          <pre className="mt-1 text-xs">
            {JSON.stringify(Object.values(context.formData)[0] || {}, null, 2)}
          </pre>
        </div>
        <div>
          <strong>Sample Calculations:</strong>
          <pre className="mt-1 text-xs">
            {JSON.stringify(Object.values(context.calculations)[0] || {}, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};