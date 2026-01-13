import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from "react-hook-form";
import { useGetExecutionSchema } from "./queries/executions/use-get-execution-schema";
import { useExecutionActivities } from "./queries/executions/use-execution-activities";
import { useCalculateExecutionBalances } from "./mutations/executions/use-calculate-execution-balances";
import { useValidateAccountingEquation } from "./mutations/executions/use-validate-accounting-equation";
import { useDebounce } from "@/hooks/use-debounce";
import { 
  validateFormData, 
  isOpeningBalanceField,
  type ValidationError 
} from "@/features/execution/utils/form-validation";
import { useExecutionFormLoader } from "@/features/execution/hooks/use-execution-form-loader";
import { usePlanningDataSummary } from "./queries/planning/use-planning-data-summary";

type ProjectType = "HIV" | "MAL" | "TB"; // Changed from "Malaria" to "MAL" for consistency with activity codes
type FacilityType = "hospital" | "health_center";
type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

interface UseExecutionFormParams {
  projectType: ProjectType;
  facilityType: FacilityType;
  quarter: Quarter;
  initialData?: Record<string, any>;
  onDataChange?: (data: Record<string, any>) => void;
  validationMode?: "onChange" | "onBlur" | "manual";
  executionId?: number;
  projectId?: number;
  facilityId?: number;
  reportingPeriodId?: number;
}

type PaymentStatus = "paid" | "unpaid" | "partial";

interface ActivityQuarterValues {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  comment?: string;
  // Payment status can be either a single value (old format) or quarter-specific (new format)
  paymentStatus?: PaymentStatus | Record<string, PaymentStatus>;
  amountPaid?: number | Record<string, number>;
  // VAT tracking fields (quarter-specific)
  netAmount?: Record<string, number>;      // Net amount per quarter (for VAT-applicable expenses)
  vatAmount?: Record<string, number>;      // VAT amount per quarter (for VAT-applicable expenses)
  vatCleared?: Record<string, number>;     // VAT cleared per quarter (for VAT-applicable expenses)
  // Payable tracking fields (quarter-specific)
  payableCleared?: Record<string, number>; // Payable cleared per quarter (for payables in Section E)
  // Other Receivable tracking fields (quarter-specific)
  otherReceivableCleared?: Record<string, number>; // Other receivable cleared per quarter (for Other Receivables in Section D)
  // Prior year adjustment tracking (quarter-specific)
  priorYearAdjustment?: Record<string, number>; // Prior year adjustment per quarter (for payables/receivables)
}

