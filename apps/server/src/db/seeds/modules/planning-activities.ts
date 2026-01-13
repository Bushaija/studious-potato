import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";

// ================== HELPER FUNCTIONS FOR DATA NORMALIZATION ==================

/**
 * Normalizes program type keys to match database values
 * Handles variations: MAL → Malaria, MALARIA → Malaria
 */
function normalizeProgramType(programKey: string): 'HIV' | 'Malaria' | 'TB' {
  if (programKey === 'MAL' || programKey === 'MALARIA') {
    return 'Malaria';
  }
  return programKey as 'HIV' | 'Malaria' | 'TB';
}

/**
 * Maps program keys to category display keys
 * Used for looking up category metadata in categoryDisplayNames
 */
function getCategoryDisplayKey(programKey: string): string {
  if (programKey === 'MAL') {
    return 'MALARIA';
  }
  return programKey;
}

/**
 * Generates fallback category descriptions based on category code
 * Used when category metadata is missing from categoryDisplayNames
 */
function deriveCategoryDescription(categoryCode: string): string {
  const descriptions: Record<string, string> = {
    HR: 'Human Resources - Staff salaries and bonuses',
    TRC: 'Travel Related Costs - Transportation and supervision',
    HPE: 'Health Products & Equipment - Equipment and infrastructure',
    PA: 'Program Administration Costs - Administrative expenses',
    EPID: 'Epidemiology - Epidemiological activities and training',
    PM: 'Program Management - Program administration and management',
    NG: 'Normal Grant',
    IRM: 'Insecticide Resistance Monitoring',
    ES: 'Entomological Surveillance',
  };
  
  return descriptions[categoryCode] || `${categoryCode} activities`;
}

// ================== INTERFACES ==================

interface PlanningActivityData {
  facilityType: 'hospital' | 'health_center';
  categoryCode: string;
  name: string;
  displayOrder: number;
  isAnnualOnly?: boolean;
}

// ================== NEW DATA STRUCTURES ==================

