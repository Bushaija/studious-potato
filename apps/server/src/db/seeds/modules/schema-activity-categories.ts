import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { SeedManager } from "../utils/seed-manager";

interface SchemaActivityCategoryData {
  projectType: "HIV" | "Malaria" | "TB";
  facilityType?: "hospital" | "health_center"; // null means applies to both
  code: string;
  name: string;
  description?: string;
  displayOrder: number;
  parentCategoryCode?: string; // For hierarchical categories
  isComputed?: boolean;
  computationFormula?: string;
}

// HIV Program Categories (Execution/Reporting focused)
const hivExecutionCategories: SchemaActivityCategoryData[] = [
  // Top-level categories
  { projectType: 'HIV', code: 'A', name: 'A. Receipts', displayOrder: 1 },
  { projectType: 'HIV', code: 'B', name: 'B. Expenditures', displayOrder: 2 },
  { projectType: 'HIV', code: 'C', name: 'C. SURPLUS / DEFICIT', displayOrder: 3, isComputed: true, computationFormula: 'A - B' },
  { projectType: 'HIV', code: 'D', name: 'D. Financial Assets', displayOrder: 4 },
  { projectType: 'HIV', code: 'E', name: 'E. Financial Liabilities', displayOrder: 5 },
  { projectType: 'HIV', code: 'F', name: 'F. Net Financial Assets', displayOrder: 6, isComputed: true, computationFormula: 'D - E' },
  { projectType: 'HIV', code: 'G', name: 'G. Closing Balance', displayOrder: 7 },

  // Sub-categories under B. Expenditures
  { projectType: 'HIV', code: 'B-01', name: 'Human Resources + BONUS', parentCategoryCode: 'B', displayOrder: 1, description: 'Staff salaries and bonuses' },
  { projectType: 'HIV', code: 'B-02', name: 'Monitoring & Evaluation', parentCategoryCode: 'B', displayOrder: 2, description: 'M&E activities and supervision' },
  { projectType: 'HIV', code: 'B-03', name: 'Living Support to Clients/Target Populations', parentCategoryCode: 'B', displayOrder: 3, description: 'Direct client support services' },
  { projectType: 'HIV', code: 'B-04', name: 'Overheads (22 - Use of goods & services)', parentCategoryCode: 'B', displayOrder: 4, description: 'Administrative and operational costs' },
  { projectType: 'HIV', code: 'B-05', name: 'Transfer to other reporting entities', parentCategoryCode: 'B', displayOrder: 5, description: 'Transfers to other entities' },
];

// HIV Planning Categories (by facility type)
const hivPlanningCategories: SchemaActivityCategoryData[] = [
  // Hospital categories
  { projectType: 'HIV', facilityType: 'hospital', code: 'HR', name: 'Human Resources', displayOrder: 1, description: 'Hospital-level human resources planning' },
  { projectType: 'HIV', facilityType: 'hospital', code: 'TRC', name: 'Travel Related Costs', displayOrder: 2, description: 'Hospital-level travel and training costs' },
  { projectType: 'HIV', facilityType: 'hospital', code: 'HPE', name: 'Health Products & Equipment', displayOrder: 3, description: 'Hospital-level equipment and maintenance' },
  { projectType: 'HIV', facilityType: 'hospital', code: 'PA', name: 'Program Administration Costs', displayOrder: 4, description: 'Hospital-level administrative costs' },

  // Health center categories  
  { projectType: 'HIV', facilityType: 'health_center', code: 'HR', name: 'Human Resources', displayOrder: 1, description: 'Health center-level human resources planning' },
  { projectType: 'HIV', facilityType: 'health_center', code: 'TRC', name: 'Travel Related Costs', displayOrder: 2, description: 'Health center-level travel and training costs' },
  { projectType: 'HIV', facilityType: 'health_center', code: 'HPE', name: 'Health Products & Equipment', displayOrder: 3, description: 'Health center-level equipment and maintenance' },
  { projectType: 'HIV', facilityType: 'health_center', code: 'PA', name: 'Program Administration Costs', displayOrder: 4, description: 'Health center-level administrative costs' },
];

