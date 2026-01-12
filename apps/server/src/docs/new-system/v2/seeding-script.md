```ts
import { db } from "./db";
import { 
  formSchemas, 
  schemaActivityCategories, 
  dynamicActivities, 
  configurableEventMappings,
  enhancedStatementTemplates,
  systemConfigurations
} from "./enhanced-tables";

/**
 * Data seeding script to migrate from hard-coded configurations
 * to schema-driven database records
 */

// Form Schema Definitions (replacing hard-coded TypeScript forms)
const FORM_SCHEMAS = [
  {
    name: 'HIV Health Center Planning Form',
    version: '1.0',
    projectType: 'HIV' as const,
    facilityType: 'health_center' as const,
    moduleType: 'planning' as const,
    schema: {
      formId: 'hiv_hc_planning',
      title: 'HIV Health Center Planning',
      version: '1.0',
      fields: [
        { key: 'frequency', type: 'number', label: 'Frequency', required: true },
        { key: 'unit_cost', type: 'currency', label: 'Unit Cost', required: true },
        { key: 'count_q1', type: 'number', label: 'Count Q1', required: false },
        { key: 'count_q2', type: 'number', label: 'Count Q2', required: false },
        { key: 'count_q3', type: 'number', label: 'Count Q3', required: false },
        { key: 'count_q4', type: 'number', label: 'Count Q4', required: false },
        { key: 'comment', type: 'textarea', label: 'Comments', required: false }
      ],
      calculations: {
        'amount_q1': 'frequency * unit_cost * count_q1',
        'amount_q2': 'frequency * unit_cost * count_q2', 
        'amount_q3': 'frequency * unit_cost * count_q3',
        'amount_q4': 'frequency * unit_cost * count_q4',
        'total_budget': 'amount_q1 + amount_q2 + amount_q3 + amount_q4'
      }
    }
  },
  {
    name: 'HIV Hospital Planning Form',
    version: '1.0',
    projectType: 'HIV' as const,
    facilityType: 'hospital' as const,
    moduleType: 'planning' as const,
    schema: {
      formId: 'hiv_hospital_planning',
      title: 'HIV Hospital Planning',
      version: '1.0',
      fields: [
        { key: 'frequency', type: 'number', label: 'Frequency', required: true },
        { key: 'unit_cost', type: 'currency', label: 'Unit Cost', required: true },
        { key: 'count_q1', type: 'number', label: 'Count Q1', required: false },
        { key: 'count_q2', type: 'number', label: 'Count Q2', required: false },
        { key: 'count_q3', type: 'number', label: 'Count Q3', required: false },
        { key: 'count_q4', type: 'number', label: 'Count Q4', required: false },
        { key: 'comment', type: 'textarea', label: 'Comments', required: false }
      ]
    }
  },
  {
    name: 'Execution Form',
    version: '1.0',
    projectType: null, // Generic for all project types
    facilityType: null, // Generic for all facility types
    moduleType: 'execution' as const,
    schema: {
      formId: 'execution_form',
      title: 'Financial Execution',
      version: '1.0',
      sections: [
        {
          id: 'receipts',
          title: 'A. Receipts',
          fields: ['q1_amount', 'q2_amount', 'q3_amount', 'q4_amount', 'comment']
        },
        {
          id: 'expenditures', 
          title: 'B. Expenditures',
          fields: ['q1_amount', 'q2_amount', 'q3_amount', 'q4_amount', 'comment']
        }
      ],
      calculations: {
        'cumulative_balance': 'q1_amount + q2_amount + q3_amount + q4_amount',
        'surplus_deficit': 'receipts_total - expenditures_total'
      }
    }
  }
];

// Activity Categories (replacing hard-coded categories)
const ACTIVITY_CATEGORIES = [
  // HIV Health Center Categories
  { projectType: 'HIV', facilityType: 'health_center', code: 'HR', name: 'Human Resources (HR)', displayOrder: 1 },
  { projectType: 'HIV', facilityType: 'health_center', code: 'TRC', name: 'Travel Related Costs (TRC)', displayOrder: 2 },
  { projectType: 'HIV', facilityType: 'health_center', code: 'HPE', name: 'Health Products & Equipment (HPE)', displayOrder: 3 },
  { projectType: 'HIV', facilityType: 'health_center', code: 'PAC', name: 'Program Administration Costs (PAC)', displayOrder: 4 },
  
  // HIV Hospital Categories
  { projectType: 'HIV', facilityType: 'hospital', code: 'HR', name: 'Human Resources (HR)', displayOrder: 1 },
  { projectType: 'HIV', facilityType: 'hospital', code: 'TRC', name: 'Travel Related Costs (TRC)', displayOrder: 2 },
  { projectType: 'HIV', facilityType: 'hospital', code: 'HPE', name: 'Health Products & Equipment (HPE)', displayOrder: 3 },
  { projectType: 'HIV', facilityType: 'hospital', code: 'PAC', name: 'Program Administration Costs (PAC)', displayOrder: 4 },
  
  // TB Categories
  { projectType: 'TB', facilityType: 'hospital', code: 'HR', name: 'Human Resources (HR)', displayOrder: 1 },
  { projectType: 'TB', facilityType: 'hospital', code: 'TRC', name: 'Travel Related Costs (TRC)', displayOrder: 2 },
  { projectType: 'TB', facilityType: 'hospital', code: 'HPE', name: 'Health Products & Equipment (HPE)', displayOrder: 3 },
  
  // Malaria Categories (can be added dynamically)
  { projectType: 'Malaria', facilityType: 'health_center', code: 'HR', name: 'Human Resources (HR)', displayOrder: 1 },
  { projectType: 'Malaria', facilityType: 'health_center', code: 'TRC', name: 'Travel Related Costs (TRC)', displayOrder: 2 }
];

// Dynamic Activities (replacing HEALTH_CENTER_ACTIVITIES, HOSPITAL_ACTIVITIES, TB_ACTIVITIES)
const DYNAMIC_ACTIVITIES = [
  // HIV Health Center HR Activities
  {
    projectType: 'HIV', facilityType: 'health_center', categoryCode: 'HR',
    name: 'Provide salaries for health facilities staff (DHs, HCs)',
    activityType: 'HC Nurses (A1) Salary', displayOrder: 1
  },
  {
    projectType: 'HIV', facilityType: 'health_center', categoryCode: 'HR',
    name: 'Provide salaries for health facilities staff (DHs, HCs)',
    activityType: 'HC Lab Technician (A1) Salary', displayOrder: 2
  },
  {
    projectType: 'HIV', facilityType: 'health_center', categoryCode: 'HR',
    name: 'Provide salaries for health facilities staff (DHs, HCs)',
    activityType: 'Bonus (All staff paid on GF)', displayOrder: 3,
    isAnnualOnly: true
  },
  
  // HIV Health Center TRC Activities
  {
    projectType: 'HIV', facilityType: 'health_center', categoryCode: 'TRC',
    name: 'Conduct support group meeting at Health Facilities especially for adolescents and children',
    activityType: 'Workshop', displayOrder: 1
  },
  {
    projectType: 'HIV', facilityType: 'health_center', categoryCode: 'TRC',
    name: 'Conduct supervision from Health centers to CHWs',
    activityType: 'Supervision (CHWs)', displayOrder: 2
  },
  
  // HIV Hospital HR Activities
  {
    projectType: 'HIV', facilityType: 'hospital', categoryCode: 'HR',
    name: 'Provide salaries for health facilities staff (DHs, HCs)',
    activityType: 'DH Medical Dr. Salary', displayOrder: 1
  },
  {
    projectType: 'HIV', facilityType: 'hospital', categoryCode: 'HR',
    name: 'Provide salaries for health facilities staff (DHs, HCs)', 
    activityType: 'Senior Medical Dr. Salary', displayOrder: 2
  },
  
  // HIV Hospital TRC Activities
  {
    projectType: 'HIV', facilityType: 'hospital', categoryCode: 'TRC',
    name: 'Conduct outreach to provide HIV testing service in communities',
    activityType: 'Campaign for HIV testing', displayOrder: 1
  },
  
  // TB Hospital Activities
  {
    projectType: 'TB', facilityType: 'hospital', categoryCode: 'HR',
    name: 'Salaries for the Provincial TB coordinators',
    activityType: 'Provincial TB Coordinator Salary', displayOrder: 1
  },
  {
    projectType: 'TB', facilityType: 'hospital', categoryCode: 'TRC',
    name: 'Conduct contacts tracing among TB cases contact by Health Care Providers at HCs (Refreshment or perdiem)',
    activityType: 'Contact Tracing (Perdiem)', displayOrder: 1
  }
];

// Statement Templates (replacing hard-coded statement mappings)
const STATEMENT_TEMPLATES = [
  {
    statementCode: 'REV_EXP',
    statementName: 'Statement of Revenue and Expenditures',
    lineItem: 'A. Receipts
```