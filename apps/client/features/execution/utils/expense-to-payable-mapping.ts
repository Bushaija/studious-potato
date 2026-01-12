/**
 * Expense-to-Payable Mapping Utility
 * 
 * This utility generates mappings between Section B expense activities and Section E payable activities
 * based on the seeded activities data structure. Each expense item maps to a specific payable category.
 * 
 * Mapping Rules:
 * - B-01 (Human Resources) → E_1 (payable 1: salaries)
 * - B-02 (M&E) → E_2 (supervision), E_3 (meetings)
 * - B-03 (Living Support) → E_4 (sample transport), E_5 (home visits), E_6 (travel surveillance)
 * - B-04 (Overheads) → E_7 (infrastructure), E_8 (supplies), E_9 (transport reporting), E_10 (bank charges)
 * - B-05 (Transfers) → null (always paid, no payable)
 * - E_11 (VAT refund) → special case, not mapped from expenses
 */

export interface ExpenseToPayableMapping {
  [expenseCode: string]: string | null;
}

export interface PayableInfo {
  code: string;
  name: string;
  categoryCode: string;
}

export interface ExpenseInfo {
  code: string;
  name: string;
  subCategoryCode: string;
  payableCode: string | null;
}

/**
 * Generate expense-to-payable mapping from activities data
 * 
 * @param activities - Hierarchical activities data from useExecutionActivities
 * @returns Mapping object where keys are expense codes and values are payable codes
 */
export function generateExpenseToPayableMapping(
  activities: any
): ExpenseToPayableMapping {
  const mapping: ExpenseToPayableMapping = {};


  if (!activities) {
    return mapping;
  }

  // Get Section B (Expenditures) activities
  const sectionB = activities.B;
  if (!sectionB?.subCategories) {
    return mapping;
  }

  // Get Section E (Financial Liabilities) activities
  const sectionE = activities.E;
  if (!sectionE?.items) {
    return mapping;
  }

  // Extract payable items (excluding total row)
  const payableItems = sectionE.items.filter(
    (item: any) => !item.isTotalRow && !item.isComputed
  );

  // Create a lookup for payables by their name patterns
  const payablesByName: Record<string, string> = {};
  payableItems.forEach((item: any) => {
    const nameLower = item.name.toLowerCase();
    payablesByName[nameLower] = item.code;
  });

  // Map each expense to its corresponding payable
  Object.entries(sectionB.subCategories).forEach(([subCatCode, subCatData]: [string, any]) => {
    const items = subCatData.items || [];

    items.forEach((item: any, index: number) => {
      if (item.isTotalRow || item.isComputed) {
        return;
      }

      const expenseCode = item.code;
      const expenseNameLower = item.name.toLowerCase();

      // Map based on subcategory and expense name
      let payableCode: string | null = null;

      switch (subCatCode) {
        case 'B-01': // Human Resources + Bonus
          // All B-01 expenses map to "payable 1: salaries"
          payableCode = findPayableByPattern(payablesByName, ['salaries']);
          break;

        case 'B-02': // Monitoring & Evaluation
          if (expenseNameLower.includes('supervision')) {
            payableCode = findPayableByPattern(payablesByName, ['supervision']);
          } else if (expenseNameLower.includes('meeting')) {
            payableCode = findPayableByPattern(payablesByName, ['meetings']);
          }
          break;

        case 'B-03': // Living Support to Clients
          if (expenseNameLower.includes('sample') && expenseNameLower.includes('transport')) {
            payableCode = findPayableByPattern(payablesByName, ['sample transport']);
          } else if (expenseNameLower.includes('home') && expenseNameLower.includes('visit')) {
            payableCode = findPayableByPattern(payablesByName, ['home visits']);
          } else if (expenseNameLower.includes('travel') && expenseNameLower.includes('survey')) {
            payableCode = findPayableByPattern(payablesByName, ['travel survellance', 'travel surveillance']);
          }
          break;

        case 'B-04': // Overheads - VAT-based expenses use Payable 12-15
          if (expenseNameLower.includes('communication') && expenseNameLower.includes('all')) {
            payableCode = findPayableByPattern(payablesByName, ['payable 12', 'communication - all', 'communication all']);
          } else if (expenseNameLower.includes('maintenance')) {
            payableCode = findPayableByPattern(payablesByName, ['payable 13', 'maintenance']);
          } else if (expenseNameLower === 'fuel' || (expenseNameLower.includes('fuel') && !expenseNameLower.includes('refund'))) {
            payableCode = findPayableByPattern(payablesByName, ['payable 14', 'fuel']);
          } else if (expenseNameLower.includes('office') && expenseNameLower.includes('supplies')) {
            payableCode = findPayableByPattern(payablesByName, ['payable 15', 'office supplies', 'supplies']);
          } else if (expenseNameLower.includes('transport') && expenseNameLower.includes('reporting')) {
            payableCode = findPayableByPattern(payablesByName, ['transport reporting']);
          } else if (expenseNameLower.includes('bank') && expenseNameLower.includes('charges')) {
            payableCode = findPayableByPattern(payablesByName, ['bank charges']);
          } else if (expenseNameLower.includes('car') && expenseNameLower.includes('hiring')) {
            payableCode = findPayableByPattern(payablesByName, ['car hiring']);
          } else if (expenseNameLower.includes('consumable')) {
            payableCode = findPayableByPattern(payablesByName, ['consumable']);
          } else if (expenseNameLower.includes('transport') && expenseNameLower.includes('travel')) {
            payableCode = findPayableByPattern(payablesByName, ['transport', 'travel']);
          }
          break;

        case 'B-05': // Transfer to other entities
          // Transfers are always paid immediately, no payable
          payableCode = null;
          break;

        default:
          // Unknown subcategory
          payableCode = null;
      }

      mapping[expenseCode] = payableCode;
    });
  });

  return mapping;
}

