/**
 * Example Usage: Expense-to-Payable Mapping Utility
 * 
 * This file demonstrates how to use the expense-to-payable mapping utility
 * in the execution payment tracking feature.
 */

import {
  generateExpenseToPayableMapping,
  getPayableCodeForExpense,
  getExpensesForPayable,
  validateMapping,
  getMappingDescription,
  type ExpenseToPayableMapping,
} from './expense-to-payable-mapping';

/**
 * Example 1: Generate mapping from activities data
 * 
 * This is typically done once when the form loads, using the activities
 * data from useExecutionActivities hook.
 */
export function exampleGenerateMapping(activities: any): ExpenseToPayableMapping {
  // Generate the mapping from the hierarchical activities data
  const mapping = generateExpenseToPayableMapping(activities);
  
  console.log('Generated mapping:', mapping);
  // Output example:
  // {
  //   "HIV_EXEC_HOSPITAL_B_B-01_1": "HIV_EXEC_HOSPITAL_E_1",
  //   "HIV_EXEC_HOSPITAL_B_B-01_2": "HIV_EXEC_HOSPITAL_E_1",
  //   "HIV_EXEC_HOSPITAL_B_B-02_1": "HIV_EXEC_HOSPITAL_E_2",
  //   ...
  // }
  
  return mapping;
}

/**
 * Example 2: Look up payable code for a specific expense
 * 
 * Use this when calculating which payable category should receive
 * the unpaid portion of an expense.
 */
export function exampleLookupPayable(
  expenseCode: string,
  mapping: ExpenseToPayableMapping
): string | null {
  // Get the payable code for a specific expense
  const payableCode = getPayableCodeForExpense(expenseCode, mapping);
  
  if (payableCode) {
    console.log(`Expense ${expenseCode} maps to payable ${payableCode}`);
  } else {
    console.log(`Expense ${expenseCode} has no payable mapping (e.g., transfers)`);
  }
  
  return payableCode;
}

/**
 * Example 3: Calculate payables from unpaid expenses
 * 
 * This shows how to use the mapping to compute payable totals
 * from expense payment data.
 */
export function exampleCalculatePayables(
  formData: Record<string, { amount: number; paymentStatus: string; amountPaid: number }>,
  mapping: ExpenseToPayableMapping
): Record<string, number> {
  const payables: Record<string, number> = {};
  
  // Iterate through all expenses
  Object.entries(formData).forEach(([expenseCode, data]) => {
    // Skip if not an expense (Section B)
    if (!expenseCode.includes('_B_')) {
      return;
    }
    
    // Calculate unpaid amount
    const unpaidAmount = data.amount - data.amountPaid;
    
    if (unpaidAmount > 0) {
      // Look up the corresponding payable
      const payableCode = getPayableCodeForExpense(expenseCode, mapping);
      
      if (payableCode) {
        // Add to the payable total
        payables[payableCode] = (payables[payableCode] || 0) + unpaidAmount;
      }
    }
  });
  
  console.log('Calculated payables:', payables);
  // Output example:
  // {
  //   "HIV_EXEC_HOSPITAL_E_1": 30000,  // Total unpaid salaries
  //   "HIV_EXEC_HOSPITAL_E_2": 5000,   // Total unpaid supervision
  //   "HIV_EXEC_HOSPITAL_E_4": 8000,   // Total unpaid sample transport
  //   ...
  // }
  
  return payables;
}

/**
 * Example 4: Find all expenses for a payable category
 * 
 * Useful for debugging or showing which expenses contribute to a payable.
 */
export function exampleFindExpensesForPayable(
  payableCode: string,
  mapping: ExpenseToPayableMapping
): string[] {
  const expenses = getExpensesForPayable(payableCode, mapping);
  
  console.log(`Expenses that map to ${payableCode}:`, expenses);
  // Output example:
  // [
  //   "HIV_EXEC_HOSPITAL_B_B-01_1",
  //   "HIV_EXEC_HOSPITAL_B_B-01_2"
  // ]
  
  return expenses;
}

/**
 * Example 5: Validate the mapping
 * 
 * Use this to ensure all expenses have proper payable mappings
 * (except B-05 transfers which should be null).
 */
export function exampleValidateMapping(
  mapping: ExpenseToPayableMapping,
  activities: any
): void {
  const validation = validateMapping(mapping, activities);
  
  if (validation.isValid) {
    console.log('✓ Mapping is valid');
  } else {
    console.error('✗ Mapping has issues:');
    console.error('Unmapped expenses:', validation.unmappedExpenses);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('Warnings:', validation.warnings);
  }
}

/**
 * Example 6: Get human-readable mapping description
 * 
 * Useful for debugging or displaying the mapping to users.
 */
export function exampleGetMappingDescription(
  mapping: ExpenseToPayableMapping,
  activities: any
): void {
  const descriptions = getMappingDescription(mapping, activities);
  
  console.log('Mapping descriptions:');
  descriptions.forEach(desc => {
    console.log(
      `${desc.expenseName} → ${desc.payableName || 'No payable (always paid)'}`
    );
  });
  
  // Output example:
  // Laboratory Technician → payable 1: salaries
  // Nurse → payable 1: salaries
  // Supervision CHWs → payable 2: supervision
  // Support group meetings → payable 3: meetings
  // ...
  // Transfer to RBC → No payable (always paid)
}

/**
 * Example 7: Complete integration in a React component
 * 
 * This shows how to use the mapping utility in the execution form.
 */
export function exampleReactIntegration() {
  // Pseudo-code for React component usage
  
  /*
  import { useExecutionActivities } from '@/hooks/queries/executions/use-execution-activities';
  import { generateExpenseToPayableMapping, getPayableCodeForExpense } from './expense-to-payable-mapping';
  
  function ExecutionForm() {
    const { data: activities } = useExecutionActivities({ projectType, facilityType });
    const [formData, setFormData] = useState({});
    
    // Generate mapping once when activities load
    const mapping = useMemo(() => {
      return generateExpenseToPayableMapping(activities);
    }, [activities]);
    
    // Calculate payables in real-time
    const payables = useMemo(() => {
      const result: Record<string, number> = {};
      
      Object.entries(formData).forEach(([code, data]) => {
        if (!code.includes('_B_')) return;
        
        const unpaid = data.amount - data.amountPaid;
        if (unpaid > 0) {
          const payableCode = getPayableCodeForExpense(code, mapping);
          if (payableCode) {
            result[payableCode] = (result[payableCode] || 0) + unpaid;
          }
        }
      });
      
      return result;
    }, [formData, mapping]);
    
    // Use payables to update Section E fields
    useEffect(() => {
      Object.entries(payables).forEach(([code, amount]) => {
        setFormData(prev => ({
          ...prev,
          [code]: { ...prev[code], amount }
        }));
      });
    }, [payables]);
    
    return <div>...</div>;
  }
  */
}