const programActivities: Record<string, PlanningActivityData[]> = {
  // ================== HIV PROGRAM ==================
HIV: [
    // Hospital Activities

    // Human Resources (HR)
    { facilityType: 'hospital', categoryCode: 'HR', name: 'DH Accountant', displayOrder: 1 },
    { facilityType: 'hospital', categoryCode: 'HR', name: 'DH Chief Medical Doctor or Mentor Doctor', displayOrder: 2 },
    { facilityType: 'hospital', categoryCode: 'HR', name: 'DH Senior Medical Doctor or Mentor Doctor', displayOrder: 3 },
    { facilityType: 'hospital', categoryCode: 'HR', name: 'DH Medical Doctor or Mentor Doctor', displayOrder: 4 },
    { facilityType: 'hospital', categoryCode: 'HR', name: 'DH Junior Medical Doctor or Mentor Doctor', displayOrder: 5 },
    { facilityType: 'hospital', categoryCode: 'HR', name: 'DH Pharmacist', displayOrder: 6 },
    { facilityType: 'hospital', categoryCode: 'HR', name: 'DH Clinical Mentor/Nurse', displayOrder: 7 },
    { facilityType: 'hospital', categoryCode: 'HR', name: 'All Staff Bonus', displayOrder: 8 },

    // Travel Related Costs (TRC)
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'Conduct outreach to provide HIV Testing service in community', displayOrder: 1 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'Conduct outreach VMMC provision at the centralized level', displayOrder: 2 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'Conduct district event related to WAD celebration', displayOrder: 3 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'Conduct census training (mission & transport for HC staff)', displayOrder: 4 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'Conduct integrated clinical mentorship from DH to HCs (mission)', displayOrder: 5 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'Conduct integrated clinical mentorship from DH to HCs (transport)', displayOrder: 6 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'Conduct annual cordination meeting at district level', displayOrder: 7 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'Conduct quarterly MTD meetings (mission)', displayOrder: 8 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'Conduct quarterly MTD meetings (transport)', displayOrder: 9 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'Conduct support group meetings', displayOrder: 10 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'Conduct home visit for lost to followup', displayOrder: 11 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'Conduct supervision & DQA from DH to HCs (mission)', displayOrder: 12 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'Conduct supervision & DQA from DH to HCs (transport)', displayOrder: 13 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'Conduct sample transportation from DH to RH/NRL', displayOrder: 14 },

    // Health Products & Equipment (HPE)
    { facilityType: 'hospital', categoryCode: 'HPE', name: 'Maintenance for motor car vehicles/medical equipments', displayOrder: 1 },

    // Program Administration Costs (PA)
    { facilityType: 'hospital', categoryCode: 'PA', name: 'Bank charges & commissions', displayOrder: 1 },
    { facilityType: 'hospital', categoryCode: 'PA', name: 'Fuel', displayOrder: 2 },
    { facilityType: 'hospital', categoryCode: 'PA', name: 'Communication (Airtime)', displayOrder: 3 },
    { facilityType: 'hospital', categoryCode: 'PA', name: 'Communication (Internet)', displayOrder: 4 },

    // Health Center Activities

    // Human Resources
    { facilityType: 'health_center', categoryCode: 'HR', name: 'HC Nurses (A1) Salary', displayOrder: 1 },
    { facilityType: 'health_center', categoryCode: 'HR', name: 'HC Lab Technician (A1) Salary', displayOrder: 2 },
    { facilityType: 'health_center', categoryCode: 'HR', name: 'Bonus (All staff paid on GF)', displayOrder: 3 },

    // TRC
    { facilityType: 'health_center', categoryCode: 'TRC', name: 'Conduct support group meetings', displayOrder: 1 },
    { facilityType: 'health_center', categoryCode: 'TRC', name: 'Supervision (CHWs)', displayOrder: 2 },
    { facilityType: 'health_center', categoryCode: 'TRC', name: 'Supervision (Home Visit)', displayOrder: 3 },
    { facilityType: 'health_center', categoryCode: 'TRC', name: 'Conduct sample transportation from HC to DH', displayOrder: 4 },

    // // HPE
    // { facilityType: 'health_center', categoryCode: 'HPE', name: 'Maintenance and Repair', displayOrder: 1 },

    // PA
    { facilityType: 'health_center', categoryCode: 'PA', name: 'Maintenance for motor car vehicles/medical equipments', displayOrder: 1 },
    { facilityType: 'health_center', categoryCode: 'PA', name: 'Communication (Airtime)', displayOrder: 2 },
    { facilityType: 'health_center', categoryCode: 'PA', name: 'Transport for reporting', displayOrder: 3 },
    { facilityType: 'health_center', categoryCode: 'PA', name: 'Office supplies', displayOrder: 4 },
    { facilityType: 'health_center', categoryCode: 'PA', name: 'Bank charges', displayOrder: 5 },
  ],

  // ---------------- MALARIA PROGRAM ----------------
  MAL: [
    // Hospital 

    // Epidemiology
    { facilityType: 'hospital', categoryCode: 'EPID', name: 'Provide perdiem to DH staff - quarterly cordination meeting', displayOrder: 1 },
    { facilityType: 'hospital', categoryCode: 'EPID', name: 'Provide perdiem to HCs staff - quarterly cordination meeting', displayOrder: 2 },
    { facilityType: 'hospital', categoryCode: 'EPID', name: 'Provide Mineral water to participants - quarterly cordination meeting', displayOrder: 3 },
    { facilityType: 'hospital', categoryCode: 'EPID', name: 'Provide transport to HCs staff - quarterly cordination meeting', displayOrder: 4 },
    { facilityType: 'hospital', categoryCode: 'EPID', name: 'Running costs - mission fees for report submission, office supplies', displayOrder: 5 },
    { facilityType: 'hospital', categoryCode: 'EPID', name: 'Bank Charges', displayOrder: 6 },
    { facilityType: 'hospital', categoryCode: 'EPID', name: 'DH CHW supervisor A0 salary', displayOrder: 7 },
    { facilityType: 'hospital', categoryCode: 'EPID', name: 'DH Lab technicians A0 salary', displayOrder: 8 },
    { facilityType: 'hospital', categoryCode: 'EPID', name: 'DH Nurses A1/A0 salary', displayOrder: 9 },
    { facilityType: 'hospital', categoryCode: 'EPID', name: 'Bonus for all Malaria staff', displayOrder: 10 },

    // Program Management
    // { facilityType: 'hospital', categoryCode: 'PM', name: 'Running costs', displayOrder: 1 },

    // Human Resources
    // { facilityType: 'hospital', categoryCode: 'HR', name: 'Supervisor Salary', displayOrder: 1 },
    // { facilityType: 'hospital', categoryCode: 'HR', name: 'DH CHWs supervisors A0', displayOrder: 1 },
    // { facilityType: 'hospital', categoryCode: 'HR', name: 'DH Lab technicians', displayOrder: 2 },
    // { facilityType: 'hospital', categoryCode: 'HR', name: 'DH Nurses A1', displayOrder: 3 },
    // { facilityType: 'hospital', categoryCode: 'HR', name: 'Provide Bonus', displayOrder: 4 },
    
    // Human Resources
    { facilityType: 'health_center', categoryCode: 'HR', name: 'Entomology technician team leaders', displayOrder: 1 },
    { facilityType: 'health_center', categoryCode: 'HR', name: 'Head of HC', displayOrder: 2 },
    { facilityType: 'health_center', categoryCode: 'HR', name: 'Entomology technicians collectors of LARVAE', displayOrder: 3 },
    { facilityType: 'health_center', categoryCode: 'HR', name: 'Support to CHWs', displayOrder: 4 },
    { facilityType: 'health_center', categoryCode: 'HR', name: 'Sentinel site accountant', displayOrder: 5 },
    
    // Insecticide resistance monitoring
    { facilityType: 'health_center', categoryCode: 'IRM', name: 'Communication for technician, head of HC, and accountant', displayOrder: 1 },
    { facilityType: 'health_center', categoryCode: 'IRM', name: 'Consumable for wild mosquito rearing', displayOrder: 2 },
    
    // Entomological Surveillance
    { facilityType: 'health_center', categoryCode: 'ES', name: 'Consumable for spraying catching', displayOrder: 1 },
    { facilityType: 'health_center', categoryCode: 'ES', name: 'Consumables for human landing catching', displayOrder: 2 },
    { facilityType: 'health_center', categoryCode: 'ES', name: 'Consumables for monitoring of breeding sites', displayOrder: 3 },
    { facilityType: 'health_center', categoryCode: 'ES', name: 'Equipments and other consumables (supplies, hiring, and internet)', displayOrder: 4 },
    { facilityType: 'health_center', categoryCode: 'ES', name: 'Perdeims and travel allowances (for entomological surveillance)', displayOrder: 5 },
    { facilityType: 'health_center', categoryCode: 'ES', name: 'Perdeims and travel allowances (tender budgets)', displayOrder: 6 },
    { facilityType: 'health_center', categoryCode: 'ES', name: 'Bank charges for entomology budgets', displayOrder: 7 },
    
    // Normal Grant
    { facilityType: 'health_center', categoryCode: 'NG', name: 'Supervision for CHW by HC in village per quarter', displayOrder: 1 },
    { facilityType: 'health_center', categoryCode: 'NG', name: 'Bank charges', displayOrder: 2 },
    { facilityType: 'health_center', categoryCode: 'NG', name: 'Transport for reporting', displayOrder: 3 },
  ],

  // ---------------- TB PROGRAM ----------------
  TB: [
    // Human Resources (HR)
    { facilityType: 'hospital', categoryCode: 'HR', name: 'Provincial TB Coordinator Salary', displayOrder: 1 },
    { facilityType: 'hospital', categoryCode: 'HR', name: 'Provincial TB Coordinator Bonus', displayOrder: 2 },
    { facilityType: 'hospital', categoryCode: 'HR', name: 'Salary for MDR TB staff (1MD/TB center for 2 MDR TB centers)', displayOrder: 3 },
    { facilityType: 'hospital', categoryCode: 'HR', name: 'Bonus for MDR TB staff (1MD/TB center for 2 MDR TB centers)', displayOrder: 4 },
    { facilityType: 'hospital', categoryCode: 'HR', name: 'Salary for MDR TB staff (5 nurses/TB center for 2 MDR TB centers)', displayOrder: 5 },
    { facilityType: 'hospital', categoryCode: 'HR', name: 'Bonus for MDR TB staff (5 nurses/TB center for 2 MDR TB centers)', displayOrder: 6 },

    // Travel Related Costs (TRC)
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'Contact Tracing (Perdiem)', displayOrder: 1 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'Contact Tracing (Transport)', displayOrder: 2 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'Contact Tracing (General)', displayOrder: 3 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'TPT Guidelines Mentoring (Mission)', displayOrder: 4 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'TPT Guidelines Mentoring (Transport)', displayOrder: 5 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'HCW Mentorship HC Level (Mission)', displayOrder: 6 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'HCW Mentorship HC Level (Transport)', displayOrder: 7 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'HCW Mentorship Community (Mission)', displayOrder: 8 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'HCW Mentorship Community (Transport)', displayOrder: 9 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'Outreach activity in slums, hotspots see HRG (HCs)', displayOrder: 10 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'Quarterly Evaluation Meetings (Transport)', displayOrder: 11 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'Quarterly Evaluation Meetings (Allowance)', displayOrder: 12 },
    { facilityType: 'hospital', categoryCode: 'TRC', name: 'Communication fees for MDR TB activities', displayOrder: 13 },
    
    // Program Administration Costs (PA)
    { facilityType: 'hospital', categoryCode: 'PA', name: 'Communication for TB provincial cordinator (Airtime)', displayOrder: 1 },
    { facilityType: 'hospital', categoryCode: 'PA', name: 'Running cost for hospital (reporting, mission and transport, office supplies and bank charges)', displayOrder: 2 },
  ]
};


