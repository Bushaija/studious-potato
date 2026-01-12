import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { SeedManager } from "../utils/seed-manager";

interface FormFieldData {
  schemaName: string;
  fieldKey: string;
  label: string;
  fieldType: "text" | "number" | "currency" | "percentage" | "date" | "select" | "multiselect" | "checkbox" | "textarea" | "calculated" | "readonly";
  isRequired?: boolean;
  displayOrder: number;
  parentFieldKey?: string;
  categoryCode?: string;
  fieldConfig?: any;
  validationRules?: any;
  computationFormula?: string;
  defaultValue?: any;
  helpText?: string;
  isVisible?: boolean;
  isEditable?: boolean;
}

// Common field configurations
const commonFieldConfigs = {
  currency: {
    min: 0,
    max: 999999999.99,
    decimalPlaces: 2,
    currency: 'RWF'
  },
  percentage: {
    min: 0,
    max: 100,
    decimalPlaces: 2,
    suffix: '%'
  },
  number: {
    min: 0,
    max: 9999,
    decimalPlaces: 0
  },
  date: {
    format: 'YYYY-MM-DD',
    minYear: 2020,
    maxYear: 2030
  },
  textarea: {
    maxLength: 1000,
    rows: 4
  }
};

// Planning form fields for HIV Hospital
const hivHospitalPlanningFields: FormFieldData[] = [
  // Human Resources section fields
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'dh_medical_dr_frequency', label: 'DH Medical Dr. - Frequency', fieldType: 'number', displayOrder: 1, categoryCode: 'HR', fieldConfig: commonFieldConfigs.number, isRequired: true },
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'dh_medical_dr_unit_cost', label: 'DH Medical Dr. - Unit Cost', fieldType: 'currency', displayOrder: 2, categoryCode: 'HR', fieldConfig: commonFieldConfigs.currency, isRequired: true },
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'dh_medical_dr_q1_count', label: 'DH Medical Dr. - Q1 Count', fieldType: 'number', displayOrder: 3, categoryCode: 'HR', fieldConfig: commonFieldConfigs.number, isRequired: true },
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'dh_medical_dr_q2_count', label: 'DH Medical Dr. - Q2 Count', fieldType: 'number', displayOrder: 4, categoryCode: 'HR', fieldConfig: commonFieldConfigs.number, isRequired: true },
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'dh_medical_dr_q3_count', label: 'DH Medical Dr. - Q3 Count', fieldType: 'number', displayOrder: 5, categoryCode: 'HR', fieldConfig: commonFieldConfigs.number, isRequired: true },
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'dh_medical_dr_q4_count', label: 'DH Medical Dr. - Q4 Count', fieldType: 'number', displayOrder: 6, categoryCode: 'HR', fieldConfig: commonFieldConfigs.number, isRequired: true },
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'dh_medical_dr_q1_amount', label: 'DH Medical Dr. - Q1 Amount', fieldType: 'calculated', displayOrder: 7, categoryCode: 'HR', 
    computationFormula: 'dh_medical_dr_frequency * dh_medical_dr_unit_cost * dh_medical_dr_q1_count', isEditable: false },
    
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'dh_medical_dr_q2_amount', label: 'DH Medical Dr. - Q2 Amount', fieldType: 'calculated', displayOrder: 8, categoryCode: 'HR', 
    computationFormula: 'dh_medical_dr_frequency * dh_medical_dr_unit_cost * dh_medical_dr_q2_count', isEditable: false },
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'dh_medical_dr_q3_amount', label: 'DH Medical Dr. - Q3 Amount', fieldType: 'calculated', displayOrder: 9, categoryCode: 'HR', 
    computationFormula: 'dh_medical_dr_frequency * dh_medical_dr_unit_cost * dh_medical_dr_q3_count', isEditable: false },
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'dh_medical_dr_q4_amount', label: 'DH Medical Dr. - Q4 Amount', fieldType: 'calculated', displayOrder: 10, categoryCode: 'HR', 
    computationFormula: 'dh_medical_dr_frequency * dh_medical_dr_unit_cost * dh_medical_dr_q4_count', isEditable: false },
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'dh_medical_dr_total_budget', label: 'DH Medical Dr. - Total Budget', fieldType: 'calculated', displayOrder: 11, categoryCode: 'HR', 
    computationFormula: 'dh_medical_dr_q1_amount + dh_medical_dr_q2_amount + dh_medical_dr_q3_amount + dh_medical_dr_q4_amount', isEditable: false },

  // Senior Medical Dr fields
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'senior_medical_dr_frequency', label: 'Senior Medical Dr. - Frequency', fieldType: 'number', displayOrder: 12, categoryCode: 'HR', fieldConfig: commonFieldConfigs.number, isRequired: true },
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'senior_medical_dr_unit_cost', label: 'Senior Medical Dr. - Unit Cost', fieldType: 'currency', displayOrder: 13, categoryCode: 'HR', fieldConfig: commonFieldConfigs.currency, isRequired: true },
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'senior_medical_dr_q1_count', label: 'Senior Medical Dr. - Q1 Count', fieldType: 'number', displayOrder: 14, categoryCode: 'HR', fieldConfig: commonFieldConfigs.number, isRequired: true },
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'senior_medical_dr_q2_count', label: 'Senior Medical Dr. - Q2 Count', fieldType: 'number', displayOrder: 15, categoryCode: 'HR', fieldConfig: commonFieldConfigs.number, isRequired: true },
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'senior_medical_dr_q3_count', label: 'Senior Medical Dr. - Q3 Count', fieldType: 'number', displayOrder: 16, categoryCode: 'HR', fieldConfig: commonFieldConfigs.number, isRequired: true },
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'senior_medical_dr_q4_count', label: 'Senior Medical Dr. - Q4 Count', fieldType: 'number', displayOrder: 17, categoryCode: 'HR', fieldConfig: commonFieldConfigs.number, isRequired: true },

  // Travel Related Costs section
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'campaign_hiv_testing_frequency', label: 'Campaign HIV Testing - Frequency', fieldType: 'number', displayOrder: 50, categoryCode: 'TRC', fieldConfig: commonFieldConfigs.number, isRequired: true },
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'campaign_hiv_testing_unit_cost', label: 'Campaign HIV Testing - Unit Cost', fieldType: 'currency', displayOrder: 51, categoryCode: 'TRC', fieldConfig: commonFieldConfigs.currency, isRequired: true },

  // Program Administration section
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'bank_charges_frequency', label: 'Bank Charges - Frequency', fieldType: 'number', displayOrder: 100, categoryCode: 'PA', fieldConfig: commonFieldConfigs.number, isRequired: true },
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'bank_charges_unit_cost', label: 'Bank Charges - Unit Cost', fieldType: 'currency', displayOrder: 101, categoryCode: 'PA', fieldConfig: commonFieldConfigs.currency, isRequired: true },

  // Common fields for all activities
  { schemaName: 'HIV Hospital Planning Form', fieldKey: 'planning_comments', label: 'Planning Comments', fieldType: 'textarea', displayOrder: 200, fieldConfig: commonFieldConfigs.textarea, isRequired: false,
    helpText: 'Optional comments about the planning data' },
];

