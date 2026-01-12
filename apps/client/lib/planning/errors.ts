export class PlanningError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: Record<string, any>
    ) {
        super(message);
        this.name = 'PlanningError';
    }
};

export class ValidationError extends PlanningError {
    constructor(
        message: string,
        validationErrors: Record<string, string[]>
    ) {
        super(message, 'VALIDATION_ERROR', { validationErrors })
        this.name = 'ValidationError';
    }
};

export class CalculationError extends PlanningError{
    constructor(
        message: string,
        details?: Record<string, any>
    ) {
        super(message, 'SCHEMA_ERROR', details);
        this.name = 'SchemaError';
    }
};

export class SchemaError extends PlanningError {
    constructor(message: string, details?: Record<string, any>) {
      super(message, 'SCHEMA_ERROR', details);
      this.name = 'SchemaError';
    }
};

export function handleApiError(error: unknown): PlanningError {
    if (error instanceof PlanningError) {
      return error;
    }
    
    if (error instanceof Error) {
      // Parse common API error responses
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.errors && parsed.message) {
          return new ValidationError(parsed.message, parsed.errors);
        }
      } catch {
        // Not JSON, continue with regular error handling
      }
      
      return new PlanningError(error.message, 'UNKNOWN_ERROR');
    }
    
    return new PlanningError('An unknown error occurred', 'UNKNOWN_ERROR');
  }
  