// Malaria Program Categories
const malariaExecutionCategories: SchemaActivityCategoryData[] = [
  { projectType: 'Malaria', code: 'A', name: 'A. Receipts', displayOrder: 1 },
  { projectType: 'Malaria', code: 'B', name: 'B. Expenditures', displayOrder: 2 },
  { projectType: 'Malaria', code: 'C', name: 'C. SURPLUS / DEFICIT', displayOrder: 3, isComputed: true, computationFormula: 'A - B' },
  { projectType: 'Malaria', code: 'D', name: 'D. Financial Assets', displayOrder: 4 },
  { projectType: 'Malaria', code: 'E', name: 'E. Financial Liabilities', displayOrder: 5 },
  { projectType: 'Malaria', code: 'F', name: 'F. Net Financial Assets', displayOrder: 6, isComputed: true, computationFormula: 'D - E' },
  { projectType: 'Malaria', code: 'G', name: 'G. Closing Balance', displayOrder: 7 },
];

const malariaPlanningCategories: SchemaActivityCategoryData[] = [
  // Both facility types get same categories for Malaria
  { projectType: 'Malaria', facilityType: 'hospital', code: 'EPID', name: 'Epidemiology', displayOrder: 1, description: 'Epidemiological activities and surveillance' },
  { projectType: 'Malaria', facilityType: 'hospital', code: 'PM', name: 'Program Management', displayOrder: 2, description: 'Program management and running costs' },
  { projectType: 'Malaria', facilityType: 'hospital', code: 'HR', name: 'Human Resources', displayOrder: 3, description: 'Human resources for malaria program' },
  
  { projectType: 'Malaria', facilityType: 'health_center', code: 'EPID', name: 'Epidemiology', displayOrder: 1, description: 'Epidemiological activities and surveillance' },
  { projectType: 'Malaria', facilityType: 'health_center', code: 'PM', name: 'Program Management', displayOrder: 2, description: 'Program management and running costs' },
  { projectType: 'Malaria', facilityType: 'health_center', code: 'HR', name: 'Human Resources', displayOrder: 3, description: 'Human resources for malaria program' },
];

// TB Program Categories
const tbExecutionCategories: SchemaActivityCategoryData[] = [
  { projectType: 'TB', code: 'A', name: 'A. Receipts', displayOrder: 1 },
  { projectType: 'TB', code: 'B', name: 'B. Expenditures', displayOrder: 2 },
  { projectType: 'TB', code: 'C', name: 'C. SURPLUS / DEFICIT', displayOrder: 3, isComputed: true, computationFormula: 'A - B' },
  { projectType: 'TB', code: 'D', name: 'D. Financial Assets', displayOrder: 4 },
  { projectType: 'TB', code: 'E', name: 'E. Financial Liabilities', displayOrder: 5 },
  { projectType: 'TB', code: 'F', name: 'F. Net Financial Assets', displayOrder: 6, isComputed: true, computationFormula: 'D - E' },
  { projectType: 'TB', code: 'G', name: 'G. Closing Balance', displayOrder: 7 },
];

const tbPlanningCategories: SchemaActivityCategoryData[] = [
  // TB categories for both facility types
  { projectType: 'TB', facilityType: 'hospital', code: 'HR', name: 'Human Resources', displayOrder: 1, description: 'TB program human resources' },
  { projectType: 'TB', facilityType: 'hospital', code: 'TRC', name: 'Travel Related Costs', displayOrder: 2, description: 'TB program travel and training costs' },
  { projectType: 'TB', facilityType: 'hospital', code: 'PA', name: 'Program Administration Costs', displayOrder: 3, description: 'TB program administrative costs' },
  
  { projectType: 'TB', facilityType: 'health_center', code: 'HR', name: 'Human Resources', displayOrder: 1, description: 'TB program human resources' },
  { projectType: 'TB', facilityType: 'health_center', code: 'TRC', name: 'Travel Related Costs', displayOrder: 2, description: 'TB program travel and training costs' },
  { projectType: 'TB', facilityType: 'health_center', code: 'PA', name: 'Program Administration Costs', displayOrder: 3, description: 'TB program administrative costs' },
];

