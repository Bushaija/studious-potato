import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { SeedManager } from "../utils/seed-manager";
import { eq } from "drizzle-orm";

interface FormSchemaData {
  name: string;
  version: string;
  projectType: "HIV" | "Malaria" | "TB";
  facilityType: "hospital" | "health_center";
  moduleType: "planning" | "execution" | "reporting";
  schema: any;
  metadata?: any;
}

// Planning form schemas for different project types and facility types
const planningFormSchemas: FormSchemaData[] = [
  // HIV Planning Forms
  {
    name: "HIV Hospital Planning Form",
    version: "1.0",
    projectType: "HIV",
    facilityType: "hospital",
    moduleType: "planning",
    schema: {
      title: "HIV Hospital Planning Form",
      description: "Planning form for HIV program at hospital level",
      sections: [
        {
          id: "human_resources",
          title: "Human Resources",
          fields: [
            { key: "dh_medical_dr_salary", type: "planning_activity", required: true },
            { key: "senior_medical_dr_salary", type: "planning_activity", required: true },
            { key: "chief_medical_dr_salary", type: "planning_activity", required: true },
            { key: "junior_medical_dr_salary", type: "planning_activity", required: true },
            { key: "pharmacist_salary", type: "planning_activity", required: true },
            { key: "nurse_salary", type: "planning_activity", required: true },
            { key: "chw_supervisor_salary", type: "planning_activity", required: true },
            { key: "accountant_salary", type: "planning_activity", required: true },
            { key: "all_staff_bonus", type: "planning_activity", required: true }
          ]
        },
        {
          id: "travel_related_costs",
          title: "Travel Related Costs",
          fields: [
            { key: "campaign_hiv_testing", type: "planning_activity", required: true },
            { key: "campaign_all", type: "planning_activity", required: true },
            { key: "training", type: "planning_activity", required: true },
            { key: "supervision_all", type: "planning_activity", required: true },
            { key: "workshop_transport_perdiem", type: "planning_activity", required: true },
            { key: "meeting", type: "planning_activity", required: true },
            { key: "transport", type: "planning_activity", required: true }
          ]
        },
        {
          id: "health_products_equipment",
          title: "Health Products & Equipment",
          fields: [
            { key: "maintenance", type: "planning_activity", required: true }
          ]
        },
        {
          id: "program_administration",
          title: "Program Administration Costs",
          fields: [
            { key: "bank_charges", type: "planning_activity", required: true },
            { key: "fuel", type: "planning_activity", required: true },
            { key: "communication_airtime", type: "planning_activity", required: true },
            { key: "communication_internet", type: "planning_activity", required: true }
          ]
        }
      ]
    },
    metadata: {
      createdFor: "HIV program planning at hospital level",
      lastUpdated: new Date().toISOString()
    }
  },
  {
    name: "HIV Health Center Planning Form",
    version: "1.0",
    projectType: "HIV",
    facilityType: "health_center",
    moduleType: "planning",
    schema: {
      title: "HIV Health Center Planning Form",
      description: "Planning form for HIV program at health center level",
      sections: [
        {
          id: "human_resources",
          title: "Human Resources",
          fields: [
            { key: "hc_nurses_a1_salary", type: "planning_activity", required: true },
            { key: "hc_lab_technician_a1_salary", type: "planning_activity", required: true },
            { key: "bonus_all_staff_gf", type: "planning_activity", required: true }
          ]
        },
        {
          id: "travel_related_costs",
          title: "Travel Related Costs",
          fields: [
            { key: "workshop", type: "planning_activity", required: true },
            { key: "supervision_chws", type: "planning_activity", required: true },
            { key: "supervision_home_visit", type: "planning_activity", required: true },
            { key: "transport", type: "planning_activity", required: true }
          ]
        },
        {
          id: "health_products_equipment",
          title: "Health Products & Equipment",
          fields: [
            { key: "maintenance_repair", type: "planning_activity", required: true }
          ]
        },
        {
          id: "program_administration",
          title: "Program Administration Costs",
          fields: [
            { key: "communication", type: "planning_activity", required: true },
            { key: "office_supplies", type: "planning_activity", required: true },
            { key: "transport_mission_reporting", type: "planning_activity", required: true },
            { key: "bank_charges", type: "planning_activity", required: true }
          ]
        }
      ]
    },
    metadata: {
      createdFor: "HIV program planning at health center level",
      lastUpdated: new Date().toISOString()
    }
  },
  // Malaria Planning Forms
  {
    name: "Malaria Hospital Planning Form",
    version: "1.0",
    projectType: "Malaria",
    facilityType: "hospital",
    moduleType: "planning",
    schema: {
      title: "Malaria Hospital Planning Form",
      description: "Planning form for Malaria program at hospital level",
      sections: [
        {
          id: "epidemiology",
          title: "Epidemiology",
          fields: [
            { key: "participants_dhs_staff", type: "planning_activity", required: true },
            { key: "perdiem_hc_staff", type: "planning_activity", required: true },
            { key: "mineral_water_participants", type: "planning_activity", required: true },
            { key: "transport_remote_hcs", type: "planning_activity", required: true },
            { key: "bank_charges", type: "planning_activity", required: true }
          ]
        },
        {
          id: "program_management",
          title: "Program Management",
          fields: [
            { key: "running_costs", type: "planning_activity", required: true }
          ]
        },
        {
          id: "human_resources",
          title: "Human Resources",
          fields: [
            { key: "dh_chws_supervisors_a0", type: "planning_activity", required: true },
            { key: "dh_lab_technicians", type: "planning_activity", required: true },
            { key: "dh_nurses_a1", type: "planning_activity", required: true },
            { key: "provide_bonus", type: "planning_activity", required: true }
          ]
        }
      ]
    },
    metadata: {
      createdFor: "Malaria program planning at hospital level",
      lastUpdated: new Date().toISOString()
    }
  },
  {
    name: "Malaria Health Center Planning Form",
    version: "1.0",
    projectType: "Malaria",
    facilityType: "health_center",
    moduleType: "planning",
    schema: {
      title: "Malaria Health Center Planning Form",
      description: "Planning form for Malaria program at health center level",
      sections: [
        {
          id: "epidemiology",
          title: "Epidemiology",
          fields: [
            { key: "participants_dhs_staff", type: "planning_activity", required: true },
            { key: "perdiem_hc_staff", type: "planning_activity", required: true },
            { key: "mineral_water_participants", type: "planning_activity", required: true },
            { key: "transport_remote_hcs", type: "planning_activity", required: true },
            { key: "bank_charges", type: "planning_activity", required: true }
          ]
        },
        {
          id: "program_management",
          title: "Program Management",
          fields: [
            { key: "running_costs", type: "planning_activity", required: true }
          ]
        },
        {
          id: "human_resources",
          title: "Human Resources",
          fields: [
            { key: "dh_chws_supervisors_a0", type: "planning_activity", required: true },
            { key: "dh_lab_technicians", type: "planning_activity", required: true },
            { key: "dh_nurses_a1", type: "planning_activity", required: true },
            { key: "provide_bonus", type: "planning_activity", required: true }
          ]
        }
      ]
    },
    metadata: {
      createdFor: "Malaria program planning at health center level",
      lastUpdated: new Date().toISOString()
    }
  },
  // TB Planning Forms
  {
    name: "TB Hospital Planning Form",
    version: "1.0",
    projectType: "TB",
    facilityType: "hospital",
    moduleType: "planning",
    schema: {
      title: "TB Hospital Planning Form",
      description: "Planning form for TB program at hospital level",
      sections: [
        {
          id: "human_resources",
          title: "Human Resources",
          fields: [
            { key: "provincial_tb_coordinator_salary", type: "planning_activity", required: true },
            { key: "provincial_tb_coordinator_bonus", type: "planning_activity", required: true }
          ]
        },
        {
          id: "travel_related_costs",
          title: "Travel Related Costs",
          fields: [
            { key: "contact_tracing_perdiem", type: "planning_activity", required: true },
            { key: "contact_tracing_transport", type: "planning_activity", required: true },
            { key: "contact_tracing_general", type: "planning_activity", required: true },
            { key: "tpt_guidelines_mentoring_mission", type: "planning_activity", required: true },
            { key: "tpt_guidelines_mentoring_transport", type: "planning_activity", required: true },
            { key: "hcw_mentorship_hc_mission", type: "planning_activity", required: true },
            { key: "hcw_mentorship_hc_transport", type: "planning_activity", required: true },
            { key: "hcw_mentorship_community_mission", type: "planning_activity", required: true },
            { key: "hcw_mentorship_community_transport", type: "planning_activity", required: true },
            { key: "quarterly_evaluation_transport", type: "planning_activity", required: true },
            { key: "quarterly_evaluation_allowance", type: "planning_activity", required: true }
          ]
        },
        {
          id: "program_administration",
          title: "Program Administration Costs",
          fields: [
            { key: "hospital_running_costs", type: "planning_activity", required: true },
            { key: "bank_charges", type: "planning_activity", required: true },
            { key: "office_supplies", type: "planning_activity", required: true }
          ]
        }
      ]
    },
    metadata: {
      createdFor: "TB program planning at hospital level",
      lastUpdated: new Date().toISOString()
    }
  }
];