const categoryDisplayNames: Record<string, Record<string, string>> = {
  HIV: {
    'HR': 'Human Resources (HR)',
    'TRC': 'Travel Related Costs (TRC)',
    'HPE': 'Health Products & Equipment (HPE)',
    'PA': 'Program Administration Costs (PA)'
  },
  MALARIA: {
    'HR': 'Human Resources (HR)',
    'EPID': 'Epidemiology (EPID)',
    'IRM': 'Insecticide Resistance Monitoring (IRM)',
    'ES': 'Entomological Surveillance (ES)',
    'NG': 'Normal Grant (NG)'
  },
  TB: {
    'HR': 'Human Resources (HR)',
    'TRC': 'Travel Related Costs (TRC)',
    'PA': 'Program Administration Costs (PA)'
  }
};

// Updated schema to support nested activities structure
const PLANNING_FORM_SCHEMA = {
  version: "1.0",
  title: "Annual Budget Planning Form",
  description: "Quarterly budget planning for health facility activities",
  dataStructure: "nested", // Indicates this schema uses nested activities
  sections: [
    {
      id: "activities",
      title: "Planning Activities",
      type: "nested_object",
      description: "Budget planning data organized by activity",
      fields: [
        {
          key: "activities",
          type: "object",
          label: "Activities",
          required: true,
          description: "Nested object where keys are activity IDs and values are activity data",
          // Define the schema for each activity item
          itemSchema: {
            type: "object",
            properties: {
              frequency: {
                type: "number",
                label: "Frequency",
                required: true,
                validation: { min: 0, step: 1 },
                defaultValue: 1,
                helpText: "Number of times this activity occurs (e.g., 12 for monthly salaries)"
              },
              unit_cost: {
                type: "currency",
                label: "Unit Cost",
                required: true,
                validation: { min: 0 },
                helpText: "Cost per unit for this activity"
              },
              q1_count: {
                type: "number",
                label: "Q1 Count",
                required: true,
                validation: { min: 0 },
                helpText: "Count for Quarter 1"
              },
              q2_count: {
                type: "number",
                label: "Q2 Count",
                required: true,
                validation: { min: 0 },
                helpText: "Count for Quarter 2"
              },
              q3_count: {
                type: "number",
                label: "Q3 Count",
                required: true,
                validation: { min: 0 },
                helpText: "Count for Quarter 3"
              },
              q4_count: {
                type: "number",
                label: "Q4 Count",
                required: true,
                validation: { min: 0 },
                helpText: "Count for Quarter 4"
              },
              // Computed fields (read-only)
              q1_amount: {
                type: "calculated",
                label: "Q1 Amount",
                computationFormula: "frequency * unit_cost * q1_count",
                readonly: true
              },
              q2_amount: {
                type: "calculated",
                label: "Q2 Amount",
                computationFormula: "frequency * unit_cost * q2_count",
                readonly: true
              },
              q3_amount: {
                type: "calculated",
                label: "Q3 Amount",
                computationFormula: "frequency * unit_cost * q3_count",
                readonly: true
              },
              q4_amount: {
                type: "calculated",
                label: "Q4 Amount",
                computationFormula: "frequency * unit_cost * q4_count",
                readonly: true
              },
              total_budget: {
                type: "calculated",
                label: "Total Budget",
                computationFormula: "q1_amount + q2_amount + q3_amount + q4_amount",
                readonly: true
              }
            }
          }
        }
      ]
    },
    {
      id: "additional_info",
      title: "Additional Information",
      fields: [
        {
          key: "comments",
          type: "textarea",
          label: "Comments",
          required: false,
          validation: { maxLength: 1000 },
          helpText: "Optional comments about the planning data"
        }
      ]
    }
  ],
  // Legacy sections kept for backward compatibility (not used with nested structure)
  legacySections: [
    {
      id: "activity_details",
      title: "Activity Details",
      fields: [
        {
          key: "activity_name",
          type: "readonly",
          label: "Activity",
          required: true
        },
        {
          key: "activity_type",
          type: "text",
          label: "Type",
          required: false,
          helpText: "Brief description of the activity type"
        }
      ]
    },
    {
      id: "planning_data",
      title: "Planning Data",
      fields: [
        {
          key: "frequency",
          type: "number",
          label: "Frequency",
          required: true,
          validation: { min: 0, step: 1 },
          defaultValue: 1
        },
        {
          key: "unit_cost",
          type: "currency",
          label: "Unit Cost ($)",
          required: true,
          validation: { min: 0 }
        }
      ]
    },
    {
      id: "quarterly_counts",
      title: "Quarterly Counts",
      fields: [
        {
          key: "q1_count",
          type: "number",
          label: "Q1 Count",
          required: true,
          validation: { min: 0 }
        },
        {
          key: "q2_count",
          type: "number",
          label: "Q2 Count",
          required: true,
          validation: { min: 0 }
        },
        {
          key: "q3_count",
          type: "number",
          label: "Q3 Count",
          required: true,
          validation: { min: 0 }
        },
        {
          key: "q4_count",
          type: "number",
          label: "Q4 Count",
          required: true,
          validation: { min: 0 }
        }
      ]
    },
    {
      id: "calculated_amounts",
      title: "Calculated Amounts",
      fields: [
        {
          key: "q1_amount",
          type: "calculated",
          label: "Q1 Amount ($)",
          computationFormula: "unit_cost * q1_count",
          readonly: true
        },
        {
          key: "q2_amount",
          type: "calculated",
          label: "Q2 Amount ($)",
          computationFormula: "unit_cost * q2_count",
          readonly: true
        },
        {
          key: "q3_amount",
          type: "calculated",
          label: "Q3 Amount ($)",
          computationFormula: "unit_cost * q3_count",
          readonly: true
        },
        {
          key: "q4_amount",
          type: "calculated",
          label: "Q4 Amount ($)",
          computationFormula: "unit_cost * q4_count",
          readonly: true
        },
        {
          key: "total_budget",
          type: "calculated",
          label: "Total Budget ($)",
          computationFormula: "q1_amount + q2_amount + q3_amount + q4_amount",
          readonly: true
        }
      ]
    },
    {
      id: "additional_info",
      title: "Additional Information",
      fields: [
        {
          key: "comments",
          type: "textarea",
          label: "Comments",
          required: false,
          helpText: "Additional notes or comments about this activity"
        }
      ]
    }
  ]
};