// HIV Health Center Planning Fields (simplified example)
const hivHealthCenterPlanningFields: FormFieldData[] = [
  // Human Resources
  { schemaName: 'HIV Health Center Planning Form', fieldKey: 'hc_nurses_frequency', label: 'HC Nurses (A1) - Frequency', fieldType: 'number', displayOrder: 1, categoryCode: 'HR', fieldConfig: commonFieldConfigs.number, isRequired: true },
  { schemaName: 'HIV Health Center Planning Form', fieldKey: 'hc_nurses_unit_cost', label: 'HC Nurses (A1) - Unit Cost', fieldType: 'currency', displayOrder: 2, categoryCode: 'HR', fieldConfig: commonFieldConfigs.currency, isRequired: true },
  { schemaName: 'HIV Health Center Planning Form', fieldKey: 'hc_nurses_q1_count', label: 'HC Nurses (A1) - Q1 Count', fieldType: 'number', displayOrder: 3, categoryCode: 'HR', fieldConfig: commonFieldConfigs.number, isRequired: true },
  { schemaName: 'HIV Health Center Planning Form', fieldKey: 'hc_nurses_q2_count', label: 'HC Nurses (A1) - Q2 Count', fieldType: 'number', displayOrder: 4, categoryCode: 'HR', fieldConfig: commonFieldConfigs.number, isRequired: true },
  { schemaName: 'HIV Health Center Planning Form', fieldKey: 'hc_nurses_q3_count', label: 'HC Nurses (A1) - Q3 Count', fieldType: 'number', displayOrder: 5, categoryCode: 'HR', fieldConfig: commonFieldConfigs.number, isRequired: true },
  { schemaName: 'HIV Health Center Planning Form', fieldKey: 'hc_nurses_q4_count', label: 'HC Nurses (A1) - Q4 Count', fieldType: 'number', displayOrder: 6, categoryCode: 'HR', fieldConfig: commonFieldConfigs.number, isRequired: true },
  
  // Travel Related Costs
  { schemaName: 'HIV Health Center Planning Form', fieldKey: 'workshop_frequency', label: 'Workshop - Frequency', fieldType: 'number', displayOrder: 20, categoryCode: 'TRC', fieldConfig: commonFieldConfigs.number, isRequired: true },
  { schemaName: 'HIV Health Center Planning Form', fieldKey: 'workshop_unit_cost', label: 'Workshop - Unit Cost', fieldType: 'currency', displayOrder: 21, categoryCode: 'TRC', fieldConfig: commonFieldConfigs.currency, isRequired: true },
];

