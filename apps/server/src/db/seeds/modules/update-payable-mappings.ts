/**
 * Update Payable Mappings Script
 * 
 * This script updates the payable_activity_id field in schema_activity_categories
 * to establish database-driven expense-to-payable mappings.
 * 
 * Run this after seeding activities to establish the mappings.
 */

import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, like } from "drizzle-orm";

interface PayableMapping {
  expenseName: string;
  payableName: string;
  subCategory: string;
}

// Define the expense-to-payable mappings
const PAYABLE_MAPPINGS: PayableMapping[] = [
  // B-01: Human Resources → Payable 1: Salaries
  { expenseName: 'Laboratory Technician', payableName: 'Payable 1: Salaries', subCategory: 'B-01' },
  { expenseName: 'Nurse', payableName: 'Payable 1: Salaries', subCategory: 'B-01' },
  
  // B-02: Monitoring & Evaluation
  { expenseName: 'Supervision CHWs', payableName: 'Payable 2: Supervision', subCategory: 'B-02' },
  { expenseName: 'Support group meetings', payableName: 'Payable 3: Meetings', subCategory: 'B-02' },
  
  // B-03: Living Support to Clients
  { expenseName: 'Sample transport', payableName: 'Payable 4: Sample transport', subCategory: 'B-03' },
  { expenseName: 'Home visit lost to follow up', payableName: 'Payable 5: Home visits', subCategory: 'B-03' },
  { expenseName: 'Transport and travel for survey/surveillance', payableName: 'Payable 6: Travel survellance', subCategory: 'B-03' },
  
  // B-04: Overheads
  { expenseName: 'Communication - Airtime', payableName: 'Payable 7: Communication - airtime', subCategory: 'B-04' },
  { expenseName: 'Communication - Internet', payableName: 'Payable 8: Communication - internet', subCategory: 'B-04' },
  { expenseName: 'Infrastructure support (maintenance)', payableName: 'Payable 9: Infrastructure support (maintenance)', subCategory: 'B-04' },
  { expenseName: 'Office supplies', payableName: 'Payable 10: Supplies', subCategory: 'B-04' },
  { expenseName: 'Transport and travel (Reporting)', payableName: 'Payable 11: Transport reporting', subCategory: 'B-04' },
  { expenseName: 'Bank charges', payableName: 'Payable 12: Bank charges', subCategory: 'B-04' },
  
  // B-05: Transfers → No payable (always paid immediately)
  // No mappings for B-05
];

export async function updatePayableMappings(db: Database) {
  console.log('\n🔗 Updating expense-to-payable mappings...\n');
  
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  
  for (const mapping of PAYABLE_MAPPINGS) {
    try {
      // Find all expense activities matching this name (across all projects and facilities)
      const expenseActivities = await db
        .select()
        .from(schema.schemaActivityCategories)
        .where(
          and(
            eq(schema.schemaActivityCategories.name, mapping.expenseName),
            eq(schema.schemaActivityCategories.moduleType, 'execution'),
            like(schema.schemaActivityCategories.subCategoryCode, `%${mapping.subCategory}%`)
          )
        );
      
      if (expenseActivities.length === 0) {
        errors.push(`⚠️  No expense activities found for: ${mapping.expenseName}`);
        errorCount++;
        continue;
      }
      
      // Find all payable activities matching this name (across all projects and facilities)
      const payableActivities = await db
        .select()
        .from(schema.schemaActivityCategories)
        .where(
          and(
            eq(schema.schemaActivityCategories.name, mapping.payableName),
            eq(schema.schemaActivityCategories.moduleType, 'execution')
          )
        );
      
      if (payableActivities.length === 0) {
        errors.push(`⚠️  No payable activities found for: ${mapping.payableName}`);
        errorCount++;
        continue;
      }
      
      // Update each expense activity to point to the corresponding payable
      // Match by project type and facility type
      for (const expense of expenseActivities) {
        const matchingPayable = payableActivities.find(
          p => p.projectType === expense.projectType && p.facilityType === expense.facilityType
        );
        
        if (!matchingPayable) {
          errors.push(
            `⚠️  No matching payable found for expense: ${expense.name} ` +
            `(${expense.projectType}, ${expense.facilityType})`
          );
          errorCount++;
          continue;
        }
        
        // Update the expense with the payable reference
        await db
          .update(schema.schemaActivityCategories)
          .set({ payableActivityId: matchingPayable.id })
          .where(eq(schema.schemaActivityCategories.id, expense.id));
        
        console.log(
          `✅ Mapped: ${expense.name} → ${matchingPayable.name} ` +
          `(${expense.projectType}, ${expense.facilityType})`
        );
        successCount++;
      }
      
    } catch (error) {
      errors.push(`❌ Error mapping ${mapping.expenseName}: ${error}`);
      errorCount++;
    }
  }
  
  console.log('\n📊 Mapping Summary:');
  console.log(`   ✅ Successful mappings: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    errors.forEach(error => console.log(`   ${error}`));
  }
  
  console.log('\n✨ Payable mapping update complete!\n');
}

// Export for use in main seed script
export default updatePayableMappings;