export async function seedEnhancedPlanningData(db: Database) {
  console.log("🌱 Starting enhanced planning data seeding...");

  try {
    // 1. Create form schemas for each program and facility type
    await seedFormSchemas(db);
    
    // 2. Create activity categories
    await seedSchemaActivityCategories(db);
    
    // 3. Create dynamic activities
    await seedDynamicActivities(db);
    
    // 4. Create event mappings
    await seedEventMappings(db);
    
    console.log("✅ Enhanced planning data seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error during planning data seeding:", error);
    throw error;
  }
}

async function seedFormSchemas(db: Database) {
  console.log("📝 Seeding form schemas...");

  // Get the first available user (system user) for created_by field
  const systemUser = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .limit(1);

  const createdBy = systemUser[0]?.id;
  let systemUserId: number | undefined = createdBy as number | undefined;
  if (!createdBy) {
    console.warn("No users found. Creating system user for form schemas...");
  }

  const finalCreatedBy = createdBy || systemUserId || systemUser[0]?.id;
  if (!finalCreatedBy) {
    throw new Error("Unable to create or find a user for form schema creation");
  }

  const formSchemas = [];

  // Extract program types from programActivities keys
  const programKeys = Object.keys(programActivities);

  for (const programKey of programKeys) {
    // Normalize program type for database (MAL → Malaria)
    const normalizedProgramType = normalizeProgramType(programKey);
    
    // Extract unique facility types from activities within this program
    const facilityTypesSet = new Set<'hospital' | 'health_center'>();
    for (const activity of programActivities[programKey]) {
      facilityTypesSet.add(activity.facilityType);
    }
    const facilityTypes = Array.from(facilityTypesSet);

    // Create form schema for each program-facility combination
    for (const facilityType of facilityTypes) {
      formSchemas.push({
        name: `${normalizedProgramType} Planning Form - ${facilityType}`,
        version: "1.0",
        projectType: normalizedProgramType,
        facilityType: facilityType,
        moduleType: 'planning' as const,
        isActive: true,
        schema: PLANNING_FORM_SCHEMA,
        metadata: {
          description: `Annual budget planning form for ${normalizedProgramType} program at ${facilityType} facilities`,
          createdFor: `${normalizedProgramType}_${facilityType}`,
          lastUpdated: new Date().toISOString()
        },
        createdBy: finalCreatedBy
      });
    }
  }

  await db.insert(schema.formSchemas).values(formSchemas).onConflictDoNothing();
  console.log(`✅ Seeded ${formSchemas.length} form schemas`);
}