// Execution form fields (common across all projects)
const executionFormFields: FormFieldData[] = [
  { schemaName: 'HIV Execution Form', fieldKey: 'q1_amount', label: 'Q1 Amount', fieldType: 'currency', displayOrder: 1, fieldConfig: commonFieldConfigs.currency, isRequired: true,
    helpText: 'Enter the amount spent in Quarter 1' },
  { schemaName: 'HIV Execution Form', fieldKey: 'q2_amount', label: 'Q2 Amount', fieldType: 'currency', displayOrder: 2, fieldConfig: commonFieldConfigs.currency, isRequired: true,
    helpText: 'Enter the amount spent in Quarter 2' },
  { schemaName: 'HIV Execution Form', fieldKey: 'q3_amount', label: 'Q3 Amount', fieldType: 'currency', displayOrder: 3, fieldConfig: commonFieldConfigs.currency, isRequired: true,
    helpText: 'Enter the amount spent in Quarter 3' },
  { schemaName: 'HIV Execution Form', fieldKey: 'q4_amount', label: 'Q4 Amount', fieldType: 'currency', displayOrder: 4, fieldConfig: commonFieldConfigs.currency, isRequired: true,
    helpText: 'Enter the amount spent in Quarter 4' },
  { schemaName: 'HIV Execution Form', fieldKey: 'cumulative_balance', label: 'Cumulative Balance', fieldType: 'calculated', displayOrder: 5, 
    computationFormula: 'q1_amount + q2_amount + q3_amount + q4_amount', isEditable: false,
    helpText: 'Automatically calculated total of all quarters' },
  { schemaName: 'HIV Execution Form', fieldKey: 'execution_comment', label: 'Comments', fieldType: 'textarea', displayOrder: 6, fieldConfig: commonFieldConfigs.textarea, isRequired: false,
    helpText: 'Optional comments about the execution data' },

  // Similar fields for Malaria and TB execution forms
  { schemaName: 'Malaria Execution Form', fieldKey: 'q1_amount', label: 'Q1 Amount', fieldType: 'currency', displayOrder: 1, fieldConfig: commonFieldConfigs.currency, isRequired: true },
  { schemaName: 'Malaria Execution Form', fieldKey: 'q2_amount', label: 'Q2 Amount', fieldType: 'currency', displayOrder: 2, fieldConfig: commonFieldConfigs.currency, isRequired: true },
  { schemaName: 'Malaria Execution Form', fieldKey: 'q3_amount', label: 'Q3 Amount', fieldType: 'currency', displayOrder: 3, fieldConfig: commonFieldConfigs.currency, isRequired: true },
  { schemaName: 'Malaria Execution Form', fieldKey: 'q4_amount', label: 'Q4 Amount', fieldType: 'currency', displayOrder: 4, fieldConfig: commonFieldConfigs.currency, isRequired: true },
  { schemaName: 'Malaria Execution Form', fieldKey: 'cumulative_balance', label: 'Cumulative Balance', fieldType: 'calculated', displayOrder: 5, 
    computationFormula: 'q1_amount + q2_amount + q3_amount + q4_amount', isEditable: false },

  { schemaName: 'TB Execution Form', fieldKey: 'q1_amount', label: 'Q1 Amount', fieldType: 'currency', displayOrder: 1, fieldConfig: commonFieldConfigs.currency, isRequired: true },
  { schemaName: 'TB Execution Form', fieldKey: 'q2_amount', label: 'Q2 Amount', fieldType: 'currency', displayOrder: 2, fieldConfig: commonFieldConfigs.currency, isRequired: true },
  { schemaName: 'TB Execution Form', fieldKey: 'q3_amount', label: 'Q3 Amount', fieldType: 'currency', displayOrder: 3, fieldConfig: commonFieldConfigs.currency, isRequired: true },
  { schemaName: 'TB Execution Form', fieldKey: 'q4_amount', label: 'Q4 Amount', fieldType: 'currency', displayOrder: 4, fieldConfig: commonFieldConfigs.currency, isRequired: true },
  { schemaName: 'TB Execution Form', fieldKey: 'cumulative_balance', label: 'Cumulative Balance', fieldType: 'calculated', displayOrder: 5, 
    computationFormula: 'q1_amount + q2_amount + q3_amount + q4_amount', isEditable: false },
];