// Execution form schemas (simpler structure focusing on quarterly execution data)
const executionFormSchemas: FormSchemaData[] = [
  {
    name: "HIV Execution Form",
    version: "1.0",
    projectType: "HIV",
    facilityType: "hospital", // Same form for both facility types
    moduleType: "execution",
    schema: {
      title: "HIV Execution Form",
      description: "Quarterly execution reporting for HIV program",
      sections: [
        {
          id: "quarterly_execution",
          title: "Quarterly Execution Data",
          fields: [
            { key: "q1_amount", type: "currency", required: true },
            { key: "q2_amount", type: "currency", required: true },
            { key: "q3_amount", type: "currency", required: true },
            { key: "q4_amount", type: "currency", required: true },
            { key: "cumulative_balance", type: "currency", readonly: true, calculated: true },
            { key: "comment", type: "textarea", required: false }
          ]
        }
      ]
    },
    metadata: {
      createdFor: "HIV program execution reporting",
      calculatedFields: ["cumulative_balance"],
      lastUpdated: new Date().toISOString()
    }
  },
  {
    name: "Malaria Execution Form",
    version: "1.0",
    projectType: "Malaria",
    facilityType: "hospital",
    moduleType: "execution",
    schema: {
      title: "Malaria Execution Form",
      description: "Quarterly execution reporting for Malaria program",
      sections: [
        {
          id: "quarterly_execution",
          title: "Quarterly Execution Data",
          fields: [
            { key: "q1_amount", type: "currency", required: true },
            { key: "q2_amount", type: "currency", required: true },
            { key: "q3_amount", type: "currency", required: true },
            { key: "q4_amount", type: "currency", required: true },
            { key: "cumulative_balance", type: "currency", readonly: true, calculated: true },
            { key: "comment", type: "textarea", required: false }
          ]
        }
      ]
    },
    metadata: {
      createdFor: "Malaria program execution reporting",
      calculatedFields: ["cumulative_balance"],
      lastUpdated: new Date().toISOString()
    }
  },
  {
    name: "TB Execution Form",
    version: "1.0",
    projectType: "TB",
    facilityType: "hospital",
    moduleType: "execution",
    schema: {
      title: "TB Execution Form",
      description: "Quarterly execution reporting for TB program",
      sections: [
        {
          id: "quarterly_execution",
          title: "Quarterly Execution Data",
          fields: [
            { key: "q1_amount", type: "currency", required: true },
            { key: "q2_amount", type: "currency", required: true },
            { key: "q3_amount", type: "currency", required: true },
            { key: "q4_amount", type: "currency", required: true },
            { key: "cumulative_balance", type: "currency", readonly: true, calculated: true },
            { key: "comment", type: "textarea", required: false }
          ]
        }
      ]
    },
    metadata: {
      createdFor: "TB program execution reporting",
      calculatedFields: ["cumulative_balance"],
      lastUpdated: new Date().toISOString()
    }
  }
];