async function seedSchemaActivityCategories(db: Database) {
  console.log("📂 Seeding schema activity categories...");

  const categories = [];
  
  // Extract program keys from programActivities
  const programKeys = Object.keys(programActivities);

  for (const programKey of programKeys) {
    // Normalize program type for database (MAL → Malaria)
    const normalizedProgramType = normalizeProgramType(programKey);
    
    // Get category display key for looking up metadata (MAL → MALARIA)
    const categoryDisplayKey = getCategoryDisplayKey(programKey);
    
    // Extract unique facility types from activities within this program
    const facilityTypesSet = new Set<'hospital' | 'health_center'>();
    for (const activity of programActivities[programKey]) {
      facilityTypesSet.add(activity.facilityType);
    }
    const facilityTypes = Array.from(facilityTypesSet);

    // Extract unique category codes from activities grouped by facility type
    for (const facilityType of facilityTypes) {
      // Get unique category codes for this program-facility combination
      const categoryCodes = new Set<string>();
      for (const activity of programActivities[programKey]) {
        if (activity.facilityType === facilityType) {
          categoryCodes.add(activity.categoryCode);
        }
      }

      // Create category entries with metadata lookup
      let displayOrder = 1;
      for (const categoryCode of Array.from(categoryCodes)) {
        // Look up category name from categoryDisplayNames
        const categoryName = categoryDisplayNames[categoryDisplayKey]?.[categoryCode];
        
        // Implement fallback logic for missing category metadata
        if (!categoryName) {
          console.warn(`⚠️  Category metadata not found for ${normalizedProgramType} (${categoryDisplayKey}) - ${categoryCode}. Using fallback.`);
        }
        
        const finalCategoryName = categoryName || categoryCode;
        
        // Calculate activity count per category from flat activity array
        const activityCount = programActivities[programKey].filter(
          activity => activity.facilityType === facilityType && activity.categoryCode === categoryCode
        ).length;

        categories.push({
          projectType: normalizedProgramType,
          facilityType: facilityType,
          code: categoryCode,
          name: finalCategoryName,
          moduleType: 'planning' as const,
          description: deriveCategoryDescription(categoryCode),
          displayOrder: displayOrder++,
          parentCategoryId: null,
          isComputed: false,
          computationFormula: null,
          metadata: {
            facilityApplicable: facilityType,
            programSpecific: normalizedProgramType,
            activityCount: activityCount
          },
          isActive: true
        });
      }
    }
  }

  await db.insert(schema.schemaActivityCategories).values(categories).onConflictDoNothing();
  console.log(`✅ Seeded ${categories.length} activity categories`);
}

