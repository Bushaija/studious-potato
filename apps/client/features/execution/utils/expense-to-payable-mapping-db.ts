/**
 * Database-Driven Expense-to-Payable Mapping Utility
 * 
 * This utility generates mappings between Section B expense activities and Section E payable activities
 * by reading the payable_activity_id field from the activities data structure.
 * 
 * This replaces the hardcoded mapping logic with a data-driven approach.
 */

export interface ExpenseToPayableMapping {
  [expenseCode: string]: string | null;
}

/**
 * Generate expense-to-payable mapping from activities data (database-driven)
 * 
 * @param activities - Hierarchical activities data from useExecutionActivities
 * @returns Mapping object where keys are expense codes and values are payable codes
 */
export function generateExpenseToPayableMappingFromDB(
  activities: any
): ExpenseToPayableMapping {
  const mapping: ExpenseToPayableMapping = {};

  console.log('🗺️ [generateExpenseToPayableMappingFromDB] Starting DB-driven mapping generation');

  if (!activities) {
    console.log('⚠️ [generateExpenseToPayableMappingFromDB] No activities provided');
    return mapping;
  }

  // Get Section B (Expenditures) activities
  const sectionB = activities.B;
  if (!sectionB?.subCategories) {
    console.log('⚠️ [generateExpenseToPayableMappingFromDB] No Section B subCategories found');
    return mapping;
  }

  console.log('✅ [generateExpenseToPayableMappingFromDB] Found Section B:', {
    sectionBSubCategories: Object.keys(sectionB.subCategories),
  });

  // Extract payable mappings from each expense item
  Object.entries(sectionB.subCategories).forEach(([subCatCode, subCatData]: [string, any]) => {
    const items = subCatData.items || [];

    items.forEach((item: any) => {
      if (item.isTotalRow || item.isComputed) {
        return;
      }

      const expenseCode = item.code;
      
      // Read the payable code from the item's metadata or payableCode field
      // This should be populated from the database's payable_activity_id field
      const payableCode = item.payableCode || item.metadata?.payableCode || null;

      mapping[expenseCode] = payableCode;
      
      if (payableCode) {
        console.log(`✅ [DB Mapping] ${expenseCode} → ${payableCode}`);
      } else {
        console.log(`⚠️ [DB Mapping] ${expenseCode} → NO MAPPING (${subCatCode})`);
      }
    });
  });

  console.log('🎯 [generateExpenseToPayableMappingFromDB] Final mapping:', {
    totalMappings: Object.keys(mapping).length,
    mappingsWithPayables: Object.values(mapping).filter(v => v !== null).length,
    mappingsWithoutPayables: Object.values(mapping).filter(v => v === null).length,
  });

  return mapping;
}

/**
 * Get the payable code for a given expense code
 * 
 * @param expenseCode - The expense activity code
 * @param mapping - The expense-to-payable mapping
 * @returns The corresponding payable code or null if no mapping exists
 */
export function getPayableCodeForExpense(
  expenseCode: string,
  mapping: ExpenseToPayableMapping
): string | null {
  return mapping[expenseCode] ?? null;
}

/**
 * Get all expense codes that map to a specific payable code
 * 
 * @param payableCode - The payable activity code
 * @param mapping - The expense-to-payable mapping
 * @returns Array of expense codes that map to this payable
 */
export function getExpensesForPayable(
  payableCode: string,
  mapping: ExpenseToPayableMapping
): string[] {
  return Object.entries(mapping)
    .filter(([_, payable]) => payable === payableCode)
    .map(([expense, _]) => expense);
}