export function useExecutionForm({
  projectType,
  facilityType,
  quarter,
  initialData,
  onDataChange,
  validationMode = "onBlur",
  executionId,
  projectId,
  facilityId,
  reportingPeriodId,
}: UseExecutionFormParams) {
  // Initialize backward compatibility loader (Requirements: 7.1, 7.2, 7.3, 7.4, 7.5)
  const { loadFormData } = useExecutionFormLoader();
  
  // Migrate initial data if it contains old VAT structure
  const migratedInitialData = useMemo(() => {
    if (!initialData) return {};
    const result = loadFormData(initialData as any);
    return result.data as Record<string, ActivityQuarterValues>;
  }, [initialData, loadFormData]);
  
  // Extract previousQuarterBalances from initialData for rollover calculations
  const previousQuarterBalances = useMemo(() => {
    const balances = initialData?.previousQuarterBalances || null;
    
    console.log('🔄 [Rollover Debug] Previous Quarter Balances Initialized:', {
      exists: balances?.exists,
      quarter: balances?.quarter,
      executionId: balances?.executionId,
      hasClosingBalances: !!balances?.closingBalances,
      closingBalancesStructure: balances?.closingBalances ? {
        hasSectionD: !!balances.closingBalances.D,
        hasSectionE: !!balances.closingBalances.E,
        hasVAT: !!balances.closingBalances.VAT,
        sectionDCount: balances.closingBalances.D ? Object.keys(balances.closingBalances.D).length : 0,
        sectionECount: balances.closingBalances.E ? Object.keys(balances.closingBalances.E).length : 0,
        sectionDSample: balances.closingBalances.D ? Object.keys(balances.closingBalances.D).slice(0, 5) : [],
        sectionESample: balances.closingBalances.E ? Object.keys(balances.closingBalances.E).slice(0, 5) : []
      } : null
    });
    
    return balances;
  }, [initialData]);

  const [formData, setFormData] = useState<Record<string, ActivityQuarterValues>>(migratedInitialData);
  const [validationErrors, setValidationErrors] = useState<Record<string, any>>({});
  const [clientValidationErrors, setClientValidationErrors] = useState<ValidationError[]>([]);
  const [isBalanced, setIsBalanced] = useState<boolean>(true);
  const [difference, setDifference] = useState<number>(0);
  const [computedValues, setComputedValues] = useState<Record<string, any> | null>(null);

  // Debounce API-triggering changes; keep UI responsive while reducing calls
  const [debounceMs, setDebounceMs] = useState<number>(200);
  const debouncedFormData = useDebounce(formData, debounceMs);

  // Load schema and activities
  const schemaQuery = useGetExecutionSchema({ projectType, facilityType });
  const activitiesQuery = useExecutionActivities({ projectType, facilityType });
  
  // Fetch planned budget for validation
  const queryParams = {
    projectId: projectId?.toString() || '',
    facilityId: facilityId?.toString() || '',
    reportingPeriodId: reportingPeriodId?.toString(),
    enabled: !!projectId && !!facilityId
  };

  const planningDataQuery = usePlanningDataSummary(queryParams);
  


  // Mutations for server-side computations/validation
  const calculateBalances = useCalculateExecutionBalances();
  const validateEquation = useValidateAccountingEquation();

  const form = useForm({
    defaultValues: initialData,
    mode: validationMode === "manual" ? "onSubmit" : validationMode,
  });

  // Initialize activity entries when schema+activities are ready (once per project/facility change)
  const initKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activitiesQuery.data) return;
    const key = `${projectType}|${facilityType}`;
    if (initKeyRef.current === key) return;

    // Use migrated initial data instead of raw initialData
    const safeInitial = migratedInitialData ?? {};

    // Extract all editable activities from hierarchical data
    const editableActivities: any[] = [];
    const hierarchicalData = activitiesQuery.data ?? {};

    // Check Section X in form initialization
    if (!hierarchicalData.X) {
      console.warn('⚠️ [Form Init] Section X missing. Available:', Object.keys(hierarchicalData));
    }

    console.log('🔍 [Form Init] Hierarchical Data:', JSON.stringify(Object.keys(hierarchicalData)));
    
    Object.entries(hierarchicalData).forEach(([categoryCode, categoryData]: [string, any]) => {
      console.log(`\n📦 [Form Init] Processing Category: ${categoryCode}`);
      console.log(`  - Has items: ${!!categoryData.items}, Count: ${categoryData.items?.length || 0}`);
      console.log(`  - Has subCategories: ${!!categoryData.subCategories}, Count: ${Object.keys(categoryData.subCategories || {}).length}`);
      
      // Process direct items first (items without subcategories)
      if (categoryData.items) {
        console.log(`  📄 Processing ${categoryData.items.length} direct items for ${categoryCode}`);
        categoryData.items.forEach((item: any) => {
          console.log(`    - ${item.name} (code: ${item.code}, isTotalRow: ${item.isTotalRow}, isComputed: ${item.isComputed})`);
          if (!item.isTotalRow && !item.isComputed) {
            editableActivities.push(item);
            console.log(`      ✅ Added to editableActivities`);
          } else {
            console.log(`      ⏭️ Skipped (total or computed)`);
          }
        });
      }
      
      // Then process subcategories (like B, D, G)
      if (categoryData.subCategories) {
        console.log(`  📁 Processing ${Object.keys(categoryData.subCategories).length} subcategories for ${categoryCode}`);
        Object.entries(categoryData.subCategories).forEach(([subCode, subCategoryData]: [string, any]) => {
          console.log(`    📂 Subcategory: ${subCode} - ${subCategoryData.label}`);
          console.log(`       Items count: ${subCategoryData.items?.length || 0}`);
          if (subCategoryData.items) {
            subCategoryData.items.forEach((item: any) => {
              console.log(`      - ${item.name} (code: ${item.code}, isTotalRow: ${item.isTotalRow}, isComputed: ${item.isComputed})`);
              if (!item.isTotalRow && !item.isComputed) {
                editableActivities.push(item);
                console.log(`        ✅ Added to editableActivities`);
              } else {
                console.log(`        ⏭️ Skipped (total or computed)`);
              }
            });
          }
        });
      }
    });
    
    console.log(`\n✨ [Form Init] Total editable activities: ${editableActivities.length}`);
    console.log('Activity codes:', editableActivities.map(a => a.code));

    // 🔍 DIAGNOSTIC: Log activity code registration by section
    const activityCodesBySection = editableActivities.reduce((acc: Record<string, string[]>, a: any) => {
      const section = a.code?.split('_')[3] || 'UNKNOWN';
      if (!acc[section]) acc[section] = [];
      acc[section].push(a.code);
      return acc;
    }, {});
    
    console.log('🔍 [DIAGNOSTIC] Activity codes by section:', {
      sectionD: activityCodesBySection['D'] || [],
      sectionE: activityCodesBySection['E'] || [],
      sectionG: activityCodesBySection['G'] || [],
      allSections: Object.keys(activityCodesBySection)
    });

    const defaults = editableActivities.reduce((acc: Record<string, ActivityQuarterValues>, a: any) => {
      const existing = safeInitial[a.code] as ActivityQuarterValues | undefined;

      // Helper function to safely convert to number, preserving undefined for unreported quarters
      const toNumber = (val: any): number => {
        // If explicitly 0, keep it as 0
        if (val === 0) return 0;
        // If undefined/null/empty, return 0 (will be treated as unreported)
        if (val === null || val === undefined || val === '') return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
      };

      acc[a.code] = {
        q1: toNumber(existing?.q1),
        q2: toNumber(existing?.q2),
        q3: toNumber(existing?.q3),
        q4: toNumber(existing?.q4),
        comment: String(existing?.comment || ""),
        paymentStatus: existing?.paymentStatus ?? "unpaid",
        amountPaid: existing?.amountPaid ?? 0,
        // Initialize VAT fields with existing data or empty objects for backward compatibility
        netAmount: existing?.netAmount ?? {},
        vatAmount: existing?.vatAmount ?? {},
        vatCleared: existing?.vatCleared ?? {},
        payableCleared: existing?.payableCleared ?? {},
        otherReceivableCleared: existing?.otherReceivableCleared ?? {},
        priorYearAdjustment: existing?.priorYearAdjustment ?? {},
      };

      return acc;
    }, {});

    setFormData(prev => {
      const merged = { ...defaults, ...prev };
      
      // 🔍 DIAGNOSTIC: Log final formData keys
      const formDataKeys = Object.keys(merged);
      console.log('🔍 [DIAGNOSTIC] Final formData keys:', {
        total: formDataKeys.length,
        sectionD: formDataKeys.filter(k => k.includes('_D_')),
        sectionE: formDataKeys.filter(k => k.includes('_E_')),
        sectionG: formDataKeys.filter(k => k.includes('_G_')),
        sample: formDataKeys.slice(0, 10)
      });
      
      return merged;
    });
    form.reset(defaults);
    initKeyRef.current = key;
  }, [activitiesQuery.data, projectType, facilityType, migratedInitialData]);

  // Auto-calculate Cash at Bank (D_1) from receipts and paid expenses
  useEffect(() => {
    if (!activitiesQuery.data) return;

    const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
    
    // Find the Cash at Bank code from the template/schema (not from formData)
    const hierarchicalData = activitiesQuery.data ?? {};
    let cashAtBankCode: string | undefined;
    
    const sectionD = (hierarchicalData as any).D;
    if (sectionD?.items) {
      const found = sectionD.items.find((item: any) => 
        item.code && (item.code.includes('_D_1') || item.name?.toLowerCase().includes('cash at bank'))
      );
      cashAtBankCode = found?.code;
    }
    
    if (!cashAtBankCode) {
      console.warn('⚠️ Cash at Bank code (D_1) not found in template');
      return;
    }

    // Get opening balance from previous quarter using code mapping
    console.log('🔄 [Rollover Debug] Cash at Bank:', {
      cashAtBankCode,
      previousQuarterExists: previousQuarterBalances?.exists,
      previousQuarter: previousQuarterBalances?.quarter,
      hasClosingBalances: !!previousQuarterBalances?.closingBalances,
      hasSectionD: !!previousQuarterBalances?.closingBalances?.D,
      sectionDKeys: previousQuarterBalances?.closingBalances?.D ? Object.keys(previousQuarterBalances.closingBalances.D) : [],
      lookupValue: previousQuarterBalances?.closingBalances?.D?.[cashAtBankCode]
    });
    
    const openingBalance = previousQuarterBalances?.exists 
      ? (previousQuarterBalances.closingBalances?.D?.[cashAtBankCode] || 0)
      : 0;

    // Calculate total receipts from Section A
    const receiptCodes = Object.keys(formData).filter(code => code.includes('_A_'));
    const totalReceipts = receiptCodes.reduce((sum, code) => {
      return sum + (Number(formData[code]?.[quarterKey]) || 0);
    }, 0);

    // Calculate total PAID expenses from Section B
    const expenseCodes = Object.keys(formData).filter(code => code.includes('_B_'));
    const totalPaidExpenses = expenseCodes.reduce((sum, code) => {
      const expenseData = formData[code];
      
      // For VAT-applicable expenses, use netAmount + vatAmount
      // For regular expenses, use the quarter amount
      const netAmount = Number(expenseData?.netAmount?.[quarterKey]) || 0;
      const vatAmount = Number(expenseData?.vatAmount?.[quarterKey]) || 0;
      const regularAmount = Number(expenseData?.[quarterKey]) || 0;
      
      // If this expense has VAT fields, use net + VAT, otherwise use regular amount
      const totalExpenseAmount = (netAmount > 0 || vatAmount > 0) 
        ? (netAmount + vatAmount) 
        : regularAmount;
      
      // Check payment status for this quarter
      const paymentStatusData = expenseData?.paymentStatus;
      const paymentStatus = typeof paymentStatusData === 'object' && paymentStatusData !== null
        ? (paymentStatusData[quarterKey] ?? "unpaid")
        : (paymentStatusData ?? "unpaid");

      // Only include paid or partially paid expenses
      if (paymentStatus === "paid") {
        // When fully paid, deduct the total amount (including VAT for VAT expenses)
        return sum + totalExpenseAmount;
      } else if (paymentStatus === "partial") {
        const amountPaidData = expenseData?.amountPaid;
        const amountPaid = typeof amountPaidData === 'object' && amountPaidData !== null
          ? (Number(amountPaidData[quarterKey]) || 0)
          : (Number(amountPaidData) || 0);
        return sum + amountPaid;
      }
      
      return sum;
    }, 0);

    // Calculate total miscellaneous adjustments from Section X (reduces cash)
    const miscAdjustmentCodes = Object.keys(formData).filter(code => code.includes('_X_'));
    const totalMiscAdjustments = miscAdjustmentCodes.reduce((sum, code) => {
      return sum + (Number(formData[code]?.[quarterKey]) || 0);
    }, 0);

    // Calculate total VAT cleared (increases cash when VAT refunds are received)
    const totalVATCleared = expenseCodes.reduce((sum, code) => {
      const expenseData = formData[code];
      const vatCleared = Number(expenseData?.vatCleared?.[quarterKey]) || 0;
      return sum + vatCleared;
    }, 0);

    // Calculate total payables cleared (decreases cash when payables are paid)
    const payableCodes = Object.keys(formData).filter(code => code.includes('_E_'));
    const totalPayablesCleared = payableCodes.reduce((sum, code) => {
      const payableData = formData[code];
      const payableCleared = Number(payableData?.payableCleared?.[quarterKey]) || 0;
      return sum + payableCleared;
    }, 0);

    // Calculate total Other Receivables cleared (increases cash when receivables are collected)
    const otherReceivableCodes = Object.keys(formData).filter(code => 
      code.includes('_D_') && (code.includes('D-01_5') || code.includes('Other'))
    );
    const totalOtherReceivablesCleared = otherReceivableCodes.reduce((sum, code) => {
      const receivableData = formData[code];
      const receivableCleared = Number(receivableData?.otherReceivableCleared?.[quarterKey]) || 0;
      return sum + receivableCleared;
    }, 0);

    // Calculate total prior year cash adjustments from Section G (G-01 Cash)
    // These adjustments directly affect Cash at Bank
    const priorYearCashAdjustmentCodes = Object.keys(formData).filter(code => 
      code.includes('_G_') && code.includes('G-01')
    );
    // Also check for direct G section items that are cash adjustments
    const sectionG = (hierarchicalData as any).G;
    let priorYearCashCode: string | undefined;
    if (sectionG?.subCategories?.['G-01']?.items) {
      const cashItem = sectionG.subCategories['G-01'].items.find((item: any) => 
        item.name?.toLowerCase() === 'cash' || item.name?.toLowerCase().includes('cash adjustment')
      );
      priorYearCashCode = cashItem?.code;
    }
    
    const totalPriorYearCashAdjustments = priorYearCashCode 
      ? (Number(formData[priorYearCashCode]?.[quarterKey]) || 0)
      : 0;

    // Get the previous quarter's cash balance (for cumulative calculation)
    const previousQuarterKey = quarter === 'Q2' ? 'q1' : quarter === 'Q3' ? 'q2' : quarter === 'Q4' ? 'q3' : null;
    const previousQuarterCash = previousQuarterKey 
      ? (Number(formData[cashAtBankCode]?.[previousQuarterKey]) || 0)
      : openingBalance; // For Q1, use opening balance from previous execution

    // Calculate Cash at Bank as CUMULATIVE:
    // Current Quarter Cash = Previous Quarter Cash + Current Quarter Receipts - Current Quarter Paid Expenses 
    //                        - Misc Adjustments + VAT Cleared - Payables Cleared + Other Receivables Cleared + Prior Year Cash Adjustments
    const calculatedCashAtBank = previousQuarterCash + totalReceipts - totalPaidExpenses - totalMiscAdjustments + totalVATCleared - totalPayablesCleared + totalOtherReceivablesCleared + totalPriorYearCashAdjustments;

    console.log('💰 [Cash at Bank Calculation]:', {
      quarter,
      openingBalance,
      previousQuarterKey,
      previousQuarterCash,
      totalReceipts,
      totalPaidExpenses,
      totalMiscAdjustments,
      totalVATCleared,
      totalPayablesCleared,
      totalOtherReceivablesCleared,
      priorYearCashCode,
      totalPriorYearCashAdjustments,
      calculation: `${previousQuarterCash} + ${totalReceipts} - ${totalPaidExpenses} - ${totalMiscAdjustments} + ${totalVATCleared} - ${totalPayablesCleared} + ${totalOtherReceivablesCleared} + ${totalPriorYearCashAdjustments}`,
      calculatedCashAtBank,
      currentValue: formData[cashAtBankCode]?.[quarterKey]
    });

    // Update Cash at Bank if the calculated value differs
    const currentValue = Number(formData[cashAtBankCode]?.[quarterKey]) || 0;
    if (Math.abs(calculatedCashAtBank - currentValue) > 0.01) {
      setFormData(prev => {
        const existingData = prev[cashAtBankCode] || {};
        return {
          ...prev,
          [cashAtBankCode]: {
            q1: existingData.q1 ?? 0,
            q2: existingData.q2 ?? 0,
            q3: existingData.q3 ?? 0,
            q4: existingData.q4 ?? 0,
            [quarterKey]: calculatedCashAtBank,
            comment: existingData.comment ?? "",
            paymentStatus: existingData.paymentStatus,
            amountPaid: existingData.amountPaid,
            netAmount: existingData.netAmount ?? {},
            vatAmount: existingData.vatAmount ?? {},
            vatCleared: existingData.vatCleared ?? {},
            payableCleared: existingData.payableCleared ?? {},
            otherReceivableCleared: existingData.otherReceivableCleared ?? {},
            // Preserve priorYearAdjustment from prev state
            priorYearAdjustment: prev[cashAtBankCode]?.priorYearAdjustment ?? {},
          }
        };
      });
    }
  }, [formData, quarter, previousQuarterBalances, activitiesQuery.data]);

  // Auto-calculate Payables (Section E) from unpaid/partially paid expenses
  useEffect(() => {
    if (!activitiesQuery.data) return;

    const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
    
    // Get all payable codes from the template/schema (not from formData)
    const hierarchicalData = activitiesQuery.data ?? {};
    const payableCodes: string[] = [];
    
    const sectionE = (hierarchicalData as any).E;
    if (sectionE?.items) {
      sectionE.items.forEach((item: any) => {
        if (item.code && !item.isTotalRow && !item.isComputed) {
          payableCodes.push(item.code);
        }
      });
    }
    
    // Get all expense codes from the template/schema
    const expenseCodes: string[] = [];
    const sectionB = (hierarchicalData as any).B;
    if (sectionB?.subCategories) {
      Object.values(sectionB.subCategories).forEach((subCat: any) => {
        if (subCat.items) {
          subCat.items.forEach((item: any) => {
            if (item.code && !item.isTotalRow && !item.isComputed) {
              expenseCodes.push(item.code);
            }
          });
        }
      });
    }
    
    // Build expense-to-payable mapping based on naming patterns
    // This maps expenses to their corresponding payables
    const expenseToPayableMap: Record<string, string> = {};
    
    expenseCodes.forEach(expenseCode => {
      // Find the expense name from activities (already have hierarchicalData and sectionB)
      let expenseName = '';
      
      // Search through B subcategories to find the expense
      if (sectionB?.subCategories) {
        Object.values(sectionB.subCategories).forEach((subCat: any) => {
          const found = subCat.items?.find((item: any) => item.code === expenseCode);
          if (found) expenseName = found.name.toLowerCase();
        });
      }
      
      // Map expense to payable based on name patterns
      // B-01 (HR) → E_1 (Salaries payable)
      // B-02 (M&E) → E_2 (Supervision), E_3 (Meetings)
      // B-03 (Service delivery) → E_8, E_9, E_10, E_11
      // B-04 (Overheads) → E_12, E_13, E_14, E_15
      
      if (expenseName.includes('laboratory') || expenseName.includes('nurse') || expenseName.includes('doctor') || expenseName.includes('technician') || expenseName.includes('accountant') || expenseName.includes('pharmacist') || expenseName.includes('salary') || expenseName.includes('coordinator') || expenseName.includes('staff') || expenseName.includes('chw supervisor')) {
        // B-01: HR expenses → Payable 1: Salaries (E_1)
        const payableCode = payableCodes.find(code => code.includes('_E_1'));
        if (payableCode) expenseToPayableMap[expenseCode] = payableCode;
      } else if (expenseName.includes('support group meeting')) {
        // B-02: Support group meetings → Payable 2 (E_2)
        const payableCode = payableCodes.find(code => code.includes('_E_2'));
        if (payableCode) expenseToPayableMap[expenseCode] = payableCode;
      } else if (expenseName.includes('census training')) {
        // B-02: Census training → Payable 3 (E_3)
        const payableCode = payableCodes.find(code => code.includes('_E_3'));
        if (payableCode) expenseToPayableMap[expenseCode] = payableCode;
      } else if (expenseName.includes('clinical mentorship') || expenseName.includes('mentorship')) {
        // B-02: Clinical mentorship → Payable 4 (E_4)
        const payableCode = payableCodes.find(code => code.includes('_E_4'));
        if (payableCode) expenseToPayableMap[expenseCode] = payableCode;
      } else if (expenseName.includes('annual') && expenseName.includes('meeting')) {
        // B-02: Annual coordination meeting → Payable 5 (E_5)
        const payableCode = payableCodes.find(code => code.includes('_E_5'));
        if (payableCode) expenseToPayableMap[expenseCode] = payableCode;
      } else if (expenseName.includes('mdt meeting') || expenseName.includes('quarterly') && expenseName.includes('meeting')) {
        // B-02: MDT meetings → Payable 6 (E_6)
        const payableCode = payableCodes.find(code => code.includes('_E_6'));
        if (payableCode) expenseToPayableMap[expenseCode] = payableCode;
      } else if (expenseName.includes('supervision') && expenseName.includes('dqa')) {
        // B-02: Supervision and DQA → Payable 7 (E_7)
        const payableCode = payableCodes.find(code => code.includes('_E_7'));
        if (payableCode) expenseToPayableMap[expenseCode] = payableCode;
      } else if (expenseName.includes('sample transport')) {
        // B-03: Sample transport → Payable 8 (E_8)
        const payableCode = payableCodes.find(code => code.includes('_E_8'));
        if (payableCode) expenseToPayableMap[expenseCode] = payableCode;
      } else if (expenseName.includes('home visit')) {
        // B-03: Home visits → Payable 9 (E_9)
        const payableCode = payableCodes.find(code => code.includes('_E_9'));
        if (payableCode) expenseToPayableMap[expenseCode] = payableCode;
      } else if (expenseName.includes('outreach') && expenseName.includes('hiv')) {
        // B-03: Outreach for HIV testing → Payable 10 (E_10)
        const payableCode = payableCodes.find(code => code.includes('_E_10'));
        if (payableCode) expenseToPayableMap[expenseCode] = payableCode;
      } else if (expenseName.includes('wad') || expenseName.includes('celebration')) {
        // B-03: WAD celebration → Payable 11 (E_11)
        const payableCode = payableCodes.find(code => code.includes('_E_11'));
        if (payableCode) expenseToPayableMap[expenseCode] = payableCode;
      } else if (expenseName.includes('communication') && expenseName.includes('all')) {
        // B-04: Communication - All → Payable 12 (E_12)
        const payableCode = payableCodes.find(code => code.includes('_E_12'));
        if (payableCode) expenseToPayableMap[expenseCode] = payableCode;
      } else if (expenseName.includes('maintenance')) {
        // B-04: Maintenance → Payable 13 (E_13)
        const payableCode = payableCodes.find(code => code.includes('_E_13'));
        if (payableCode) expenseToPayableMap[expenseCode] = payableCode;
      } else if (expenseName === 'fuel' || (expenseName.includes('fuel') && !expenseName.includes('refund'))) {
        // B-04: Fuel → Payable 14 (E_14)
        const payableCode = payableCodes.find(code => code.includes('_E_14'));
        if (payableCode) expenseToPayableMap[expenseCode] = payableCode;
      } else if (expenseName.includes('office supplies') || (expenseName.includes('supplies') && !expenseName.includes('consumable'))) {
        // B-04: Office supplies → Payable 15 (E_15)
        const payableCode = payableCodes.find(code => code.includes('_E_15'));
        if (payableCode) expenseToPayableMap[expenseCode] = payableCode;
      } else if (expenseName.includes('bank charges')) {
        // Bank charges - no payable (paid immediately)
        // Skip bank charges
      }
    });
    
    // Get opening balances for payables from previous quarter
    console.log('🔄 [Rollover Debug] Payables:', {
      payableCodes,
      previousQuarterExists: previousQuarterBalances?.exists,
      previousQuarter: previousQuarterBalances?.quarter,
      hasClosingBalances: !!previousQuarterBalances?.closingBalances,
      hasSectionE: !!previousQuarterBalances?.closingBalances?.E,
      sectionEKeys: previousQuarterBalances?.closingBalances?.E ? Object.keys(previousQuarterBalances.closingBalances.E) : []
    });
    
    // Find the prior year payable adjustment code from G-01 subcategory (for logging only)
    const sectionG = (hierarchicalData as any).G;
    let priorYearPayableCode: string | undefined;
    if (sectionG?.subCategories?.['G-01']?.items) {
      const payableItem = sectionG.subCategories['G-01'].items.find((item: any) => 
        item.name?.toLowerCase() === 'payable' || item.name?.toLowerCase().includes('payable adjustment')
      );
      priorYearPayableCode = payableItem?.code;
    }
    
    console.log('📝 [Prior Year Payable Adjustment] G-01 code:', priorYearPayableCode);
    
    // Calculate payables for each payable code
    const calculatedPayables: Record<string, number> = {};
    
    payableCodes.forEach(payableCode => {
      // Start with opening balance from previous quarter
      let payableAmount = 0;
      if (previousQuarterBalances?.exists && previousQuarterBalances.closingBalances?.E) {
        payableAmount = previousQuarterBalances.closingBalances.E[payableCode] || 0;
        console.log(`  Payable ${payableCode}: opening balance = ${payableAmount}`);
      }
      
      // Find all expenses that map to this payable
      const mappedExpenses = Object.entries(expenseToPayableMap)
        .filter(([_, pCode]) => pCode === payableCode)
        .map(([eCode, _]) => eCode);
      
      // Add new unpaid/partially paid amounts from current quarter
      mappedExpenses.forEach(expenseCode => {
        const expenseData = formData[expenseCode];
        
        // For VAT-applicable expenses, use netAmount + vatAmount
        // For regular expenses, use the quarter amount
        const netAmount = Number(expenseData?.netAmount?.[quarterKey]) || 0;
        const vatAmount = Number(expenseData?.vatAmount?.[quarterKey]) || 0;
        const regularAmount = Number(expenseData?.[quarterKey]) || 0;
        
        // If this expense has VAT fields, use net + VAT, otherwise use regular amount
        const totalExpenseAmount = (netAmount > 0 || vatAmount > 0) 
          ? (netAmount + vatAmount) 
          : regularAmount;
        
        // Check payment status for this quarter
        const paymentStatusData = expenseData?.paymentStatus;
        const paymentStatus = typeof paymentStatusData === 'object' && paymentStatusData !== null
          ? (paymentStatusData[quarterKey] ?? "unpaid")
          : (paymentStatusData ?? "unpaid");
        
        if (paymentStatus === "unpaid") {
          // Full amount is payable (including VAT for VAT-applicable expenses)
          payableAmount += totalExpenseAmount;
        } else if (paymentStatus === "partial") {
          // Unpaid portion is payable
          const amountPaidData = expenseData?.amountPaid;
          const amountPaid = typeof amountPaidData === 'object' && amountPaidData !== null
            ? (Number(amountPaidData[quarterKey]) || 0)
            : (Number(amountPaidData) || 0);
          const unpaidAmount = totalExpenseAmount - amountPaid;
          payableAmount += Math.max(0, unpaidAmount);
        }
        // If "paid", nothing is added to payable
      });
      
      // Subtract any payable cleared in this quarter (payments made against the payable)
      const payableData = formData[payableCode];
      const payableCleared = Number(payableData?.payableCleared?.[quarterKey]) || 0;
      payableAmount -= payableCleared;
      
      // Add prior year adjustment for this specific payable (tracked per-item)
      const priorYearAdjustment = Number(payableData?.priorYearAdjustment?.[quarterKey]) || 0;
      payableAmount += priorYearAdjustment;
      
      console.log(`  Payable ${payableCode}: priorYearAdjustment = ${priorYearAdjustment}`);
      
      calculatedPayables[payableCode] = Math.max(0, payableAmount); // Payables can't be negative
    });
    
    console.log('💳 [Payables Calculation]:', {
      quarter,
      expenseToPayableMap,
      calculatedPayables
    });
    
    // Update payables if values differ
    let hasChanges = false;
    const updates: Record<string, any> = {};
    
    Object.entries(calculatedPayables).forEach(([payableCode, calculatedAmount]) => {
      const currentValue = Number(formData[payableCode]?.[quarterKey]) || 0;
      if (Math.abs(calculatedAmount - currentValue) > 0.01) {
        hasChanges = true;
        // Preserve all existing fields including priorYearAdjustment
        const existingData = formData[payableCode] || {};
        updates[payableCode] = {
          q1: existingData.q1 ?? 0,
          q2: existingData.q2 ?? 0,
          q3: existingData.q3 ?? 0,
          q4: existingData.q4 ?? 0,
          [quarterKey]: calculatedAmount,
          comment: existingData.comment ?? "",
          paymentStatus: existingData.paymentStatus,
          amountPaid: existingData.amountPaid,
          netAmount: existingData.netAmount ?? {},
          vatAmount: existingData.vatAmount ?? {},
          vatCleared: existingData.vatCleared ?? {},
          payableCleared: existingData.payableCleared ?? {},
          otherReceivableCleared: existingData.otherReceivableCleared ?? {},
          priorYearAdjustment: existingData.priorYearAdjustment ?? {},
        };
      }
    });
    
    if (hasChanges) {
      setFormData(prev => {
        // Merge updates with prev to ensure we don't lose any priorYearAdjustment that was just set
        const merged: Record<string, any> = { ...prev };
        Object.entries(updates).forEach(([code, data]) => {
          merged[code] = {
            ...data,
            // Ensure priorYearAdjustment from prev is preserved if it was just updated
            priorYearAdjustment: {
              ...(data.priorYearAdjustment ?? {}),
              ...(prev[code]?.priorYearAdjustment ?? {}),
            },
          };
        });
        return merged;
      });
    }
  }, [formData, quarter, activitiesQuery.data, previousQuarterBalances]);

  // Auto-calculate VAT Receivables (Section D) from VAT-applicable expenses
  useEffect(() => {
    if (!activitiesQuery.data) return;

    const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
    
    // Get all VAT receivable codes from the template/schema (not from formData)
    // This ensures we find the codes even when the current quarter has no data yet
    const hierarchicalData = activitiesQuery.data ?? {};
    const vatReceivableCodes: string[] = [];
    
    const sectionD = (hierarchicalData as any).D;
    if (sectionD?.subCategories?.['D-01']?.items) {
      sectionD.subCategories['D-01'].items.forEach((item: any) => {
        if (item.code && (
          item.code.includes('VAT_COMMUNICATION_ALL') || 
          item.code.includes('VAT_MAINTENANCE') || 
          item.code.includes('VAT_FUEL') || 
          item.code.includes('VAT_SUPPLIES') ||
          // Also check for item names to catch any format variations
          item.name?.toLowerCase().includes('vat receivable')
        )) {
          vatReceivableCodes.push(item.code);
        }
      });
    }
    
    // Get all expense codes from the template/schema
    const expenseCodes: string[] = [];
    const sectionB = (hierarchicalData as any).B;
    if (sectionB?.subCategories) {
      Object.values(sectionB.subCategories).forEach((subCat: any) => {
        if (subCat.items) {
          subCat.items.forEach((item: any) => {
            if (item.code && !item.isTotalRow && !item.isComputed) {
              expenseCodes.push(item.code);
            }
          });
        }
      });
    }
    
    // Get opening balances for VAT receivables from previous quarter
    console.log('🔄 [Rollover Debug] VAT Receivables:', {
      vatReceivableCodes,
      previousQuarterExists: previousQuarterBalances?.exists,
      previousQuarter: previousQuarterBalances?.quarter,
      hasClosingBalances: !!previousQuarterBalances?.closingBalances,
      hasSectionD: !!previousQuarterBalances?.closingBalances?.D,
      sectionDKeys: previousQuarterBalances?.closingBalances?.D ? Object.keys(previousQuarterBalances.closingBalances.D) : []
    });
    
    // Map VAT receivable codes to categories and get opening balances
    const categoryToCodeMap: Record<string, string | undefined> = {
      communication_all: vatReceivableCodes.find(code => code.includes('COMMUNICATION_ALL') || code.includes('D-01_1')),
      maintenance: vatReceivableCodes.find(code => code.includes('MAINTENANCE') || code.includes('D-01_2')),
      fuel: vatReceivableCodes.find(code => code.includes('FUEL') || code.includes('D-01_3')),
      office_supplies: vatReceivableCodes.find(code => code.includes('SUPPLIES') || code.includes('D-01_4'))
    };
    
    // Initialize VAT receivables by category with opening balances from previous quarter
    const vatReceivablesByCategory: Record<string, number> = {
      communication_all: 0,
      maintenance: 0,
      fuel: 0,
      office_supplies: 0
    };
    
    if (previousQuarterBalances?.exists && previousQuarterBalances.closingBalances?.D) {
      Object.entries(categoryToCodeMap).forEach(([category, code]) => {
        if (code) {
          const openingBalance = previousQuarterBalances.closingBalances.D[code] || 0;
          vatReceivablesByCategory[category] = openingBalance;
          console.log(`  VAT Receivable ${category} (${code}): opening balance = ${openingBalance}`);
        }
      });
    }
    
    expenseCodes.forEach(expenseCode => {
      const expenseData = formData[expenseCode];
      
      // Check if this expense has VAT incurred or cleared in this quarter
      const vatAmount = expenseData?.vatAmount?.[quarterKey];
      const vatCleared = expenseData?.vatCleared?.[quarterKey] || 0;
      
      // Process if there's VAT incurred OR VAT cleared in this quarter
      if ((vatAmount && vatAmount > 0) || vatCleared > 0) {
        // Find the expense name to determine VAT category (already have sectionB)
        let expenseName = '';
        
        if (sectionB?.subCategories) {
          Object.values(sectionB.subCategories).forEach((subCat: any) => {
            const found = subCat.items?.find((item: any) => item.code === expenseCode);
            if (found) expenseName = found.name.toLowerCase();
          });
        }
        
        // Determine VAT category based on expense name
        let category = '';
        if (expenseName.includes('communication') && expenseName.includes('all')) {
          category = 'communication_all';
        } else if (expenseName.includes('maintenance')) {
          category = 'maintenance';
        } else if (expenseName === 'fuel' || (expenseName.includes('fuel') && !expenseName.includes('refund'))) {
          category = 'fuel';
        } else if (expenseName.includes('office supplies') || expenseName.includes('supplies')) {
          category = 'office_supplies';
        }
        
        if (category) {
          // VAT Receivable = Opening Balance (already set) + VAT Incurred - VAT Cleared
          const incurred = Number(vatAmount) || 0;
          const cleared = Number(vatCleared) || 0;
          
          console.log(`  📝 Processing ${category} (${expenseCode}):`, {
            incurred,
            cleared,
            previousBalance: vatReceivablesByCategory[category],
            change: incurred - cleared,
            newBalance: vatReceivablesByCategory[category] + (incurred - cleared)
          });
          
          vatReceivablesByCategory[category] += (incurred - cleared);
        }
      }
    });
    
    console.log('🧾 [VAT Receivables Calculation]:', {
      quarter,
      vatReceivableCodes,
      vatReceivablesByCategory,
      categoryToCodeMap
    });
    
    // Update VAT receivables if values differ
    let hasChanges = false;
    const updates: Record<string, any> = {};
    
    Object.entries(vatReceivablesByCategory).forEach(([category, calculatedAmount]) => {
      const receivableCode = categoryToCodeMap[category];
      if (receivableCode) {
        // Add prior year adjustment for this specific receivable (tracked per-item)
        const receivableData = formData[receivableCode];
        const priorYearAdjustment = Number(receivableData?.priorYearAdjustment?.[quarterKey]) || 0;
        const finalAmount = Math.max(0, calculatedAmount + priorYearAdjustment);
        
        if (priorYearAdjustment !== 0) {
          console.log(`  VAT Receivable ${category} (${receivableCode}): priorYearAdjustment = ${priorYearAdjustment}, finalAmount = ${finalAmount}`);
        }
        
        const currentValue = Number(formData[receivableCode]?.[quarterKey]) || 0;
        if (Math.abs(finalAmount - currentValue) > 0.01) {
          hasChanges = true;
          // Preserve all existing fields including priorYearAdjustment
          const existingData = formData[receivableCode] || {};
          updates[receivableCode] = {
            q1: existingData.q1 ?? 0,
            q2: existingData.q2 ?? 0,
            q3: existingData.q3 ?? 0,
            q4: existingData.q4 ?? 0,
            [quarterKey]: finalAmount,
            comment: existingData.comment ?? "",
            paymentStatus: existingData.paymentStatus,
            amountPaid: existingData.amountPaid,
            netAmount: existingData.netAmount ?? {},
            vatAmount: existingData.vatAmount ?? {},
            vatCleared: existingData.vatCleared ?? {},
            payableCleared: existingData.payableCleared ?? {},
            otherReceivableCleared: existingData.otherReceivableCleared ?? {},
            priorYearAdjustment: existingData.priorYearAdjustment ?? {},
          };
          
          console.log(`  Updating ${category}: ${currentValue} → ${finalAmount}`);
        }
      }
    });
    
    if (hasChanges) {
      setFormData(prev => {
        // Merge updates with prev to ensure we don't lose any priorYearAdjustment that was just set
        const merged: Record<string, any> = { ...prev };
        Object.entries(updates).forEach(([code, data]) => {
          merged[code] = {
            ...data,
            // Ensure priorYearAdjustment from prev is preserved if it was just updated
            priorYearAdjustment: {
              ...(data.priorYearAdjustment ?? {}),
              ...(prev[code]?.priorYearAdjustment ?? {}),
            },
          };
        });
        return merged;
      });
    }
  }, [formData, quarter, previousQuarterBalances, activitiesQuery.data]);

  // Auto-calculate Other Receivables (Section D) from Miscellaneous Adjustments (Section X)
  useEffect(() => {
    if (!activitiesQuery.data) return;

    const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
    
    // Find the Other Receivables code from the template/schema (not from formData)
    const hierarchicalData = activitiesQuery.data ?? {};
    let otherReceivablesCode: string | undefined;
    
    const sectionD = (hierarchicalData as any).D;
    if (sectionD?.subCategories?.['D-01']?.items) {
      const found = sectionD.subCategories['D-01'].items.find((item: any) => 
        item.code && (
          item.code.includes('_D_4') || 
          item.code.includes('_D_D-01_5') ||
          item.name?.toLowerCase().includes('other receivable')
        )
      );
      otherReceivablesCode = found?.code;
    }
    
    if (!otherReceivablesCode) {
      console.warn('⚠️ Other Receivables code not found in template');
      return;
    }
    
    // Find Section X (Miscellaneous Adjustments) codes
    const miscAdjustmentCodes = Object.keys(formData).filter(code => code.includes('_X_'));
    
    // Sum up all miscellaneous adjustments for this quarter
    const totalMiscAdjustments = miscAdjustmentCodes.reduce((sum, code) => {
      return sum + (Number(formData[code]?.[quarterKey]) || 0);
    }, 0);
    
    // Get opening balance for Other Receivables from previous quarter
    console.log('🔄 [Rollover Debug] Other Receivables:', {
      otherReceivablesCode,
      previousQuarterExists: previousQuarterBalances?.exists,
      previousQuarter: previousQuarterBalances?.quarter,
      hasClosingBalances: !!previousQuarterBalances?.closingBalances,
      hasSectionD: !!previousQuarterBalances?.closingBalances?.D,
      sectionDKeys: previousQuarterBalances?.closingBalances?.D ? Object.keys(previousQuarterBalances.closingBalances.D) : [],
      lookupValue: previousQuarterBalances?.closingBalances?.D?.[otherReceivablesCode]
    });
    
    const openingBalance = previousQuarterBalances?.exists 
      ? (previousQuarterBalances.closingBalances?.D?.[otherReceivablesCode] || 0)
      : 0;
    
    // Get prior year adjustment for this specific receivable (tracked per-item)
    const otherReceivablesData = formData[otherReceivablesCode];
    const priorYearAdjustment = Number(otherReceivablesData?.priorYearAdjustment?.[quarterKey]) || 0;
    
    // Get cleared amount for Other Receivables
    const clearedAmount = Number(otherReceivablesData?.otherReceivableCleared?.[quarterKey]) || 0;
    
    // Other Receivables = Opening Balance + Miscellaneous Adjustments + Prior Year Adjustment - Cleared Amount
    const calculatedOtherReceivables = openingBalance + totalMiscAdjustments + priorYearAdjustment - clearedAmount;
    
    console.log('📋 [Other Receivables Calculation]:', {
      quarter,
      otherReceivablesCode,
      openingBalance,
      totalMiscAdjustments,
      priorYearAdjustment,
      clearedAmount,
      calculatedOtherReceivables,
      currentValue: formData[otherReceivablesCode]?.[quarterKey]
    });
    
    // Update Other Receivables if the calculated value differs
    const currentValue = Number(formData[otherReceivablesCode]?.[quarterKey]) || 0;
    if (Math.abs(calculatedOtherReceivables - currentValue) > 0.01) {
      setFormData(prev => {
        const existingData = prev[otherReceivablesCode] || {};
        return {
          ...prev,
          [otherReceivablesCode]: {
            q1: existingData.q1 ?? 0,
            q2: existingData.q2 ?? 0,
            q3: existingData.q3 ?? 0,
            q4: existingData.q4 ?? 0,
            [quarterKey]: calculatedOtherReceivables,
            comment: existingData.comment ?? "",
            paymentStatus: existingData.paymentStatus,
            amountPaid: existingData.amountPaid,
            netAmount: existingData.netAmount ?? {},
            vatAmount: existingData.vatAmount ?? {},
            vatCleared: existingData.vatCleared ?? {},
            payableCleared: existingData.payableCleared ?? {},
            otherReceivableCleared: existingData.otherReceivableCleared ?? {},
            // Preserve priorYearAdjustment from prev state
            priorYearAdjustment: prev[otherReceivablesCode]?.priorYearAdjustment ?? {},
          }
        };
      });
    }
  }, [formData, quarter, previousQuarterBalances, activitiesQuery.data]);

  // Helper to produce API payload shape from local form state
  const payload = useMemo(() => {
    const activities = Object.entries(formData)
      .filter(([code, values]) => {
        // Filter out non-activity entries (like previousQuarterBalances, quarterSequence)
        return values && typeof values === 'object' && ('q1' in values || 'q2' in values || 'q3' in values || 'q4' in values);
      })
      .map(([code, values]) => ({
        code,
        q1: Number(values.q1) || 0,
        q2: Number(values.q2) || 0,
        q3: Number(values.q3) || 0,
        q4: Number(values.q4) || 0,
      }));
    return {
      executionId: executionId ?? 0,
      data: {
        activities,
        quarter,
      },
    };
  }, [formData, quarter, executionId]);

  // Calculate planned budget from planning data
  const plannedBudget = useMemo(() => {
    if (!planningDataQuery.data?.data || planningDataQuery.data.data.length === 0) {
      return null;
    }
    
    const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
    let total = 0;

    
    // Sum up all planned amounts for the current quarter
    planningDataQuery.data.data.forEach((item: any, index: number) => {
      
      // Use pre-calculated quarterly totals from the API (optimized)
      if (item.quarterlyTotals) {
        const quarterTotal = Number(item.quarterlyTotals[`${quarterKey}_total`]) || 0;
        total += quarterTotal;
      }
    });
    
    console.log('💰 [Planned Budget] Final:', { quarter, total, hasData: !!planningDataQuery.data });
    return total > 0 ? total : null;
  }, [planningDataQuery.data, quarter, planningDataQuery.isLoading, planningDataQuery.isError, planningDataQuery.error]);

  // Recalculate and validate whenever debounced form data changes
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!activitiesQuery.data) return;

      // Run client-side validation first (Requirements: 11.1, 11.2, 11.3, 11.4, 11.5)
      const clientValidation = validateFormData(debouncedFormData, quarter, activitiesQuery.data, plannedBudget);
      if (cancelled) return;
      
      console.log('🔍 [Client Validation]:', {
        quarter,
        errorCount: clientValidation.errors.length,
        errors: clientValidation.errors,
        isValid: clientValidation.isValid
      });
      
      setClientValidationErrors(clientValidation.errors);

      try {
        // Build payload locally to avoid effect retriggering on memo identity
        const localPayload = {
          executionId: executionId ?? 0,
          data: {
            activities: Object.entries(debouncedFormData)
              .filter(([code, values]) => values && typeof values === 'object')
              .map(([code, values]) => ({
                code,
                q1: Number(values.q1) || 0,
                q2: Number(values.q2) || 0,
                q3: Number(values.q3) || 0,
                q4: Number(values.q4) || 0,
              })),
            quarter,
          },
        } as const;

        const balances = await calculateBalances.mutateAsync(localPayload as any);
        if (cancelled) return;
        setComputedValues(balances);
        setIsBalanced(Boolean(balances.isBalanced));

        const validation = await validateEquation.mutateAsync({
          data: localPayload.data as any,
          tolerance: 0.01,
        });
        if (cancelled) return;
        
        console.log('⚖️ [Validation Result]:', {
          isValid: validation.isValid,
          difference: validation.difference,
          errors: validation.errors,
          quarter,
          canSubmit: validation.isValid && Object.keys(validationErrors).length === 0
        });
        
        setIsBalanced(validation.isValid);
        setDifference(validation.difference);
        setValidationErrors(
          Array.isArray(validation.errors)
            ? validation.errors.reduce((acc: Record<string, any>, e: any) => {
              acc[e.field] = e.message;
              return acc;
            }, {})
            : {}
        );
      } catch (error) {
        console.error('❌ [Balance Calculation Error]:', error);
        console.error('Error details:', {
          message: (error as any)?.message,
          response: (error as any)?.response,
          data: (error as any)?.response?.data,
        });
        setIsBalanced(false);
        setComputedValues(null);
        // Clear validation errors on calculation error to not block submission
        setValidationErrors({});
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedFormData, activitiesQuery.data, executionId, quarter, plannedBudget]);

  // Field change updates only the selected quarter value by default
  const handleFieldChange = useCallback(
    (activityCode: string, value: number) => {
      const quarterKey = quarter.toLowerCase() as keyof ActivityQuarterValues;
      setFormData(prev => {
        const next = {
          ...prev,
          [activityCode]: {
            q1: prev[activityCode]?.q1 ?? 0,
            q2: prev[activityCode]?.q2 ?? 0,
            q3: prev[activityCode]?.q3 ?? 0,
            q4: prev[activityCode]?.q4 ?? 0,
            comment: prev[activityCode]?.comment ?? "",
            paymentStatus: prev[activityCode]?.paymentStatus,
            amountPaid: prev[activityCode]?.amountPaid,
            // Preserve VAT fields
            netAmount: prev[activityCode]?.netAmount ?? {},
            vatAmount: prev[activityCode]?.vatAmount ?? {},
            vatCleared: prev[activityCode]?.vatCleared ?? {},
            payableCleared: prev[activityCode]?.payableCleared ?? {},
            otherReceivableCleared: prev[activityCode]?.otherReceivableCleared ?? {},
          },
        };
        (next[activityCode] as any)[quarterKey] = value;
        onDataChange?.(next);
        return next;
      });
      form.setValue(`${activityCode}.${quarter.toLowerCase()}`, value, { shouldDirty: true });
    },
    [form, onDataChange, quarter]
  );

  const setComment = useCallback(
    (activityCode: string, comment: string) => {
      setFormData(prev => {
        const next = {
          ...prev,
          [activityCode]: {
            q1: prev[activityCode]?.q1 ?? 0,
            q2: prev[activityCode]?.q2 ?? 0,
            q3: prev[activityCode]?.q3 ?? 0,
            q4: prev[activityCode]?.q4 ?? 0,
            comment,
            paymentStatus: prev[activityCode]?.paymentStatus,
            amountPaid: prev[activityCode]?.amountPaid,
            // Preserve VAT fields
            netAmount: prev[activityCode]?.netAmount ?? {},
            vatAmount: prev[activityCode]?.vatAmount ?? {},
            vatCleared: prev[activityCode]?.vatCleared ?? {},
            payableCleared: prev[activityCode]?.payableCleared ?? {},
            otherReceivableCleared: prev[activityCode]?.otherReceivableCleared ?? {},
          },
        };
        onDataChange?.(next);
        return next;
      });
      form.setValue(`${activityCode}.comment`, comment, { shouldDirty: true });
    },
    [form, onDataChange]
  );

  const updateExpensePayment = useCallback(
    (activityCode: string, status: PaymentStatus, amountPaid: number) => {
      const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';

      setFormData(prev => {
        const existing = prev[activityCode];

        // Get existing payment status data (support both old and new format)
        const existingPaymentStatus = existing?.paymentStatus;
        const existingAmountPaid = existing?.amountPaid;

        // Create quarter-specific payment status object
        const paymentStatusObj = typeof existingPaymentStatus === 'object' && existingPaymentStatus !== null && !Array.isArray(existingPaymentStatus)
          ? { ...(existingPaymentStatus as Record<string, any>), [quarterKey]: status }
          : { [quarterKey]: status };

        const amountPaidObj = typeof existingAmountPaid === 'object' && existingAmountPaid !== null && !Array.isArray(existingAmountPaid)
          ? { ...(existingAmountPaid as Record<string, any>), [quarterKey]: amountPaid }
          : { [quarterKey]: amountPaid };

        const next = {
          ...prev,
          [activityCode]: {
            q1: existing?.q1 ?? 0,
            q2: existing?.q2 ?? 0,
            q3: existing?.q3 ?? 0,
            q4: existing?.q4 ?? 0,
            comment: existing?.comment ?? "",
            paymentStatus: paymentStatusObj,
            amountPaid: amountPaidObj,
            // Preserve VAT fields
            netAmount: existing?.netAmount ?? {},
            vatAmount: existing?.vatAmount ?? {},
            vatCleared: existing?.vatCleared ?? {},
            payableCleared: existing?.payableCleared ?? {},
            otherReceivableCleared: existing?.otherReceivableCleared ?? {},
            priorYearAdjustment: existing?.priorYearAdjustment ?? {},
          },
        };

        onDataChange?.(next);
        return next;
      });
      form.setValue(`${activityCode}.paymentStatus.${quarterKey}`, status, { shouldDirty: true });
      form.setValue(`${activityCode}.amountPaid.${quarterKey}`, amountPaid, { shouldDirty: true });
    },
    [form, onDataChange, quarter]
  );

  /**
   * Update VAT expense with net and VAT amounts
   * This function handles VAT-applicable expenses by updating net amount, VAT amount,
   * and the total quarter value (net + VAT)
   */
  const updateVATExpense = useCallback(
    (activityCode: string, netAmount: number, vatAmount: number) => {
      const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
      const totalAmount = netAmount + vatAmount;

      setFormData(prev => {
        const existing = prev[activityCode];

        // Create quarter-specific VAT objects
        const netAmountObj = typeof existing?.netAmount === 'object' && existing.netAmount !== null
          ? { ...existing.netAmount, [quarterKey]: netAmount }
          : { [quarterKey]: netAmount };

        const vatAmountObj = typeof existing?.vatAmount === 'object' && existing.vatAmount !== null
          ? { ...existing.vatAmount, [quarterKey]: vatAmount }
          : { [quarterKey]: vatAmount };

        const next = {
          ...prev,
          [activityCode]: {
            q1: existing?.q1 ?? 0,
            q2: existing?.q2 ?? 0,
            q3: existing?.q3 ?? 0,
            q4: existing?.q4 ?? 0,
            [quarterKey]: netAmount,  // Update the quarter value with net amount for section calculation
            comment: existing?.comment ?? "",
            paymentStatus: existing?.paymentStatus,
            amountPaid: existing?.amountPaid,
            netAmount: netAmountObj,
            vatAmount: vatAmountObj,
            vatCleared: existing?.vatCleared ?? {},
            payableCleared: existing?.payableCleared ?? {},
            otherReceivableCleared: existing?.otherReceivableCleared ?? {},
            priorYearAdjustment: existing?.priorYearAdjustment ?? {},
            totalInvoiceAmount: totalAmount,  // Store total invoice amount for reference
          },
        };

        onDataChange?.(next);
        return next;
      });

      form.setValue(`${activityCode}.${quarterKey}`, netAmount, { shouldDirty: true });
      form.setValue(`${activityCode}.netAmount.${quarterKey}`, netAmount, { shouldDirty: true });
      form.setValue(`${activityCode}.vatAmount.${quarterKey}`, vatAmount, { shouldDirty: true });
    },
    [form, onDataChange, quarter]
  );

  /**
   * Clear payable (pay a liability)
   * This function records when payables are paid, reducing both the payable and Cash at Bank
   * Accounting entry: Dr Payable, Cr Cash at Bank
   */
  const clearPayable = useCallback(
    (payableCode: string, clearAmount: number) => {
      const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';

      setFormData(prev => {
        const existing = prev[payableCode];

        // Create quarter-specific payable cleared object
        // IMPORTANT: Add to existing cleared amount, don't replace it
        const previousCleared = (typeof existing?.payableCleared === 'object' && existing.payableCleared !== null)
          ? (existing.payableCleared[quarterKey] || 0)
          : 0;
        const newTotalCleared = previousCleared + clearAmount;
        
        const payableClearedObj = typeof existing?.payableCleared === 'object' && existing.payableCleared !== null
          ? { ...existing.payableCleared, [quarterKey]: newTotalCleared }
          : { [quarterKey]: newTotalCleared };

        // Find Cash at Bank activity code (D_1) to decrease it
        // Activity code format: {PROJECT}_EXEC_{FACILITY}_D_1
        const codeParts = payableCode.split('_');
        const projectPart = codeParts[0]; // HIV, MAL, or TB
        const facilityPart = codeParts[2]; // HOSPITAL or HEALTH_CENTER (or HEALTH)
        const cashAtBankCode = `${projectPart}_EXEC_${facilityPart}_D_1`;

        console.log('🔍 [DIAGNOSTIC] clearPayable - Looking for Cash at Bank:', {
          payableCode,
          cashAtBankCode,
          existsInFormData: !!prev[cashAtBankCode],
          formDataKeys: Object.keys(prev).filter(k => k.includes('_D_')),
          allFormDataKeys: Object.keys(prev).length
        });

        // Get current Cash at Bank value for this quarter
        const cashAtBank = prev[cashAtBankCode];
        const currentCashBalance = Number(cashAtBank?.[quarterKey]) || 0;
        
        console.log('🔍 [DIAGNOSTIC] clearPayable - Cash at Bank data:', {
          cashAtBankCode,
          found: !!cashAtBank,
          currentCashBalance,
          clearAmount,
          newBalance: currentCashBalance - clearAmount
        });
        const newCashBalance = currentCashBalance - clearAmount; // DECREASE cash when paying payable

        const next = {
          ...prev,
          [payableCode]: {
            q1: existing?.q1 ?? 0,
            q2: existing?.q2 ?? 0,
            q3: existing?.q3 ?? 0,
            q4: existing?.q4 ?? 0,
            comment: existing?.comment ?? "",
            paymentStatus: existing?.paymentStatus,
            amountPaid: existing?.amountPaid,
            netAmount: existing?.netAmount ?? {},
            vatAmount: existing?.vatAmount ?? {},
            vatCleared: existing?.vatCleared ?? {},
            payableCleared: payableClearedObj,
            priorYearAdjustment: existing?.priorYearAdjustment ?? {},
          },
          // Update Cash at Bank (decrease when paying payable)
          [cashAtBankCode]: {
            q1: cashAtBank?.q1 ?? 0,
            q2: cashAtBank?.q2 ?? 0,
            q3: cashAtBank?.q3 ?? 0,
            q4: cashAtBank?.q4 ?? 0,
            [quarterKey]: newCashBalance,
            comment: cashAtBank?.comment ?? "",
            paymentStatus: cashAtBank?.paymentStatus,
            amountPaid: cashAtBank?.amountPaid,
            netAmount: cashAtBank?.netAmount ?? {},
            vatAmount: cashAtBank?.vatAmount ?? {},
            vatCleared: cashAtBank?.vatCleared ?? {},
            priorYearAdjustment: cashAtBank?.priorYearAdjustment ?? {},
          },
        };

        onDataChange?.(next);
        return next;
      });

      form.setValue(`${payableCode}.payableCleared.${quarterKey}`, clearAmount, { shouldDirty: true });
      
      // Also update Cash at Bank in the form
      const codeParts = payableCode.split('_');
      const projectPart = codeParts[0];
      const facilityPart = codeParts[2];
      const cashAtBankCode = `${projectPart}_EXEC_${facilityPart}_D_1`;
      const currentCashBalance = Number(formData[cashAtBankCode]?.[quarterKey]) || 0;
      form.setValue(`${cashAtBankCode}.${quarterKey}`, currentCashBalance - clearAmount, { shouldDirty: true });
    },
    [form, onDataChange, quarter, formData]
  );

  /**
   * Clear Other Receivable (collect a receivable)
   * This function records when other receivables are collected, reducing the receivable and increasing Cash at Bank
   * Accounting entry: Dr Cash at Bank, Cr Other Receivables
   */
  const clearOtherReceivable = useCallback(
    (receivableCode: string, clearAmount: number) => {
      const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';

      setFormData(prev => {
        const existing = prev[receivableCode];

        // Create quarter-specific other receivable cleared object
        // IMPORTANT: Add to existing cleared amount, don't replace it
        const previousCleared = (typeof existing?.otherReceivableCleared === 'object' && existing.otherReceivableCleared !== null)
          ? (existing.otherReceivableCleared[quarterKey] || 0)
          : 0;
        const newTotalCleared = previousCleared + clearAmount;
        
        const otherReceivableClearedObj = typeof existing?.otherReceivableCleared === 'object' && existing.otherReceivableCleared !== null
          ? { ...existing.otherReceivableCleared, [quarterKey]: newTotalCleared }
          : { [quarterKey]: newTotalCleared };

        console.log('💰 [clearOtherReceivable] Clearing receivable:', {
          receivableCode,
          clearAmount,
          previousCleared,
          newTotalCleared,
          quarter: quarterKey
        });

        const next = {
          ...prev,
          [receivableCode]: {
            q1: existing?.q1 ?? 0,
            q2: existing?.q2 ?? 0,
            q3: existing?.q3 ?? 0,
            q4: existing?.q4 ?? 0,
            comment: existing?.comment ?? "",
            paymentStatus: existing?.paymentStatus,
            amountPaid: existing?.amountPaid,
            netAmount: existing?.netAmount ?? {},
            vatAmount: existing?.vatAmount ?? {},
            vatCleared: existing?.vatCleared ?? {},
            payableCleared: existing?.payableCleared ?? {},
            otherReceivableCleared: otherReceivableClearedObj,
            priorYearAdjustment: existing?.priorYearAdjustment ?? {},
          },
        };

        onDataChange?.(next);
        return next;
      });

      form.setValue(`${receivableCode}.otherReceivableCleared.${quarterKey}`, clearAmount, { shouldDirty: true });
    },
    [form, onDataChange, quarter]
  );

  /**
   * Clear VAT receivable for a VAT-applicable expense
   * This function records when VAT refunds are received from RRA
   * Requirements: 3.2 (decrease VAT receivable), 3.3 (increase Cash at Bank)
   */
  const clearVAT = useCallback(
    (activityCode: string, clearAmount: number) => {
      const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';

      console.log('💰 [clearVAT] Called with:', {
        activityCode,
        clearAmount,
        quarter: quarterKey,
        existingData: formData[activityCode]
      });

      setFormData(prev => {
        const existing = prev[activityCode];

        // Create quarter-specific VAT cleared object
        // IMPORTANT: Add to existing cleared amount, don't replace it
        const previousCleared = (typeof existing?.vatCleared === 'object' && existing.vatCleared !== null)
          ? (existing.vatCleared[quarterKey] || 0)
          : 0;
        const newTotalCleared = previousCleared + clearAmount;
        
        const vatClearedObj = typeof existing?.vatCleared === 'object' && existing.vatCleared !== null
          ? { ...existing.vatCleared, [quarterKey]: newTotalCleared }
          : { [quarterKey]: newTotalCleared };

        console.log('💰 [clearVAT] VAT Cleared update:', {
          activityCode,
          quarter: quarterKey,
          previousCleared,
          clearAmount,
          newTotalCleared,
          vatClearedObj,
          expenseVATAmount: existing?.vatAmount?.[quarterKey] || 0,
          expenseNetAmount: existing?.netAmount?.[quarterKey] || 0
        });

        // Find Cash at Bank activity code (D_1) to increase it
        // Activity code format: {PROJECT}_EXEC_{FACILITY}_D_1
        const codeParts = activityCode.split('_');
        const projectPart = codeParts[0]; // HIV, MAL, or TB
        const facilityPart = codeParts[2]; // HOSPITAL or HEALTH_CENTER (or HEALTH)
        const cashAtBankCode = `${projectPart}_EXEC_${facilityPart}_D_1`;

        console.log('🔍 [DIAGNOSTIC] clearVAT - Looking for Cash at Bank:', {
          activityCode,
          cashAtBankCode,
          existsInFormData: !!prev[cashAtBankCode],
          formDataKeys: Object.keys(prev).filter(k => k.includes('_D_')),
          allFormDataKeys: Object.keys(prev).length
        });

        // Get current Cash at Bank value for this quarter
        const cashAtBank = prev[cashAtBankCode];
        const currentCashBalance = Number(cashAtBank?.[quarterKey]) || 0;
        
        console.log('🔍 [DIAGNOSTIC] clearVAT - Cash at Bank data:', {
          cashAtBankCode,
          found: !!cashAtBank,
          currentCashBalance,
          clearAmount,
          newBalance: currentCashBalance + clearAmount
        });
        const newCashBalance = currentCashBalance + clearAmount;

        const next = {
          ...prev,
          [activityCode]: {
            q1: existing?.q1 ?? 0,
            q2: existing?.q2 ?? 0,
            q3: existing?.q3 ?? 0,
            q4: existing?.q4 ?? 0,
            comment: existing?.comment ?? "",
            paymentStatus: existing?.paymentStatus,
            amountPaid: existing?.amountPaid,
            netAmount: existing?.netAmount ?? {},
            vatAmount: existing?.vatAmount ?? {},
            vatCleared: vatClearedObj,
            priorYearAdjustment: existing?.priorYearAdjustment ?? {},
          },
          // Update Cash at Bank (Requirement 3.3)
          [cashAtBankCode]: {
            q1: cashAtBank?.q1 ?? 0,
            q2: cashAtBank?.q2 ?? 0,
            q3: cashAtBank?.q3 ?? 0,
            q4: cashAtBank?.q4 ?? 0,
            [quarterKey]: newCashBalance,
            comment: cashAtBank?.comment ?? "",
            paymentStatus: cashAtBank?.paymentStatus,
            amountPaid: cashAtBank?.amountPaid,
            netAmount: cashAtBank?.netAmount ?? {},
            vatAmount: cashAtBank?.vatAmount ?? {},
            vatCleared: cashAtBank?.vatCleared ?? {},
            priorYearAdjustment: cashAtBank?.priorYearAdjustment ?? {},
          },
        };

        onDataChange?.(next);
        return next;
      });

      // Sync accumulated VAT cleared amount into RHF form state for dirtiness/consistency
      const existingForForm = formData[activityCode];
      const previousClearedForForm = (typeof existingForForm?.vatCleared === 'object' && existingForForm.vatCleared !== null)
        ? (existingForForm.vatCleared[quarterKey] || 0)
        : 0;
      const newTotalClearedForForm = previousClearedForForm + clearAmount;
      form.setValue(`${activityCode}.vatCleared.${quarterKey}`, newTotalClearedForForm, { shouldDirty: true });
    },
    [form, onDataChange, quarter, formData]
  );

  /**
   * Apply prior year adjustment for payable or receivable
   * This function handles prior year adjustments in Section G (G-01 subcategory)
   * 
   * For Cash adjustments: Double-entry - Cash at Bank increases, G increases
   * For Payable/Receivable adjustments: Updates the selected payable/receivable and G
   * 
   * @param priorYearAdjustmentCode - The activity code for the prior year adjustment (G-01 item)
   * @param targetItemCode - The payable or receivable code to adjust
   * @param adjustmentType - "increase" or "decrease"
   * @param amount - The adjustment amount
   */
  const applyPriorYearAdjustment = useCallback(
    (priorYearAdjustmentCode: string, targetItemCode: string, adjustmentType: 'increase' | 'decrease', amount: number) => {
      const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
      const signedAmount = adjustmentType === 'increase' ? amount : -amount;

      console.log('📝 [Prior Year Adjustment] Applying:', {
        priorYearAdjustmentCode,
        targetItemCode,
        adjustmentType,
        amount,
        signedAmount,
        quarter: quarterKey
      });

      setFormData(prev => {
        const priorYearData = prev[priorYearAdjustmentCode];
        const targetData = prev[targetItemCode];

        // Update the prior year adjustment value in Section G
        const currentPriorYearValue = Number(priorYearData?.[quarterKey]) || 0;
        const newPriorYearValue = currentPriorYearValue + signedAmount;

        // Track the prior year adjustment on the target item (for auto-calculation to use)
        const currentTargetPriorYearAdj = Number(targetData?.priorYearAdjustment?.[quarterKey]) || 0;
        const newTargetPriorYearAdj = currentTargetPriorYearAdj + signedAmount;

        console.log('📝 [Prior Year Adjustment] Values:', {
          priorYearAdjustmentCode,
          currentPriorYearValue,
          newPriorYearValue,
          targetItemCode,
          currentTargetPriorYearAdj,
          newTargetPriorYearAdj
        });

        const next = {
          ...prev,
          // Update prior year adjustment in Section G
          [priorYearAdjustmentCode]: {
            q1: priorYearData?.q1 ?? 0,
            q2: priorYearData?.q2 ?? 0,
            q3: priorYearData?.q3 ?? 0,
            q4: priorYearData?.q4 ?? 0,
            [quarterKey]: newPriorYearValue,
            comment: priorYearData?.comment ?? "",
            paymentStatus: priorYearData?.paymentStatus,
            amountPaid: priorYearData?.amountPaid,
            netAmount: priorYearData?.netAmount ?? {},
            vatAmount: priorYearData?.vatAmount ?? {},
            vatCleared: priorYearData?.vatCleared ?? {},
            payableCleared: priorYearData?.payableCleared ?? {},
            otherReceivableCleared: priorYearData?.otherReceivableCleared ?? {},
            priorYearAdjustment: priorYearData?.priorYearAdjustment ?? {},
          },
          // Update the target payable/receivable with priorYearAdjustment tracking
          [targetItemCode]: {
            q1: targetData?.q1 ?? 0,
            q2: targetData?.q2 ?? 0,
            q3: targetData?.q3 ?? 0,
            q4: targetData?.q4 ?? 0,
            comment: targetData?.comment ?? "",
            paymentStatus: targetData?.paymentStatus,
            amountPaid: targetData?.amountPaid,
            netAmount: targetData?.netAmount ?? {},
            vatAmount: targetData?.vatAmount ?? {},
            vatCleared: targetData?.vatCleared ?? {},
            payableCleared: targetData?.payableCleared ?? {},
            otherReceivableCleared: targetData?.otherReceivableCleared ?? {},
            priorYearAdjustment: {
              ...(targetData?.priorYearAdjustment ?? {}),
              [quarterKey]: newTargetPriorYearAdj,
            },
          },
        };

        onDataChange?.(next);
        return next;
      });

      form.setValue(`${priorYearAdjustmentCode}.${quarterKey}`, 
        (Number(formData[priorYearAdjustmentCode]?.[quarterKey]) || 0) + signedAmount, 
        { shouldDirty: true }
      );
      form.setValue(`${targetItemCode}.${quarterKey}`, 
        (Number(formData[targetItemCode]?.[quarterKey]) || 0) + signedAmount, 
        { shouldDirty: true }
      );
    },
    [form, onDataChange, quarter, formData]
  );

  /**
   * Apply prior year cash adjustment with double-entry
   * This function handles cash adjustments in Section G (G-01 Cash item)
   * 
   * Double-entry accounting:
   * - Cash at Bank (D_1) increases/decreases (handled by auto-calculation)
   * - Prior Year Adjustment - Cash (G-01) increases/decreases by the same amount
   * 
   * Note: Cash at Bank is auto-calculated and will include the prior year cash adjustment
   * 
   * @param cashAdjustmentCode - The activity code for the cash prior year adjustment (G-01 Cash)
   * @param adjustmentType - "increase" or "decrease"
   * @param amount - The adjustment amount
   */
  const applyPriorYearCashAdjustment = useCallback(
    (cashAdjustmentCode: string, adjustmentType: 'increase' | 'decrease', amount: number) => {
      const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
      const signedAmount = adjustmentType === 'increase' ? amount : -amount;

      console.log('💰 [Prior Year Cash Adjustment] Applying:', {
        cashAdjustmentCode,
        adjustmentType,
        amount,
        signedAmount,
        quarter: quarterKey
      });

      setFormData(prev => {
        const cashAdjustmentData = prev[cashAdjustmentCode];

        // Update the prior year cash adjustment value in Section G
        const currentCashAdjValue = Number(cashAdjustmentData?.[quarterKey]) || 0;
        const newCashAdjValue = currentCashAdjValue + signedAmount;

        console.log('💰 [Prior Year Cash Adjustment] Values:', {
          cashAdjustmentCode,
          currentCashAdjValue,
          newCashAdjValue,
          note: 'Cash at Bank will be updated by auto-calculation'
        });

        const next = {
          ...prev,
          // Update prior year cash adjustment in Section G
          // Cash at Bank will be auto-calculated to include this adjustment
          [cashAdjustmentCode]: {
            q1: cashAdjustmentData?.q1 ?? 0,
            q2: cashAdjustmentData?.q2 ?? 0,
            q3: cashAdjustmentData?.q3 ?? 0,
            q4: cashAdjustmentData?.q4 ?? 0,
            [quarterKey]: newCashAdjValue,
            comment: cashAdjustmentData?.comment ?? "",
            paymentStatus: cashAdjustmentData?.paymentStatus,
            amountPaid: cashAdjustmentData?.amountPaid,
            netAmount: cashAdjustmentData?.netAmount ?? {},
            vatAmount: cashAdjustmentData?.vatAmount ?? {},
            vatCleared: cashAdjustmentData?.vatCleared ?? {},
            payableCleared: cashAdjustmentData?.payableCleared ?? {},
            otherReceivableCleared: cashAdjustmentData?.otherReceivableCleared ?? {},
            priorYearAdjustment: cashAdjustmentData?.priorYearAdjustment ?? {},
          },
        };

        onDataChange?.(next);
        return next;
      });

      form.setValue(`${cashAdjustmentCode}.${quarterKey}`, 
        (Number(formData[cashAdjustmentCode]?.[quarterKey]) || 0) + signedAmount, 
        { shouldDirty: true }
      );
    },
    [form, onDataChange, quarter, formData]
  );

  const isLoading = schemaQuery.isLoading || activitiesQuery.isLoading;
  const error = schemaQuery.error || activitiesQuery.error;

  // OPTIMIZED: Real-time calculation of section totals for A and B
  // This is separate from the main table useMemo to enable faster updates for computed fields
  const realTimeSectionTotals = useMemo(() => {
    const hierarchicalData = activitiesQuery.data ?? {};
    if (Object.keys(hierarchicalData).length === 0) {
      return { A: { q1: 0, q2: 0, q3: 0, q4: 0 }, B: { q1: 0, q2: 0, q3: 0, q4: 0 } };
    }

    const calculateSectionTotal = (sectionCode: string) => {
      const sectionData = (hierarchicalData as any)[sectionCode];
      if (!sectionData) return { q1: 0, q2: 0, q3: 0, q4: 0 };

      let q1 = 0, q2 = 0, q3 = 0, q4 = 0;

      // Sum direct items
      if (sectionData.items) {
        for (const item of sectionData.items) {
          if (item.isTotalRow || item.isComputed) continue;
          const data = formData[item.code];
          if (data) {
            // For VAT-applicable expenses, use netAmount if available
            const isVATExpense = sectionCode === 'B' && item.metadata?.vatCategory;
            if (isVATExpense && data.netAmount) {
              q1 += Number(data.netAmount?.q1) || Number(data.q1) || 0;
              q2 += Number(data.netAmount?.q2) || Number(data.q2) || 0;
              q3 += Number(data.netAmount?.q3) || Number(data.q3) || 0;
              q4 += Number(data.netAmount?.q4) || Number(data.q4) || 0;
            } else {
              q1 += Number(data.q1) || 0;
              q2 += Number(data.q2) || 0;
              q3 += Number(data.q3) || 0;
              q4 += Number(data.q4) || 0;
            }
          }
        }
      }

      // Sum subcategory items
      if (sectionData.subCategories) {
        for (const subCat of Object.values(sectionData.subCategories) as any[]) {
          if (subCat.items) {
            for (const item of subCat.items) {
              if (item.isTotalRow || item.isComputed) continue;
              const data = formData[item.code];
              if (data) {
                // For VAT-applicable expenses, use netAmount if available
                const isVATExpense = sectionCode === 'B' && item.metadata?.vatCategory;
                if (isVATExpense && data.netAmount) {
                  q1 += Number(data.netAmount?.q1) || Number(data.q1) || 0;
                  q2 += Number(data.netAmount?.q2) || Number(data.q2) || 0;
                  q3 += Number(data.netAmount?.q3) || Number(data.q3) || 0;
                  q4 += Number(data.netAmount?.q4) || Number(data.q4) || 0;
                } else {
                  q1 += Number(data.q1) || 0;
                  q2 += Number(data.q2) || 0;
                  q3 += Number(data.q3) || 0;
                  q4 += Number(data.q4) || 0;
                }
              }
            }
          }
        }
      }

      return { q1, q2, q3, q4 };
    };

    return {
      A: calculateSectionTotal('A'),
      B: calculateSectionTotal('B'),
    };
  }, [activitiesQuery.data, formData]);

  // OPTIMIZED: Real-time Surplus/Deficit calculation (A - B)
  const realTimeSurplusDeficit = useMemo(() => {
    return {
      q1: realTimeSectionTotals.A.q1 - realTimeSectionTotals.B.q1,
      q2: realTimeSectionTotals.A.q2 - realTimeSectionTotals.B.q2,
      q3: realTimeSectionTotals.A.q3 - realTimeSectionTotals.B.q3,
      q4: realTimeSectionTotals.A.q4 - realTimeSectionTotals.B.q4,
      cumulativeBalance: (realTimeSectionTotals.A.q1 - realTimeSectionTotals.B.q1) +
                         (realTimeSectionTotals.A.q2 - realTimeSectionTotals.B.q2) +
                         (realTimeSectionTotals.A.q3 - realTimeSectionTotals.B.q3) +
                         (realTimeSectionTotals.A.q4 - realTimeSectionTotals.B.q4),
    };
  }, [realTimeSectionTotals]);

  // Table model derived from dynamic activities and server-computed values
  interface TableRow {
    id: string; // stable id (activity code for leaves, section key for parents)
    title: string;
    isCategory?: boolean;
    isSubcategory?: boolean;
    isEditable?: boolean;
    isCalculated?: boolean;
    children?: TableRow[];
    q1?: number;
    q2?: number;
    q3?: number;
    q4?: number;
    cumulativeBalance?: number;
  }

  const table: TableRow[] = useMemo(() => {
    const hierarchicalData = activitiesQuery.data ?? {};
    if (Object.keys(hierarchicalData).length === 0) return [];

    // DEBUG: Log formData to see what values are available
    console.log('[TABLE BUILD DEBUG] formData:', formData);
    console.log('[TABLE BUILD DEBUG] Sample Section D items:', {
      'HIV_EXEC_HOSPITAL_D_1': formData['HIV_EXEC_HOSPITAL_D_1'],
      'HIV_EXEC_HOSPITAL_E_7': formData['HIV_EXEC_HOSPITAL_E_7'],
    });

    // Helper functions
    function computedFieldForCategory(letter: string): keyof NonNullable<typeof computedValues> | null {
      switch (letter) {
        case "A": return "receipts" as const;
        case "B": return "expenditures" as const;
        case "C": return "surplus" as const;
        case "D": return "financialAssets" as const;
        case "E": return "financialLiabilities" as const;
        case "F": return "netFinancialAssets" as const;
        case "G": return "closingBalance" as const;
        case "X": return null; // Section X has no computed totals
        default: return null;
      }
    }

    // Sort categories by displayOrder
    const sortedCategories = Object.entries(hierarchicalData)
      .sort(([, a], [, b]) => ((a as any).displayOrder ?? 0) - ((b as any).displayOrder ?? 0));

    const sections: TableRow[] = [];
    const catLocalTotals: Record<string, { q1: number; q2: number; q3: number; q4: number; cumulativeBalance: number }> = {};

    for (const [categoryCode, categoryData] of sortedCategories) {
      const letter = categoryCode;
      const totalsKey = computedFieldForCategory(letter);
      const categoryInfo = categoryData as any;
      const children: TableRow[] = [];

      // Helper to build a leaf activity row
      function buildActivityRow(activity: any): TableRow {
        const state = formData[activity.code] || {};
        const isComputedActivity = Boolean(activity.isComputed);
        const isVATReceivable = activity.activityType === 'VAT_RECEIVABLE';
        const isComputedAsset = activity.activityType === 'COMPUTED_ASSET';

        let q1 = Number(state.q1) || 0;
        let q2 = Number(state.q2) || 0;
        let q3 = Number(state.q3) || 0;
        let q4 = Number(state.q4) || 0;
        let cumulativeBalance: number | undefined = undefined;
        let isCalculated = isComputedActivity || isVATReceivable || isComputedAsset;
        let isEditable = !isComputedActivity && !isVATReceivable && !isComputedAsset;

        // Handle computed activities
        if (isComputedActivity && totalsKey && computedValues && (computedValues as any)[totalsKey]) {
          const totalObj = (computedValues as any)[totalsKey] as any;
          q1 = totalObj.q1 ?? (Number(state.q1) || 0);
          q2 = totalObj.q2 ?? (Number(state.q2) || 0);
          q3 = totalObj.q3 ?? (Number(state.q3) || 0);
          q4 = totalObj.q4 ?? (Number(state.q4) || 0);
          cumulativeBalance = totalObj.cumulativeBalance ?? undefined;
        }

        // Handle VAT receivables - calculate from Section B VAT amounts
        if (isVATReceivable) {
          // Extract VAT category from activity name
          // e.g., "VAT Receivable 1: Communication - All" -> "communication_all"
          const activityName = activity.name?.toLowerCase() || '';
          let vatCategory: string | null = null;
          
          if (activityName.includes('communication')) {
            vatCategory = 'communication_all';
          } else if (activityName.includes('maintenance')) {
            vatCategory = 'maintenance';
          } else if (activityName.includes('fuel')) {
            vatCategory = 'fuel';
          } else if (activityName.includes('office supplies') || activityName.includes('supplies')) {
            vatCategory = 'office_supplies';
          }

          // Calculate VAT receivable for this category from Section B expenses
          if (vatCategory) {
            const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
            let vatReceivableAmount = 0;

            // Sum up VAT amounts from all Section B expenses in this category
            Object.entries(formData).forEach(([code, data]) => {
              if (code.includes('_B_')) {
                const vatAmount = data.vatAmount?.[quarterKey] || 0;

                if (vatAmount > 0) {
                  // Check if this expense matches the VAT category
                  const expenseName = (hierarchicalData as any)?.B?.subCategories 
                    ? Object.values((hierarchicalData as any).B.subCategories)
                        .flatMap((sub: any) => sub.items || [])
                        .find((item: any) => item.code === code)?.name?.toLowerCase()
                    : '';

                  if (expenseName) {
                    const matchesCategory = 
                      (vatCategory === 'communication_all' && expenseName.includes('communication') && expenseName.includes('all')) ||
                      (vatCategory === 'maintenance' && expenseName.includes('maintenance')) ||
                      (vatCategory === 'fuel' && (expenseName === 'fuel' || (expenseName.includes('fuel') && !expenseName.includes('refund')))) ||
                      (vatCategory === 'office_supplies' && (expenseName.includes('office supplies') || expenseName.includes('supplies')));

                    if (matchesCategory) {
                      vatReceivableAmount += vatAmount;
                    }
                  }
                }
              }
            });

            // Set the calculated VAT receivable amount for the current quarter
            if (quarterKey === 'q1') q1 = vatReceivableAmount;
            else if (quarterKey === 'q2') q2 = vatReceivableAmount;
            else if (quarterKey === 'q3') q3 = vatReceivableAmount;
            else if (quarterKey === 'q4') q4 = vatReceivableAmount;
          }
        }

        // Special formula rows under G: "Surplus/Deficit of the Period" should mirror C totals
        if (letter === "G" && typeof activity.name === "string") {
          const name = activity.name.toLowerCase();
          if (name.includes("surplus/deficit of the period")) {
            const cTotalsKey = computedFieldForCategory("C");
            const cObj = cTotalsKey && computedValues ? (computedValues as any)[cTotalsKey] : undefined;
            q1 = (cObj?.q1 ?? (Number(state.q1) || 0));
            q2 = (cObj?.q2 ?? (Number(state.q2) || 0));
            q3 = (cObj?.q3 ?? (Number(state.q3) || 0));
            q4 = (cObj?.q4 ?? (Number(state.q4) || 0));
            cumulativeBalance = cObj?.cumulativeBalance ?? undefined;
            isCalculated = true;
            isEditable = false;
          }
        }

        // Calculate cumulative balance based on section type
        if (typeof cumulativeBalance !== "number") {
          // Determine section from activity code
          // Code format: PROJECT_EXEC_FACILITY_SECTION_ID
          // Example: MAL_EXEC_HEALTH_CENTER_D_1 or HIV_EXEC_HOSPITAL_B_B-01_1
          // The section is a single letter (A-G) that appears after the facility type
          const codeParts = activity.code?.split('_') || [];
          // Find the part that is a single letter A-G or X (the section)
          const sectionPart = codeParts.find((part: string) => /^[A-GX]$/i.test(part));
          const sectionCode = sectionPart?.toUpperCase() || '';

          // Special case: Accumulated Surplus/Deficit stays the SAME across all quarters
          // It's auto-calculated from previous fiscal year's closing balance and doesn't change
          // The cumulative balance should be the same value (not a sum)
          const isAccumulatedSurplus = activity.name?.toLowerCase().includes('accumulated') && 
            (activity.name?.toLowerCase().includes('surplus') || activity.name?.toLowerCase().includes('deficit'));
          
          if (isAccumulatedSurplus) {
            // For Accumulated Surplus/Deficit, use the Q1 value (which is the same for all quarters)
            // The cumulative balance is also the same value (not a sum)
            cumulativeBalance = q1; // Q1 value = Q2 value = Q3 value = Q4 value = cumulative
          }
          // Stock/Balance sheet sections (D, E) use latest quarter with data
          else if (sectionCode === 'D' || sectionCode === 'E') {
            // Check quarters in reverse order (Q4 -> Q3 -> Q2 -> Q1)
            // Use the latest quarter value based on the computed q1..q4 amounts
            // This ensures auto-calculated rows (like VAT receivables) behave consistently
            const quarterOrder = ['Q1', 'Q2', 'Q3', 'Q4'];
            const currentQuarterIndex = quarterOrder.indexOf(quarter);

            const hasQ4 = (q4 !== 0) || currentQuarterIndex >= 3;
            const hasQ3 = (q3 !== 0) || currentQuarterIndex >= 2;
            const hasQ2 = (q2 !== 0) || currentQuarterIndex >= 1;
            const hasQ1 = (q1 !== 0) || currentQuarterIndex >= 0;

            // For stock sections, use the latest REPORTED quarter (including 0)
            // We need to distinguish between "not reported" vs "reported as 0"
            // Check in reverse order and use the first quarter that has been reported
            if (hasQ4) {
              cumulativeBalance = q4;
            } else if (hasQ3) {
              cumulativeBalance = q3;
            } else if (hasQ2) {
              cumulativeBalance = q2;
            } else if (hasQ1) {
              cumulativeBalance = q1;
            } else {
              // No quarters reported - leave as undefined to show dash
              cumulativeBalance = undefined;
            }
          } else {
            // Flow sections (A, B, C, F) and Section G items (except Accumulated Surplus) use cumulative sum
            cumulativeBalance = q1 + q2 + q3 + q4;
          }
        }

        return {
          id: activity.code,
          title: activity.name,
          isEditable,
          isCalculated,
          q1, q2, q3, q4, cumulativeBalance,
        } as TableRow;
      }

      // Collect all children (both direct items and subcategories) with their display orders
      const allChildren: Array<{ type: 'item' | 'subcategory'; displayOrder: number; data: any }> = [];

      // Add direct items (excluding total rows which are computed from children)
      if (categoryInfo.items) {
        console.log(`  📄 Adding ${categoryInfo.items.length} direct items`);
        categoryInfo.items.forEach((item: any) => {
          // Skip total rows - they are computed from children and should not be included
          if (item.isTotalRow) {
            console.log(`    - ${item.name} (displayOrder: ${item.displayOrder}) [SKIPPED - total row]`);
            return;
          }
          console.log(`    - ${item.name} (displayOrder: ${item.displayOrder})`);
          allChildren.push({
            type: 'item',
            displayOrder: item.displayOrder ?? 0,
            data: item,
          });
        });
      }

      // Add subcategories
      if (categoryInfo.subCategories) {
        console.log(`  📁 Adding ${Object.keys(categoryInfo.subCategories).length} subcategories`);
        Object.entries(categoryInfo.subCategories).forEach(([subCategoryCode, subCategoryData]) => {
          const subCategoryInfo = subCategoryData as any;
          console.log(`    📂 ${subCategoryCode} - ${subCategoryInfo.label} (displayOrder: ${subCategoryInfo.displayOrder}, items: ${subCategoryInfo.items?.length || 0})`);
          allChildren.push({
            type: 'subcategory',
            displayOrder: subCategoryInfo.displayOrder ?? 0,
            data: { code: subCategoryCode, info: subCategoryInfo },
          });
        });
      }

      // Sort all children by displayOrder
      allChildren.sort((a, b) => a.displayOrder - b.displayOrder);
      console.log(`  🔢 Sorted children:`, allChildren.map(c => `${c.type}:${c.displayOrder}`));

      // Process children in order
      for (const child of allChildren) {
        if (child.type === 'item') {
          children.push(buildActivityRow(child.data));
        } else if (child.type === 'subcategory') {
          const { code: subCategoryCode, info: subCategoryInfo } = child.data;
          console.log(`  🔨 Building subcategory row: ${subCategoryCode}`);
          console.log(`     Items to process: ${subCategoryInfo.items?.length || 0}`);
          
          const childRows = (subCategoryInfo.items || [])
            .filter((item: any) => !item.isTotalRow) // Exclude total rows
            .sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
            .map(buildActivityRow);

          console.log(`     Child rows built: ${childRows.length}`);
          console.log(`     Child row IDs:`, childRows.map((r: any) => r.id));

          const totals = childRows.reduce(
            (acc: any, r: any) => {
              acc.q1 += Number(r.q1 || 0);
              acc.q2 += Number(r.q2 || 0);
              acc.q3 += Number(r.q3 || 0);
              acc.q4 += Number(r.q4 || 0);
              acc.cumulativeBalance += Number(r.cumulativeBalance || 0);
              return acc;
            },
            { q1: 0, q2: 0, q3: 0, q4: 0, cumulativeBalance: 0 }
          );

          const subcategoryRow = {
            id: `${categoryCode}:${subCategoryCode}`,
            title: `${subCategoryCode}. ${subCategoryInfo.label}`,
            isSubcategory: true,
            isEditable: false,
            isCalculated: true,
            children: childRows,
            q1: totals.q1,
            q2: totals.q2,
            q3: totals.q3,
            q4: totals.q4,
            cumulativeBalance: totals.cumulativeBalance || undefined,
          };
          
          console.log(`     ✅ Subcategory row created:`, {
            id: subcategoryRow.id,
            title: subcategoryRow.title,
            isSubcategory: subcategoryRow.isSubcategory,
            childrenCount: subcategoryRow.children?.length,
            hasChildren: !!subcategoryRow.children && subcategoryRow.children.length > 0
          });

          children.push(subcategoryRow);
        }
      }

      // Compute category totals from children
      function sumRows(rows: TableRow[]): { q1: number; q2: number; q3: number; q4: number; cumulativeBalance: number } {
        return rows.reduce(
          (acc, r) => {
            if (r.isSubcategory && typeof r.q1 === "number") {
              acc.q1 += r.q1 || 0;
              acc.q2 += r.q2 || 0;
              acc.q3 += r.q3 || 0;
              acc.q4 += r.q4 || 0;
              acc.cumulativeBalance += Number(r.cumulativeBalance || 0);
            } else if (Array.isArray(r.children) && r.children.length > 0) {
              const nested = sumRows(r.children);
              acc.q1 += nested.q1;
              acc.q2 += nested.q2;
              acc.q3 += nested.q3;
              acc.q4 += nested.q4;
              acc.cumulativeBalance += nested.cumulativeBalance;
            } else {
              acc.q1 += Number(r.q1 || 0);
              acc.q2 += Number(r.q2 || 0);
              acc.q3 += Number(r.q3 || 0);
              acc.q4 += Number(r.q4 || 0);
              acc.cumulativeBalance += Number(r.cumulativeBalance || 0);
            }
            return acc;
          },
          { q1: 0, q2: 0, q3: 0, q4: 0, cumulativeBalance: 0 }
        );
      }

      // CRITICAL FIX: For sections D and E, use getSectionTotals instead of sumRows
      // because they have complex calculation logic (VAT receivables, cumulative balances, etc.)
      let normalizedCatTotals;
      if (letter === 'D' || letter === 'E') {
        const sectionTotals = getSectionTotals(categoryCode);
        normalizedCatTotals = {
          q1: sectionTotals.q1,
          q2: sectionTotals.q2,
          q3: sectionTotals.q3,
          q4: sectionTotals.q4,
          cumulativeBalance: sectionTotals.cumulativeBalance,
        };
      } else {
        const catTotals = sumRows(children);
        normalizedCatTotals = {
          q1: catTotals.q1,
          q2: catTotals.q2,
          q3: catTotals.q3,
          q4: catTotals.q4,
          cumulativeBalance: typeof catTotals.cumulativeBalance === "number"
            ? catTotals.cumulativeBalance
            : (catTotals.q1 + catTotals.q2 + catTotals.q3 + catTotals.q4),
        };
      }
      catLocalTotals[letter] = normalizedCatTotals;

      // Handle computed categories (C, F) or use local totals
      const serverTotals = totalsKey && computedValues ? (computedValues as any)[totalsKey] : undefined;
      const useServer = categoryInfo.isComputed && serverTotals;

      const sectionRow = {
        id: categoryCode,
        title: categoryInfo.label,
        isCategory: true,
        isEditable: false,
        children,
        q1: useServer ? (serverTotals.q1 ?? 0) : normalizedCatTotals.q1,
        q2: useServer ? (serverTotals.q2 ?? 0) : normalizedCatTotals.q2,
        q3: useServer ? (serverTotals.q3 ?? 0) : normalizedCatTotals.q3,
        q4: useServer ? (serverTotals.q4 ?? 0) : normalizedCatTotals.q4,
        cumulativeBalance: useServer
          ? (serverTotals.cumulativeBalance ?? (serverTotals.q1 ?? 0) + (serverTotals.q2 ?? 0) + (serverTotals.q3 ?? 0) + (serverTotals.q4 ?? 0))
          : normalizedCatTotals.cumulativeBalance,
      };

      sections.push(sectionRow);
    }

    // Client-side derived sections: C = A - B, F = D - E, and G incorporates C into its child
    function deriveDiff(
      a?: { q1: number; q2: number; q3: number; q4: number },
      b?: { q1: number; q2: number; q3: number; q4: number },
      type: 'flow' | 'stock' = 'flow'
    ) {
      const safeA = a || { q1: 0, q2: 0, q3: 0, q4: 0 };
      const safeB = b || { q1: 0, q2: 0, q3: 0, q4: 0 };
      const q1 = safeA.q1 - safeB.q1;
      const q2 = safeA.q2 - safeB.q2;
      const q3 = safeA.q3 - safeB.q3;
      const q4 = safeA.q4 - safeB.q4;

      let cumulativeBalance: number;

      if (type === 'stock') {
        // CRITICAL FIX: For stock sections (D, E), use latest quarter value
        // D and E are balance sheet items (point-in-time), not income statement items (flow)
        // Check in reverse order (Q4 -> Q3 -> Q2 -> Q1) for the latest reported quarter
        if (q4 !== 0 || (safeA.q4 !== 0 || safeB.q4 !== 0)) {
          cumulativeBalance = q4;
        } else if (q3 !== 0 || (safeA.q3 !== 0 || safeB.q3 !== 0)) {
          cumulativeBalance = q3;
        } else if (q2 !== 0 || (safeA.q2 !== 0 || safeB.q2 !== 0)) {
          cumulativeBalance = q2;
        } else {
          cumulativeBalance = q1;
        }
      } else {
        // For flow sections (A, B, C), sum all quarters
        cumulativeBalance = q1 + q2 + q3 + q4;
      }

      return { q1, q2, q3, q4, cumulativeBalance };
    }

    // Update computed sections with derived values
    // Use realTimeSurplusDeficit for C section (faster updates)
    const fDerived = deriveDiff(catLocalTotals["D"], catLocalTotals["E"], 'stock'); // F is stock (balance sheet)
    
    console.log('🔧 SECTION F CALCULATION FIX:', {
      'D totals (from getSectionTotals)': catLocalTotals["D"],
      'E totals (from getSectionTotals)': catLocalTotals["E"],
      'F derived (D - E)': fDerived,
    });

    // Update C section if it exists - use real-time calculated values
    const cIdx = sections.findIndex(s => s.id === "C");
    if (cIdx >= 0) {
      (sections[cIdx] as any).q1 = realTimeSurplusDeficit.q1;
      (sections[cIdx] as any).q2 = realTimeSurplusDeficit.q2;
      (sections[cIdx] as any).q3 = realTimeSurplusDeficit.q3;
      (sections[cIdx] as any).q4 = realTimeSurplusDeficit.q4;
      (sections[cIdx] as any).cumulativeBalance = realTimeSurplusDeficit.cumulativeBalance;
    }

    // Update F section if it exists
    const fIdx = sections.findIndex(s => s.id === "F");
    if (fIdx >= 0) {
      (sections[fIdx] as any).q1 = fDerived.q1;
      (sections[fIdx] as any).q2 = fDerived.q2;
      (sections[fIdx] as any).q3 = fDerived.q3;
      (sections[fIdx] as any).q4 = fDerived.q4;
      (sections[fIdx] as any).cumulativeBalance = fDerived.cumulativeBalance;
    }

    // Update G section's "Surplus/Deficit of the Period" child with real-time calculated values
    const gIdx = sections.findIndex(s => s.id === "G");
    if (gIdx >= 0) {
      const gSection = sections[gIdx];
      
      console.log('🔍 [G Section Debug] Before update:', {
        childrenCount: gSection.children?.length,
        childrenTitles: gSection.children?.map(c => c.title),
        realTimeSurplusDeficit
      });
      
      // Find Surplus/Deficit of the Period - try multiple search patterns
      let surplusChild = gSection.children?.find(r => String(r.title).toLowerCase().includes("surplus/deficit of the period"));
      if (!surplusChild) {
        // Try alternative search patterns
        surplusChild = gSection.children?.find(r => String(r.title).toLowerCase().includes("surplus") && String(r.title).toLowerCase().includes("period"));
      }
      if (!surplusChild) {
        // Try searching in nested children (subcategories)
        for (const child of gSection.children || []) {
          if (child.children) {
            const nested = child.children.find((r: any) => String(r.title).toLowerCase().includes("surplus/deficit"));
            if (nested) {
              console.log('⚠️ [G Section Debug] Found surplusChild in nested children:', nested.title);
              surplusChild = nested;
              break;
            }
          }
        }
      }
      
      if (surplusChild) {
        console.log('🔍 [G Section Debug] Found surplusChild:', {
          title: surplusChild.title,
          beforeUpdate: { q1: (surplusChild as any).q1, q2: (surplusChild as any).q2, q3: (surplusChild as any).q3, q4: (surplusChild as any).q4, cumulativeBalance: (surplusChild as any).cumulativeBalance }
        });
        
        // Use the real-time calculated surplus/deficit for faster updates
        (surplusChild as any).q1 = realTimeSurplusDeficit.q1;
        (surplusChild as any).q2 = realTimeSurplusDeficit.q2;
        (surplusChild as any).q3 = realTimeSurplusDeficit.q3;
        (surplusChild as any).q4 = realTimeSurplusDeficit.q4;
        (surplusChild as any).cumulativeBalance = realTimeSurplusDeficit.cumulativeBalance;
        (surplusChild as any).isCalculated = true;
        (surplusChild as any).isEditable = false;
        
        console.log('🔍 [G Section Debug] After surplusChild update:', {
          q1: (surplusChild as any).q1, q2: (surplusChild as any).q2, q3: (surplusChild as any).q3, q4: (surplusChild as any).q4, cumulativeBalance: (surplusChild as any).cumulativeBalance
        });
      } else {
        console.warn('⚠️ [G Section Debug] surplusChild NOT FOUND! Children:', gSection.children?.map(c => ({ title: c.title, isSubcategory: c.isSubcategory })));
      }

      // Re-sum G header from its children (including subcategories)
      // G. Closing Balance cumulative = sum of children's cumulative balances
      // - Accumulated Surplus/Deficit cumulative = Q1 value (same for all quarters)
      // - Prior Year Adjustments cumulative = sum of Q1+Q2+Q3+Q4 (flow)
      // - Surplus/Deficit of Period cumulative = sum of Q1+Q2+Q3+Q4 (flow)
      if (gSection.children) {
        console.log('🔍 [G Section Debug] Children before re-sum:', gSection.children.map(c => ({
          title: c.title,
          isSubcategory: c.isSubcategory,
          q1: (c as any).q1,
          q2: (c as any).q2,
          q3: (c as any).q3,
          q4: (c as any).q4,
          cumulativeBalance: (c as any).cumulativeBalance
        })));
        
        const gTotals = gSection.children.reduce((acc, r) => {
          acc.q1 += Number((r as any).q1 || 0);
          acc.q2 += Number((r as any).q2 || 0);
          acc.q3 += Number((r as any).q3 || 0);
          acc.q4 += Number((r as any).q4 || 0);
          acc.cumulativeBalance += Number((r as any).cumulativeBalance || 0);
          return acc;
        }, { q1: 0, q2: 0, q3: 0, q4: 0, cumulativeBalance: 0 });

        console.log('🔍 [G Section Debug] gTotals after re-sum:', gTotals);

        (sections[gIdx] as any).q1 = gTotals.q1;
        (sections[gIdx] as any).q2 = gTotals.q2;
        (sections[gIdx] as any).q3 = gTotals.q3;
        (sections[gIdx] as any).q4 = gTotals.q4;
        (sections[gIdx] as any).cumulativeBalance = gTotals.cumulativeBalance;
      }
    }

    return sections;
  }, [activitiesQuery.data, formData, computedValues, realTimeSurplusDeficit]);

  // Quarter UX helpers
  const quarterLabels = useMemo(() => ({
    Q1: "Jul - Sep",
    Q2: "Oct - Dec (Future)",
    Q3: "Jan - Mar (Future)",
    Q4: "Apr - Jun (Future)",
  }), []);

  function isQuarterEditable(q: Quarter): boolean {
    // Only the current quarter should be editable
    return q === quarter;
  }

  function isQuarterVisible(q: Quarter): boolean {
    // Quarter is visible if it's the current quarter OR has existing data
    const hasExistingDataForQuarter = Object.entries(formData)
      .filter(([_, activityData]) => {
        // Filter out non-activity entries
        return activityData && typeof activityData === 'object' && ('q1' in activityData || 'q2' in activityData || 'q3' in activityData || 'q4' in activityData);
      })
      .some(([_, activityData]) => {
        const quarterKey = q.toLowerCase() as keyof ActivityQuarterValues;
        const value = (activityData as ActivityQuarterValues)[quarterKey];
        return value !== undefined && value !== null && Number(value) > 0;
      });

    return (q === quarter) || hasExistingDataForQuarter;
  }

  const lockedQuarters = useMemo<Quarter[]>(() =>
    (["Q1", "Q2", "Q3", "Q4"] as Quarter[]).filter(q => !isQuarterEditable(q)),
    [quarter, formData]);

  // Section expand/collapse state (default collapsed)
  const [expandState, setExpandState] = useState<Record<string, boolean>>({});
  const onToggleSection = useCallback((id: string) => {
    setExpandState(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // --- Helper: compute Section E totals directly from formData (payables) ---
  function computeSectionEFromFormData() {
    const totals = { q1: 0, q2: 0, q3: 0, q4: 0, cumulativeBalance: 0 } as Record<string, number>;
    
    const eCodes: string[] = [];
    Object.entries(formData).forEach(([code, values]) => {
      if (!code.includes('_E_')) return;
      eCodes.push(code);
      
      const q1Val = Number(values.q1) || 0;
      const q2Val = Number(values.q2) || 0;
      const q3Val = Number(values.q3) || 0;
      const q4Val = Number(values.q4) || 0;
      
      totals.q1 += q1Val;
      totals.q2 += q2Val;
      totals.q3 += q3Val;
      totals.q4 += q4Val;
      
      // if (q1Val !== 0 || q2Val !== 0 || q3Val !== 0 || q4Val !== 0) {
      //   console.log(`  ${code}: q1=${q1Val}, q2=${q2Val}, q3=${q3Val}, q4=${q4Val}`);
      // }
    });
    
    console.log(`Total Section E codes found: ${eCodes.length}`);
    console.log('Quarterly totals:', { q1: totals.q1, q2: totals.q2, q3: totals.q3, q4: totals.q4 });
    
    // Section E is also a STOCK section (balance sheet item)
    // Cumulative balance should be the LATEST quarter value, NOT the sum
    totals.cumulativeBalance = totals.q4 || totals.q3 || totals.q2 || totals.q1 || 0;
    
    console.log('Cumulative balance (latest quarter):', totals.cumulativeBalance);
    console.groupEnd();
    
    return totals as { q1: number; q2: number; q3: number; q4: number; cumulativeBalance: number };
  }

  // --- Helper: compute Section G totals directly from formData (Closing Balance) ---
  // G. Closing Balance = Accumulated Surplus/Deficit + Prior Year Adjustments + Surplus/Deficit of Period
  // IMPORTANT: G. Closing Balance is a BALANCE SHEET item (like D, E, F)
  // The cumulative balance should be the LATEST quarter value, not the sum of all quarters
  function computeSectionGFromFormData() {
    const totals = { q1: 0, q2: 0, q3: 0, q4: 0, cumulativeBalance: 0 };
    
    // Accumulated Surplus quarterly values (same value for all quarters)
    let accumulatedSurplusQ1 = 0;
    let accumulatedSurplusQ2 = 0;
    let accumulatedSurplusQ3 = 0;
    let accumulatedSurplusQ4 = 0;
    
    // Prior Year Adjustments quarterly values
    let priorYearQ1 = 0;
    let priorYearQ2 = 0;
    let priorYearQ3 = 0;
    let priorYearQ4 = 0;
    
    const gCodes: string[] = [];
    Object.entries(formData).forEach(([code, values]) => {
      if (!code.includes('_G_')) return;
      gCodes.push(code);
      
      const q1Val = Number(values.q1) || 0;
      const q2Val = Number(values.q2) || 0;
      const q3Val = Number(values.q3) || 0;
      const q4Val = Number(values.q4) || 0;
      
      // Accumulated Surplus/Deficit (_G_1, not in G-01 subcategory): same value for all quarters
      if (code.includes('_G_1') && !code.includes('G-01')) {
        accumulatedSurplusQ1 = q1Val;
        accumulatedSurplusQ2 = q2Val;
        accumulatedSurplusQ3 = q3Val;
        accumulatedSurplusQ4 = q4Val;
      }
      // Prior Year Adjustments (G-01 subcategory: _G_G-01_1, _G_G-01_2, _G_G-01_3)
      else if (code.includes('_G_G-01_')) {
        priorYearQ1 += q1Val;
        priorYearQ2 += q2Val;
        priorYearQ3 += q3Val;
        priorYearQ4 += q4Val;
      }
      // Note: Surplus/Deficit of Period (_G_4) is NOT in formData because it's a computed activity
      // We use realTimeSurplusDeficit instead (calculated from A - B)
    });
    
    // Calculate quarterly totals:
    // G. Closing Balance = Accumulated Surplus + Prior Year Adjustments + Surplus/Deficit of Period
    totals.q1 = accumulatedSurplusQ1 + priorYearQ1 + realTimeSurplusDeficit.q1;
    totals.q2 = accumulatedSurplusQ2 + priorYearQ2 + realTimeSurplusDeficit.q2;
    totals.q3 = accumulatedSurplusQ3 + priorYearQ3 + realTimeSurplusDeficit.q3;
    totals.q4 = accumulatedSurplusQ4 + priorYearQ4 + realTimeSurplusDeficit.q4;
    
    // G. Closing Balance cumulative = sum of children's cumulative balances
    // - Accumulated Surplus/Deficit cumulative = Q1 value (same for all quarters)
    // - Prior Year Adjustments cumulative = sum of Q1+Q2+Q3+Q4 (flow)
    // - Surplus/Deficit of Period cumulative = sum of Q1+Q2+Q3+Q4 (flow)
    const accumulatedSurplusCumulative = accumulatedSurplusQ1; // Same value for all quarters
    const priorYearAdjustmentsCumulative = priorYearQ1 + priorYearQ2 + priorYearQ3 + priorYearQ4;
    const surplusDeficitPeriodCumulative = realTimeSurplusDeficit.cumulativeBalance;
    
    totals.cumulativeBalance = accumulatedSurplusCumulative + priorYearAdjustmentsCumulative + surplusDeficitPeriodCumulative;
    
    console.log('🔍 [computeSectionGFromFormData] Section G calculation:', {
      gCodes: gCodes.length,
      quarterly: { q1: totals.q1, q2: totals.q2, q3: totals.q3, q4: totals.q4 },
      components: {
        accumulatedSurplus: { q1: accumulatedSurplusQ1, q2: accumulatedSurplusQ2, q3: accumulatedSurplusQ3, q4: accumulatedSurplusQ4 },
        priorYearAdjustments: { q1: priorYearQ1, q2: priorYearQ2, q3: priorYearQ3, q4: priorYearQ4 },
        surplusDeficitPeriod: { q1: realTimeSurplusDeficit.q1, q2: realTimeSurplusDeficit.q2, q3: realTimeSurplusDeficit.q3, q4: realTimeSurplusDeficit.q4 }
      },
      cumulativeBalance: totals.cumulativeBalance,
      note: 'G is a balance sheet item - cumulative = latest quarter value'
    });
    
    return totals;
  }

  // --- Helper: compute Section D totals directly from formData (includes VAT codes) ---
  function computeSectionDFromFormData() {
    const totals = { q1: 0, q2: 0, q3: 0, q4: 0, cumulativeBalance: 0 } as Record<string, number>;
    
    console.group('🔍 [computeSectionDFromFormData] Calculating Section D');
    console.log('Total formData keys:', Object.keys(formData).length);
    
    const dCodes: string[] = [];
    Object.entries(formData).forEach(([code, values]) => {
      if (!code.includes('_D_')) return;
      dCodes.push(code);
      
      const q1Val = Number(values.q1) || 0;
      const q2Val = Number(values.q2) || 0;
      const q3Val = Number(values.q3) || 0;
      const q4Val = Number(values.q4) || 0;
      
      totals.q1 += q1Val;
      totals.q2 += q2Val;
      totals.q3 += q3Val;
      totals.q4 += q4Val;
      
      if (q1Val !== 0 || q2Val !== 0 || q3Val !== 0 || q4Val !== 0) {
        console.log(`  ${code}: q1=${q1Val}, q2=${q2Val}, q3=${q3Val}, q4=${q4Val}`);
      }
    });
    
    console.log(`Total Section D codes found: ${dCodes.length}`);
    console.log(`VAT codes: ${dCodes.filter(c => c.includes('_VAT_')).length}`);
    console.log('Quarterly totals:', { q1: totals.q1, q2: totals.q2, q3: totals.q3, q4: totals.q4 });
    
    // CRITICAL FIX: Section D is a STOCK section (balance sheet item)
    // Cumulative balance should be the LATEST quarter value, NOT the sum
    // This ensures Section F (D - E) calculates correctly
    totals.cumulativeBalance = totals.q4 || totals.q3 || totals.q2 || totals.q1 || 0;
    
    console.log('Cumulative balance (latest quarter):', totals.cumulativeBalance);
    console.groupEnd();
    
    return totals as { q1: number; q2: number; q3: number; q4: number; cumulativeBalance: number };
  }

  // Section totals sourced from computedValues
  interface SectionTotals {
    q1: number;
    q2: number;
    q3: number;
    q4: number;
    cumulativeBalance: number;
  }

  function getSectionTotals(sectionId: string): SectionTotals {
    const letter = String(sectionId).split("_").pop()?.charAt(0) ?? sectionId.charAt(0);
    const isStockSection = ['D', 'E', 'F'].includes(letter);

    // For Section F (Net Financial Assets), always derive from D and E totals
    if (letter === 'F') {
      
      const dTotals: SectionTotals = getSectionTotals('D');
      const eTotals: SectionTotals = getSectionTotals('E');
      
      console.log('Section D totals:', dTotals);
      console.log('Section E totals:', eTotals);
      
      const q1: number = dTotals.q1 - eTotals.q1;
      const q2: number = dTotals.q2 - eTotals.q2;
      const q3: number = dTotals.q3 - eTotals.q3;
      const q4: number = dTotals.q4 - eTotals.q4;
      
      console.log('Section F quarterly:', { q1, q2, q3, q4 });
      
      // For stock sections, cumulativeBalance should be the latest quarter's value, not the sum
      const cumulativeBalance = q4 || q3 || q2 || q1 || 0;
      
      console.log('Section F cumulative (latest quarter):', cumulativeBalance);
      console.groupEnd();
      
      return { q1, q2, q3, q4, cumulativeBalance };
    }

    const map: Record<string, keyof NonNullable<typeof computedValues>> = {
      A: "receipts",
      B: "expenditures",
      C: "surplus",
      D: "financialAssets",
      E: "financialLiabilities",
      F: "netFinancialAssets",
      G: "closingBalance",
    } as any;
    const key = map[letter];
    if (!key || !computedValues) {
      // If no server totals or invalid key, compute manually for Section D, E, and G as fallback
      if (letter === 'D') {
        return computeSectionDFromFormData();
      }
      if (letter === 'E') {
        return computeSectionEFromFormData();
      }
      if (letter === 'G') {
        return computeSectionGFromFormData();
      }
      return { q1: 0, q2: 0, q3: 0, q4: 0, cumulativeBalance: 0 };
    }

    // For Section G, always use the manual calculation to ensure correct cumulative balance
    // The cumulative balance should be the sum of children's cumulative balances (vertical sum)
    // not the sum of Q1+Q2+Q3+Q4 (horizontal sum)
    if (letter === 'G') {
      return computeSectionGFromFormData();
    }

    let t = (computedValues as any)[key] || {};

    // For stock sections (D, E), ensure we're using the latest quarter's value as cumulative
    if (isStockSection) {
      const latestQuarter = t.q4 !== undefined ? t.q4 : 
                          t.q3 !== undefined ? t.q3 : 
                          t.q2 !== undefined ? t.q2 : 
                          t.q1 !== undefined ? t.q1 : 0;
      
      t = {
        ...t,
        cumulativeBalance: latestQuarter
      };
    }

    // For Section D, check if we need to include VAT receivables
    if (letter === 'D') {
      const manual = computeSectionDFromFormData();
      const serverTotal = Number(t.cumulativeBalance ?? 0);
      const diff = Math.abs(serverTotal - manual.cumulativeBalance);
      
      // If there's a significant difference, use the manual calculation which includes VAT
      if (diff > 0.0001) {
        // Prefer manual if it differs significantly
        return manual;
      }
    }

    // For Section E, also check if manual calculation differs
    if (letter === 'E') {
      const manual = computeSectionEFromFormData();
      const serverTotal = Number(t.cumulativeBalance ?? 0);
      const diff = Math.abs(serverTotal - manual.cumulativeBalance);
      
      // If there's a significant difference, use the manual calculation
      if (diff > 0.0001) {
        return manual;
      }
    }

    return {
      q1: t.q1 ?? 0,
      q2: t.q2 ?? 0,
      q3: t.q3 ?? 0,
      q4: t.q4 ?? 0,
      cumulativeBalance: t.cumulativeBalance ?? 0,
    };
  }

  // Row state helpers
  function getRowState(code: string) {
    const sectionLetter = code.split("_").slice(-2, -1)[0]?.slice(0, 1) || code.slice(0, 1);
    
    // Find the activity in the hierarchical data to check its type
    const hierarchicalData = activitiesQuery.data ?? {};
    let activityType: string | undefined;
    let activityName: string | undefined;
    
    // Search through all categories and subcategories to find the activity
    for (const categoryData of Object.values(hierarchicalData)) {
      const category = categoryData as any;
      
      // Check direct items
      if (category.items) {
        const found = category.items.find((item: any) => item.code === code);
        if (found) {
          activityType = found.activityType;
          activityName = found.name;
          break;
        }
      }
      
      // Check subcategories
      if (category.subCategories) {
        for (const subCategoryData of Object.values(category.subCategories)) {
          const subCategory = subCategoryData as any;
          if (subCategory.items) {
            const found = subCategory.items.find((item: any) => item.code === code);
            if (found) {
              activityType = found.activityType;
              activityName = found.name;
              break;
            }
          }
        }
        if (activityType) break;
      }
    }
    
    // Check if this is an opening balance field (Requirement 11.1)
    const isOpeningBalance = isOpeningBalanceField(code, activityName);
    
    // Check if this is a computed asset (like "Other Receivables (auto from Miscellaneous)")
    const isComputedAsset = activityType === 'COMPUTED_ASSET';
    
    // Check if this is Accumulated Surplus/Deficit (auto-calculated from previous fiscal year)
    const isAccumulatedSurplus = activityName?.toLowerCase().includes('accumulated') && 
      (activityName?.toLowerCase().includes('surplus') || activityName?.toLowerCase().includes('deficit'));
    
    // Only blanket-compute C and F; G leaves are editable except the specific computed row handled in table model
    // Accumulated Surplus/Deficit is also computed (auto-filled from previous fiscal year's closing balance)
    const isComputed = ["C", "F"].includes(sectionLetter) || isComputedAsset || isOpeningBalance || isAccumulatedSurplus;
    
    // Section X (Miscellaneous Adjustments) activities are editable for current quarter only
    const isMiscellaneousAdjustment = activityType === 'MISCELLANEOUS_ADJUSTMENT';
    const isEditable = !isComputed && (isMiscellaneousAdjustment || !["C", "F"].includes(sectionLetter));
    
    let message: string | undefined;
    if (isOpeningBalance) {
      message = "Opening balance is automatically set from previous quarter closing balance";
    } else if (isComputedAsset) {
      message = "Auto-calculated from Miscellaneous Adjustments";
    } else if (isAccumulatedSurplus) {
      message = "Auto-calculated from previous fiscal year's closing balance";
    } else if (isComputed) {
      message = "Computed from totals";
    }
    
    return { isEditable, isCalculated: isComputed, validationMessage: message };
  }

  // Allow submission - removed strict accounting equation validation
  // The accounting equation check (F = G) is informational, not blocking
  const canSubmitExecution = useMemo(() => {
    // Only block submission if there are critical validation errors
    // The accounting equation balance is shown as a warning, not a blocker
    const hasBlockingErrors = Object.keys(validationErrors).length > 0;
    const canSubmit = !hasBlockingErrors;
    
    console.log('🔐 [canSubmitExecution]:', {
      isBalanced,
      validationErrorsCount: Object.keys(validationErrors).length,
      hasBlockingErrors,
      canSubmit,
      quarter,
      note: 'Accounting equation check is informational only'
    });
    
    return canSubmit;
  }, [isBalanced, validationErrors, quarter]);

  function isRowLocked(code: string, q: Quarter): boolean {
    const { isEditable } = getRowState(code);

    // If the row itself isn't editable (computed), it's always locked
    if (!isEditable) return true;

    // Find the activity type to check for special cases
    const hierarchicalData = activitiesQuery.data ?? {};
    let activityType: string | undefined;
    
    // Search through all categories and subcategories to find the activity
    for (const categoryData of Object.values(hierarchicalData)) {
      const category = categoryData as any;
      
      // Check direct items
      if (category.items) {
        const found = category.items.find((item: any) => item.code === code);
        if (found) {
          activityType = found.activityType;
          break;
        }
      }
      
      // Check subcategories
      if (category.subCategories) {
        for (const subCategoryData of Object.values(category.subCategories)) {
          const subCategory = subCategoryData as any;
          if (subCategory.items) {
            const found = subCategory.items.find((item: any) => item.code === code);
            if (found) {
              activityType = found.activityType;
              break;
            }
          }
        }
        if (activityType) break;
      }
    }

    // Special case: Section X (Miscellaneous Adjustments) activities are only editable for current quarter
    const isMiscellaneousAdjustment = activityType === 'MISCELLANEOUS_ADJUSTMENT';
    if (isMiscellaneousAdjustment && q !== quarter) {
      return true; // Locked for all quarters except current
    }

    // Special case: "Accumulated Surplus/Deficit" is ALWAYS read-only (auto-calculated from previous fiscal year)
    // It remains constant across all quarters (Q1-Q4) of the fiscal year
    // Check if this is an accumulated surplus/deficit row by looking at the activity name
    const activityData = table.flatMap(section => {
      if (section.children) {
        return section.children.flatMap(child => {
          if (child.children) {
            return child.children;
          }
          return [child];
        });
      }
      return [];
    }).find(item => item.id === code);

    if (activityData && activityData.title) {
      const titleLower = activityData.title.toLowerCase();
      if (titleLower.includes('accumulated') && (titleLower.includes('surplus') || titleLower.includes('deficit'))) {
        // Accumulated Surplus/Deficit is ALWAYS read-only - auto-calculated from previous fiscal year's closing balance
        return true; // Locked for ALL quarters (Q1, Q2, Q3, Q4)
      }
    }

    // If it's not the current quarter, it should always be locked
    // (Previous quarters with data should be visible but locked for viewing)
    // (Previous quarters without data should be hidden)
    if (q !== quarter) {
      return true; // Always locked for non-current quarters
    }

    // Current quarter is always editable (for rows that are editable)
    return false;
  }

  // Header context placeholders (can be integrated with facility/period queries if available)
  const header = useMemo(() => ({
    facilityName: undefined as string | undefined,
    periodLabel: undefined as string | undefined,
    quarter,
  }), [quarter]);

  // Action gating
  const topLevelErrors = useMemo(() => {
    const errors: string[] = [];
    if (isBalanced === false) errors.push("Accounting equation failed: F â‰  G");
    return errors;
  }, [isBalanced]);

  const canSaveDraft = useMemo(() => Boolean(schemaQuery.data && activitiesQuery.data), [schemaQuery.data, activitiesQuery.data]);
  const canCreateReport = useMemo(() => canSubmitExecution, [canSubmitExecution]);

  // Final table structure check
  console.log('\n📊 [Final Table] Sections:', table.length);
  const dSection = table.find((s: any) => s.id === 'D');
  if (dSection) {
    console.log('📊 [Final Table] Section D:', {
      id: dSection.id,
      title: dSection.title,
      childrenCount: dSection.children?.length,
      children: dSection.children?.map((c: any) => ({
        id: c.id,
        title: c.title,
        isSubcategory: c.isSubcategory,
        hasChildren: !!c.children && c.children.length > 0,
        childrenCount: c.children?.length
      }))
    });
  }

  return {
    // RHF
    form,

    // Data
    schema: schemaQuery.data,
    activities: activitiesQuery.data,

    // Form state
    formData,
    setFormData,
    quarter,
    
    // Quarterly rollover data
    previousQuarterBalances,

    // Server computations & validation
    computedValues,
    isBalanced,
    difference,
    validationErrors,
    clientValidationErrors,  // NEW: Client-side validation errors (Requirements: 11.1-11.5)

    // Schema-compatible hierarchical data built from activities
    table,

    // Real-time computed values for faster UI updates
    realTimeSurplusDeficit,

    // Quarter UX helpers
    quarterLabels,
    isQuarterEditable,
    isQuarterVisible,
    lockedQuarters,

    // Section helpers
    expandState,
    onToggleSection,
    getSectionTotals,

    // Row helpers
    getRowState,
    isRowLocked,

    // Header context
    header,

    // Actions and status
    canSaveDraft,
    canCreateReport,
    status: {
      isLoadingSchema: schemaQuery.isLoading,
      isLoadingActivities: activitiesQuery.isLoading,
      isCalculating: calculateBalances.isPending,
      isValidating: validateEquation.isPending,
    },

    // Handlers
    onFieldChange: handleFieldChange,
    onCommentChange: setComment,
    updateExpensePayment,
    updateVATExpense,
    clearVAT,
    clearPayable,
    clearOtherReceivable,
    applyPriorYearAdjustment,
    applyPriorYearCashAdjustment,

    // Status
    isLoading,
    error,
    isDirty: form.formState.isDirty,
    isValid: Object.keys(validationErrors).length === 0 && clientValidationErrors.length === 0 && isBalanced,

    // Utilities
    getPayload: () => payload,
    setDebounceMs,
    canSubmitExecution,
    reset: () => {
      form.reset();
      setFormData(migratedInitialData);
      setValidationErrors({});
      setComputedValues(null);
      setIsBalanced(true);
      setDifference(0);
    },
  };
}