async function seedDynamicActivities(db: Database) {
  console.log("🔧 Seeding dynamic activities...");

  const activities = [];

  const deriveActivityType = (categoryCode: string, fallback?: string | null): string | null => {
    const map: Record<string, string> = {
      HR: 'HR_SALARY',
      TRC: 'TRAVEL_COST',
      HPE: 'PRODUCTS_EQUIPMENT',
      PA: 'PROGRAM_ADMIN',
      EPID: 'EPIDEMIOLOGY',
      PM: 'PROGRAM_MANAGEMENT',
      NG: 'NORMAL_GRANT',
      IRM: 'INSECTICIDE_RESISTANCE_MONITORING',
      ES: 'ENTOMOLOGICAL_SURVEILLANCE',
    };
    return map[categoryCode] || (fallback ?? null);
  };

  // Iterate over programActivities object keys
  const programKeys = Object.keys(programActivities);

  for (const programKey of programKeys) {
    // Normalize program type for database (MAL → Malaria)
    const normalizedProgramType = normalizeProgramType(programKey);
    
    // Get all activities for this program
    const programActivityList = programActivities[programKey];
    
    // Group activities by facility type and category code
    const groupedActivities: Record<string, Record<string, PlanningActivityData[]>> = {};
    
    for (const activity of programActivityList) {
      const facilityType = activity.facilityType;
      const categoryCode = activity.categoryCode;
      
      if (!groupedActivities[facilityType]) {
        groupedActivities[facilityType] = {};
      }
      
      if (!groupedActivities[facilityType][categoryCode]) {
        groupedActivities[facilityType][categoryCode] = [];
      }
      
      groupedActivities[facilityType][categoryCode].push(activity);
    }
    
    // Process each facility type and category combination
    for (const facilityType of Object.keys(groupedActivities)) {
      for (const categoryCode of Object.keys(groupedActivities[facilityType])) {
        // Get the category ID
        const categoryResults = await db
          .select({ id: schema.schemaActivityCategories.id })
          .from(schema.schemaActivityCategories)
          .where(
            and(
              eq(schema.schemaActivityCategories.projectType, normalizedProgramType),
              eq(schema.schemaActivityCategories.facilityType, facilityType as 'hospital' | 'health_center'),
              eq(schema.schemaActivityCategories.code, categoryCode)
            )
          )
          .limit(1);

        const categoryId = categoryResults[0]?.id;
        if (!categoryId) {
          console.warn(`Category not found: ${normalizedProgramType}-${facilityType}-${categoryCode}`);
          continue;
        }

        // Filter activities by facility type and category code directly (no applicableTo logic)
        const relevantActivities = groupedActivities[facilityType][categoryCode];

        console.log(`Processing ${relevantActivities.length} activities for ${normalizedProgramType}-${facilityType}-${categoryCode}`);

        // Preserve activity properties (isAnnualOnly, displayOrder, etc.)
        for (const activity of relevantActivities) {
          activities.push({
            categoryId,
            projectType: normalizedProgramType,
            facilityType: activity.facilityType,
            moduleType: 'planning' as const,
            code: `${categoryCode}_${activity.displayOrder}`,
            name: activity.name,
            description: activity.name,
            activityType: deriveActivityType(categoryCode),
            displayOrder: activity.displayOrder,
            isTotalRow: false,
            isAnnualOnly: activity.isAnnualOnly || false,
            // Maintain existing activity metadata and field mappings
            fieldMappings: {
              frequency: "frequency",
              unitCost: "unit_cost",
              q1Count: "q1_count",
              q2Count: "q2_count",
              q3Count: "q3_count",
              q4Count: "q4_count",
              comments: "comments"
            },
            computationRules: {
              q1Amount: "unit_cost * q1_count",
              q2Amount: "unit_cost * q2_count",
              q3Amount: "unit_cost * q3_count",
              q4Amount: "unit_cost * q4_count",
              totalBudget: "q1_amount + q2_amount + q3_amount + q4_amount"
            },
            validationRules: {
              unitCost: { required: true, min: 0 },
              counts: { required: true, min: 0 }
            },
            metadata: {
              facilityType: activity.facilityType,
              categoryCode: categoryCode,
              isAnnualOnly: activity.isAnnualOnly || false,
              frequencyNote: "Frequency is descriptive only, not used in calculations"
            },
            isActive: true
          });
        }
      }
    }
  }

  console.log(`Preparing to insert ${activities.length} dynamic activities`);

  await db
    .insert(schema.dynamicActivities)
    .values(activities)
    .onConflictDoUpdate({
      target: [schema.dynamicActivities.categoryId, schema.dynamicActivities.code],
      set: {
        name: (schema.dynamicActivities as any).name,
        description: (schema.dynamicActivities as any).description,
        activityType: (schema.dynamicActivities as any).activityType,
        moduleType: (schema.dynamicActivities as any).moduleType,
        displayOrder: (schema.dynamicActivities as any).displayOrder,
        isTotalRow: (schema.dynamicActivities as any).isTotalRow,
        isAnnualOnly: (schema.dynamicActivities as any).isAnnualOnly,
        fieldMappings: (schema.dynamicActivities as any).fieldMappings,
        computationRules: (schema.dynamicActivities as any).computationRules,
        validationRules: (schema.dynamicActivities as any).validationRules,
        metadata: (schema.dynamicActivities as any).metadata,
        isActive: (schema.dynamicActivities as any).isActive,
        updatedAt: new Date(),
      },
    });
  console.log(`✅ Seeded ${activities.length} dynamic activities`);
}