// Reporting form fields
const reportingFormFields: FormFieldData[] = [
  { schemaName: 'HIV Financial Reporting Form', fieldKey: 'reporting_period_id', label: 'Reporting Period', fieldType: 'select', displayOrder: 1, isRequired: true,
    fieldConfig: { dataSource: 'reporting_periods', valueField: 'id', labelField: 'name' },
    helpText: 'Select the reporting period for this financial report' },
  { schemaName: 'HIV Financial Reporting Form', fieldKey: 'facility_id', label: 'Facility', fieldType: 'select', displayOrder: 2, isRequired: true,
    fieldConfig: { dataSource: 'facilities', valueField: 'id', labelField: 'name' },
    helpText: 'Select the facility submitting this report' },
  { schemaName: 'HIV Financial Reporting Form', fieldKey: 'project_id', label: 'Project', fieldType: 'select', displayOrder: 3, isRequired: true,
    fieldConfig: { dataSource: 'enhanced_projects', valueField: 'id', labelField: 'name' },
    helpText: 'Select the project for this report' },
  { schemaName: 'HIV Financial Reporting Form', fieldKey: 'prepared_by', label: 'Prepared By', fieldType: 'text', displayOrder: 4, isRequired: true,
    fieldConfig: { maxLength: 200 },
    helpText: 'Name of the person preparing this report' },
  { schemaName: 'HIV Financial Reporting Form', fieldKey: 'preparation_date', label: 'Preparation Date', fieldType: 'date', displayOrder: 5, isRequired: true,
    fieldConfig: commonFieldConfigs.date,
    helpText: 'Date when this report was prepared' },
];

// Combine all form fields
const allFormFields = [
  ...hivHospitalPlanningFields,
  ...hivHealthCenterPlanningFields,
  ...executionFormFields,
  ...reportingFormFields,
];