/**
 * Find a payable code by matching name patterns
 * Searches for patterns within payable names (partial match)
 */
function findPayableByPattern(
  payablesByName: Record<string, string>,
  patterns: string[]
): string | null {
  for (const pattern of patterns) {
    // First try exact match
    if (payablesByName[pattern]) {
      return payablesByName[pattern];
    }

    // Then try partial match (pattern contained in payable name)
    for (const [payableName, code] of Object.entries(payablesByName)) {
      if (payableName.includes(pattern)) {
        return code;
      }
    }
  }

  console.log(`⚠️ [findPayableByPattern] No match found for patterns:`, patterns);
  return null;
}

/**
 * Get the payable code for a given expense code
 * 
 * @param expenseCode - The expense activity code (e.g., "HIV_EXEC_HOSPITAL_B_B-01_1")
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

/**
 * Validate that all expenses have valid payable mappings (except B-05)
 * 
 * @param mapping - The expense-to-payable mapping
 * @param activities - The activities data
 * @returns Object with validation results
 */
export function validateMapping(
  mapping: ExpenseToPayableMapping,
  activities: any
): {
  isValid: boolean;
  unmappedExpenses: string[];
  warnings: string[];
} {
  const unmappedExpenses: string[] = [];
  const warnings: string[] = [];

  if (!activities?.B?.subCategories) {
    return {
      isValid: false,
      unmappedExpenses: [],
      warnings: ['Section B data not available'],
    };
  }

  Object.entries(activities.B.subCategories).forEach(([subCatCode, subCatData]: [string, any]) => {
    const items = subCatData.items || [];

    items.forEach((item: any) => {
      if (item.isTotalRow || item.isComputed) {
        return;
      }

      const expenseCode = item.code;
      const payableCode = mapping[expenseCode];

      // B-05 (Transfers) should have null mapping
      if (subCatCode === 'B-05') {
        if (payableCode !== null) {
          warnings.push(`${expenseCode} (Transfer) should not have a payable mapping`);
        }
      } else {
        // All other expenses should have a payable mapping
        if (!payableCode) {
          unmappedExpenses.push(expenseCode);
        }
      }
    });
  });

  return {
    isValid: unmappedExpenses.length === 0,
    unmappedExpenses,
    warnings,
  };
}

/**
 * Get a human-readable description of the mapping
 * 
 * @param mapping - The expense-to-payable mapping
 * @param activities - The activities data
 * @returns Array of mapping descriptions
 */
export function getMappingDescription(
  mapping: ExpenseToPayableMapping,
  activities: any
): Array<{
  expenseCode: string;
  expenseName: string;
  payableCode: string | null;
  payableName: string | null;
}> {
  const descriptions: Array<{
    expenseCode: string;
    expenseName: string;
    payableCode: string | null;
    payableName: string | null;
  }> = [];

  if (!activities?.B?.subCategories || !activities?.E?.items) {
    return descriptions;
  }

  // Create payable lookup
  const payableLookup: Record<string, string> = {};
  activities.E.items.forEach((item: any) => {
    payableLookup[item.code] = item.name;
  });

  // Build descriptions
  Object.entries(activities.B.subCategories).forEach(([subCatCode, subCatData]: [string, any]) => {
    const items = subCatData.items || [];

    items.forEach((item: any) => {
      if (item.isTotalRow || item.isComputed) {
        return;
      }

      const expenseCode = item.code;
      const payableCode = mapping[expenseCode];

      descriptions.push({
        expenseCode,
        expenseName: item.name,
        payableCode,
        payableName: payableCode ? payableLookup[payableCode] || 'Unknown' : null,
      });
    });
  });

  return descriptions;
}