async function seedEventMappings(db: Database) {
  console.log("🔗 Seeding configurable event mappings...");

  // Get the GOODS_SERVICES event (universal event for both planning and execution)
  const eventResults = await db
    .select({ id: schema.events.id })
    .from(schema.events)
    .where(eq(schema.events.code, 'GOODS_SERVICES_PLANNING'))
    .limit(1);

  let eventId = eventResults[0]?.id;
  if (!eventId) {
    console.error("GOODS_SERVICES_PLANNING event not found. This event should exist in the events seed.");
    return;
  }

  // Get all dynamic activities
  const activities = await db
    .select({ 
      id: schema.dynamicActivities.id,
      categoryId: schema.dynamicActivities.categoryId,
      projectType: schema.dynamicActivities.projectType,
      facilityType: schema.dynamicActivities.facilityType
    })
    .from(schema.dynamicActivities)
    .where(eq(schema.dynamicActivities.moduleType, 'planning'));

  // Create mappings for each activity
  const mappings = activities.map(activity => ({
    eventId: eventId || 0,
    activityId: activity.id,
    categoryId: activity.categoryId,
    projectType: activity.projectType,
    facilityType: activity.facilityType,
    mappingType: 'DIRECT' as const,
    mappingFormula: null,
    mappingRatio: '1.0000',
    isActive: true,
    effectiveFrom: new Date(),
    effectiveTo: null,
    metadata: {
      autoGenerated: true,
      mappingDescription: "Direct mapping from planning activity to financial statement"
    }
  }));

  await db
    .insert(schema.configurableEventMappings)
    .values(mappings)
    .onConflictDoNothing();
  console.log(`✅ Seeded ${mappings.length} configurable event mappings`);
}