/* eslint-disable no-console */
export async function seedFormFields(db: Database, schemaName?: string) {
  console.log(`Seeding form fields${schemaName ? ` for schema ${schemaName}` : ''}...`);

  // Debug: Check what schemas exist
  const schemas = await db
    .select({ id: schema.formSchemas.id, name: schema.formSchemas.name })
    .from(schema.formSchemas);
  
  console.log("Available schemas in database:", schemas.map(s => `"${s.name}" (ID: ${s.id})`));
  
  const fieldsToSeed = schemaName 
    ? allFormFields.filter(field => field.schemaName === schemaName)
    : allFormFields;

  console.log("Form fields looking for these schemas:", 
    [...new Set(fieldsToSeed.map(f => f.schemaName))]);

  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const schemaMap = new Map(schemas.map(s => [normalize(s.name), s.id]));

  // Map legacy/descriptive names to the actual seeded names
  const resolveSchemaKey = (original: string): string | undefined => {
    const n = normalize(original);
    if (schemaMap.has(n)) return n;

    // Try to translate "<Project> <Facility> Planning Form" -> "<Project> Planning Form - <facility>"
    // Examples:
    //  - "hiv hospital planning form" -> "hiv planning form - hospital"
    //  - "hiv health center planning form" -> "hiv planning form - health_center"
    const planningMatch = n.match(/^(hiv|malaria|tb) (hospital|health center) planning form$/);
    if (planningMatch) {
      const project = planningMatch[1];
      const facility = planningMatch[2] === 'health center' ? 'health_center' : 'hospital';
      const key = `${project} planning form - ${facility}`;
      if (schemaMap.has(key)) return key;
    }

    // Execution/Reporting schemas might not exist yet; fall through to undefined
    return undefined;
  };

  console.log("Schema map after normalization:", 
    Array.from(schemaMap.entries()).map(([key, id]) => `"${key}" -> ${id}`));

  let missingSchemaCount = 0;
  const fieldRows = fieldsToSeed.reduce<any[]>((acc, field) => {
    const normalizedSchemaName = resolveSchemaKey(field.schemaName);
    const schemaId = normalizedSchemaName ? schemaMap.get(normalizedSchemaName) : undefined;
    
    if (!schemaId) {
      const attempted = normalize(field.schemaName);
      console.warn(`Schema "${field.schemaName}" (normalized: "${attempted}") not found. Available: ${Array.from(schemaMap.keys()).join(', ')}`);
      missingSchemaCount++;
      return acc;
    }

    // Rest of your logic...
    acc.push({
      schemaId,
      fieldKey: field.fieldKey,
      label: field.label,
      fieldType: field.fieldType,
      isRequired: field.isRequired || false,
      displayOrder: field.displayOrder,
      parentFieldId: null,
      categoryId: null, // Simplified for debugging
      fieldConfig: field.fieldConfig || {},
      validationRules: field.validationRules || [],
      computationFormula: field.computationFormula || null,
      defaultValue: field.defaultValue || null,
      helpText: field.helpText || null,
      isVisible: field.isVisible !== false,
      isEditable: field.isEditable !== false,
    });

    return acc;
  }, []);

  console.log(`Prepared ${fieldRows.length} field rows, ${missingSchemaCount} missing schemas`);

  if (fieldRows.length > 0) {
    try {
      const seedManager = new SeedManager(db);
      const result = await seedManager.seedWithConflictResolution(schema.formFields, fieldRows, {
        uniqueFields: ["schemaId", "fieldKey"],
        onConflict: "skip",
        updateFields: ["label", "fieldType", "isRequired", "displayOrder"],
      });
      console.log(`Seeding result:`, result);
    } catch (error) {
      console.error("Error during form fields seeding:", error);
      throw error;
    }
  } else {
    console.warn('No valid form fields to seed - all schemas missing?');
  }
}

export default async function seed(db: Database) {
  await seedFormFields(db);
}