// Combine all categories
const allSchemaCategories = [
  ...hivExecutionCategories,
  ...hivPlanningCategories,
  ...malariaExecutionCategories,
  ...malariaPlanningCategories,
  ...tbExecutionCategories,
  ...tbPlanningCategories,
];

/* eslint-disable no-console */
export async function seedSchemaActivityCategories(
  db: Database,
  projectType?: "HIV" | "Malaria" | "TB"
) {
  console.log(`Seeding schema activity categories${projectType ? ` for ${projectType}` : ''}...`);

  // Filter categories by project type if specified
  const categoriesToSeed = projectType 
    ? allSchemaCategories.filter(cat => cat.projectType === projectType)
    : allSchemaCategories;

  if (categoriesToSeed.length === 0) {
    console.warn(`No categories found${projectType ? ` for project type ${projectType}` : ''}`);
    return;
  }

  // First pass: Create all categories without parent relationships
  const categoryRows = categoriesToSeed.map(cat => ({
    projectType: cat.projectType,
    facilityType: cat.facilityType || null,
    code: cat.code,
    name: cat.name,
    description: cat.description || null,
    displayOrder: cat.displayOrder,
    parentCategoryId: null, // Will be updated in second pass
    isComputed: cat.isComputed || false,
    computationFormula: cat.computationFormula || null,
    metadata: {},
    isActive: true,
  }));

  const seedManager = new SeedManager(db);
  await seedManager.seedWithConflictResolution(schema.schemaActivityCategories, categoryRows, {
    uniqueFields: ["projectType", "facilityType", "code"],
    onConflict: "update",
    updateFields: ["name", "description", "displayOrder", "isComputed", "computationFormula", "metadata", "isActive"],
  });

  // Second pass: Update parent relationships for hierarchical categories
  const categoriesWithParents = categoriesToSeed.filter(cat => cat.parentCategoryCode);
  
  if (categoriesWithParents.length > 0) {
    console.log(`Updating ${categoriesWithParents.length} parent category relationships...`);
    
    // Get all inserted categories to build parent map
    const allInsertedCategories = await db
      .select({ 
        id: schema.schemaActivityCategories.id, 
        code: schema.schemaActivityCategories.code,
        projectType: schema.schemaActivityCategories.projectType,
        facilityType: schema.schemaActivityCategories.facilityType
      })
      .from(schema.schemaActivityCategories);

    // Build a map for finding parent IDs
    const categoryMap = new Map<string, number>();
    allInsertedCategories.forEach(cat => {
      const key = `${cat.projectType}|${cat.facilityType || 'null'}|${cat.code}`;
      categoryMap.set(key, cat.id);
    });

    // Update each category with its parent
    for (const cat of categoriesWithParents) {
      if (cat.parentCategoryCode) {
        const parentKey = `${cat.projectType}|${cat.facilityType || 'null'}|${cat.parentCategoryCode}`;
        const parentId = categoryMap.get(parentKey);
        
        if (parentId) {
          const childKey = `${cat.projectType}|${cat.facilityType || 'null'}|${cat.code}`;
          const childId = categoryMap.get(childKey);
          
          if (childId) {
            await db
              .update(schema.schemaActivityCategories)
              .set({ parentCategoryId: parentId })
              .where(eq(schema.schemaActivityCategories.id, childId));
          }
        } else {
          console.warn(`Parent category ${cat.parentCategoryCode} not found for ${cat.code}`);
        }
      }
    }
  }

  console.log(`Seeded ${categoryRows.length} schema activity categories`);
  
  // Log summary by project type
  const summary = categoriesToSeed.reduce((acc, cat) => {
    const key = `${cat.projectType}${cat.facilityType ? ` (${cat.facilityType})` : ''}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log("Summary:", Object.entries(summary)
    .map(([key, count]) => `${count} ${key}`)
    .join(", "));
}

export default async function seed(db: Database) {
  await seedSchemaActivityCategories(db);
}