// Helper function to seed data for a specific program
export async function seedProgramPlanningData(db: Database, projectType: 'HIV' | 'Malaria' | 'TB') {
  console.log(`🌱 Seeding planning data for ${projectType} program...`);
  
  const programKey = projectType === 'Malaria' ? 'MAL' : projectType;
  if (!programActivities[programKey]) {
    console.error(`Configuration not found for ${projectType}`);
    return;
  }

  // Create a temporary configuration with just this program
  const originalActivities = { ...programActivities };
  const tempActivities = { [programKey]: programActivities[programKey] };
  
  // Temporarily replace programActivities
  Object.keys(programActivities).forEach(key => delete programActivities[key]);
  Object.assign(programActivities, tempActivities);

  try {
    await seedEnhancedPlanningData(db);
    console.log(`✅ Completed seeding for ${projectType}`);
  } finally {
    // Restore original activities
    Object.keys(programActivities).forEach(key => delete programActivities[key]);
    Object.assign(programActivities, originalActivities);
  }
}

// Export individual seeding functions for flexibility
export {
  seedFormSchemas,
  seedSchemaActivityCategories,
  seedDynamicActivities,
  seedEventMappings,
  programActivities,
  categoryDisplayNames,
  PLANNING_FORM_SCHEMA
};

// Default export for backward compatibility
export default seedEnhancedPlanningData;