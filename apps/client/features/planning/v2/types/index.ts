export interface FormField {
  key: string;
  type: 'readonly' | 'text' | 'number' | 'currency' | 'calculated' | 'textarea';
  label: string;
  required?: boolean;
  readonly?: boolean;
  validation?: {
    min?: number;
    max?: number;
    step?: number;
  };
  defaultValue?: any;
  computationFormula?: string;
  helpText?: string;
}

export interface FormSection {
  id: string;
  title: string;
  fields: FormField[];
}

export interface FormSchema {
  title: string;
  version: string;
  sections: FormSection[];
  description: string;
}

export interface SchemaResponse {
  id: number;
  name: string;
  version: string;
  projectType: 'HIV' | 'TB' | 'Malaria';
  facilityType: 'hospital' | 'health_center';
  moduleType: 'planning' | 'execution' | 'reporting';
  isActive: boolean;
  schema: FormSchema;
  metadata: Record<string, any>;
}

export interface Activity {
  id: string;
  categoryId: number;
  name: string;
  code: string;
  categoryName: string;
  isAnnualOnly: boolean;
  displayOrder: number;
}

export interface Category {
  id: number;
  name: string;
  code: string;
  activities: Activity[];
}

export interface ActivityFormData {
  [activityId: string]: {
    [fieldKey: string]: any;
  };
}

// Top-level planning form data shape used with react-hook-form
// export interface PlanningFormData {
//   activities: ActivityFormData;
// }

export interface FormData {
  activities: Record<string, {
    frequency: number;
    unitCost: number;
    q1Count: number;
    q2Count: number;
    q3Count: number;
    q4Count: number;
    comments: string;
  }>;
}

export interface ProgramFilter {
  program: 'HIV' | 'TB' | 'Malaria';
  facilityType: 'hospital' | 'health_center';
}