// Reporting form schemas
const reportingFormSchemas: FormSchemaData[] = [
  {
    name: "HIV Financial Reporting Form",
    version: "1.0",
    projectType: "HIV",
    facilityType: "hospital",
    moduleType: "reporting",
    schema: {
      title: "HIV Financial Reporting Form",
      description: "Financial statement reporting for HIV program",
      sections: [
        {
          id: "statement_preparation",
          title: "Financial Statement Preparation",
          fields: [
            { key: "reporting_period", type: "select", required: true },
            { key: "facility", type: "select", required: true },
            { key: "project", type: "select", required: true },
            { key: "prepared_by", type: "text", required: true },
            { key: "preparation_date", type: "date", required: true }
          ]
        }
      ]
    },
    metadata: {
      createdFor: "HIV program financial reporting",
      generatesStatements: ["REV_EXP", "ASSETS_LIAB", "CASH_FLOW", "NET_ASSETS_CHANGES", "BUDGET_VS_ACTUAL"],
      lastUpdated: new Date().toISOString()
    }
  }
];

const allFormSchemas = [
  ...planningFormSchemas,
  ...executionFormSchemas,
  ...reportingFormSchemas
];

/* eslint-disable no-console */
export default async function seed(db: Database) {
  console.log("Seeding form schemas...");

  // Get the admin user ID for createdBy field
  const adminUser = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, 'admin'))
    .limit(1);

  const createdBy = adminUser[0]?.id || 1; // fallback to ID 1 if no admin found

  const formSchemaRows = allFormSchemas.map((formSchema) => ({
    name: formSchema.name,
    version: formSchema.version,
    projectType: formSchema.projectType,
    facilityType: formSchema.facilityType,
    moduleType: formSchema.moduleType,
    isActive: true,
    schema: formSchema.schema,
    metadata: formSchema.metadata || {},
    createdBy,
  }));

  const seedManager = new SeedManager(db);
  await seedManager.seedWithConflictResolution(schema.formSchemas, formSchemaRows, {
    uniqueFields: ["name", "version", "projectType", "facilityType", "moduleType"],
    onConflict: "update",
    updateFields: ["isActive", "schema", "metadata", "createdBy"],
  });

  console.log(`Seeded ${formSchemaRows.length} form schemas:`)
  console.log(`- Planning forms: ${planningFormSchemas.length}`);
  console.log(`- Execution forms: ${executionFormSchemas.length}`);
  console.log(`- Reporting forms: ${reportingFormSchemas.length}`);
}