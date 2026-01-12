export interface AppRouteHandler<T> {
    (c: any): Promise<Response>;
  }
  
  export interface ValidationError {
    field: string;
    message: string;
    code: string;
  }
  
  export interface ValidationResult {
    fieldId: string;
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
  }
  
  export interface ComputationError {
    fieldId: string;
    message: string;
    code: string;
  }
  
  export interface CalculationStep {
    fieldId: string;
    formula: string;
    inputs: Record<string, any>;
    result: any;
    executionTime: number;
  }