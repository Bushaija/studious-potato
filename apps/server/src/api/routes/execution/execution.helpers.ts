export function parseCode(code: string) {
  // Example codes:
  // HIV_EXEC_HOSPITAL_B_B-04_1       -> section: B, subSection: B-04
  // HIV_EXEC_HOSPITAL_D_1            -> section: D, subSection: null
  // HIV_EXEC_HEALTH_CENTER_B_1       -> section: B, subSection: null
  // HIV_EXEC_HEALTH_CENTER_B_B-04_1  -> section: B, subSection: B-04
  
  const parts = code.split("_");
  
  // Find the index of 'EXEC' (always present in execution codes)
  const execIndex = parts.findIndex(p => p === 'EXEC');
  
  if (execIndex === -1) {
    // Fallback for non-standard codes
    return { section: null, subSection: null };
  }
  
  // The facility type starts after 'EXEC' and could be:
  // - 'HOSPITAL' (1 word)
  // - 'HEALTH_CENTER' (2 words: 'HEALTH', 'CENTER')
  // 
  // Strategy: The section is always a single letter (A-G)
  // Find the first single-letter part after 'EXEC' that matches A-G
  let sectionIndex = -1;
  for (let i = execIndex + 1; i < parts.length; i++) {
    if (parts[i].length === 1 && /[A-G]/.test(parts[i])) {
      sectionIndex = i;
      break;
    }
  }
  
  if (sectionIndex === -1) {
    // No valid section found
    return { section: null, subSection: null };
  }
  
  const section = parts[sectionIndex];
  const potentialSubSection = parts[sectionIndex + 1] || null;
  
  // SubSection should only be set if it follows the pattern X-YY (e.g., B-01, B-02)
  // If the next part is just a number, it's an activity ID, not a subsection
  const subSection = potentialSubSection && potentialSubSection.includes('-')
    ? potentialSubSection
    : null;
  
  return { section, subSection };
}

/**
 * Gets the latest quarter value with data (including explicit zero)
 * Checks quarters in reverse order (Q4 -> Q3 -> Q2 -> Q1)
 * Distinguishes between explicit zero (meaningful data) and undefined/null (no data)
 * @param q1 - Quarter 1 value (number | undefined | null)
 * @param q2 - Quarter 2 value (number | undefined | null)
 * @param q3 - Quarter 3 value (number | undefined | null)
 * @param q4 - Quarter 4 value (number | undefined | null)
 * @returns Latest quarter value with data, or undefined if all quarters are undefined/null
 */
function getLatestQuarterValue(
  q1: number | null | undefined,
  q2: number | null | undefined,
  q3: number | null | undefined,
  q4: number | null | undefined
): number | undefined {
  // Check quarters in reverse order (Q4 -> Q3 -> Q2 -> Q1)
  // Use the first DEFINED value (including explicit zero)
  if (q4 !== undefined && q4 !== null) return q4;
  if (q3 !== undefined && q3 !== null) return q3;
  if (q2 !== undefined && q2 !== null) return q2;
  if (q1 !== undefined && q1 !== null) return q1;
  return undefined; // No data entered for any quarter
}

/**
 * Determines if a Section G activity is a flow item (cumulative sum) or stock item (latest quarter)
 * 
 * Section G cumulative balance calculation:
 * - Accumulated Surplus/Deficit: STOCK - same value for all quarters (use Q1 value)
 * - Prior Year Adjustments (G-01): FLOW - sum of Q1+Q2+Q3+Q4
 * - Surplus/Deficit of Period: FLOW - sum of Q1+Q2+Q3+Q4 (computed as A - B)
 * - G. Closing Balance: Sum of children's cumulative balances
 * 
 * @param code - Activity code
 * @param name - Activity name/label (optional)
 * @returns true if flow item (cumulative sum), false if stock item (same value for all quarters)
 */
function isSectionGFlowItem(code: string, name?: string): boolean {
  const codeLower = code.toLowerCase();
  const nameLower = (name || '').toLowerCase();

  // Special case: "Accumulated" + "Surplus/Deficit" = Stock (same value for all quarters)
  // This is NOT a flow item - it stays the same across all quarters of the fiscal year
  // The cumulative balance should be the Q1 value (which is the same for all quarters)
  if ((nameLower.includes('accumulated') || codeLower.includes('accumulated')) &&
    (nameLower.includes('surplus') || nameLower.includes('deficit'))) {
    return false; // Stock item - use Q1 value (same for all quarters)
  }

  // Prior Year Adjustments (G-01 subcategory) are FLOW items
  // They accumulate across quarters
  if (codeLower.includes('g-01') || codeLower.includes('_g_g-01_')) {
    return true; // Flow item - sum of Q1+Q2+Q3+Q4
  }

  // Surplus/Deficit of the Period is a FLOW item
  // It's computed as A - B and accumulates across quarters
  if (nameLower.includes('surplus') && nameLower.includes('period')) {
    return true; // Flow item - sum of Q1+Q2+Q3+Q4
  }

  // Default: treat as flow item (cumulative sum)
  return true;
}

/**
 * Calculates cumulative balance based on section type
 * Flow sections (A, B, C) use cumulative sum across all quarters (treating undefined as 0)
 * Stock sections (D, E, F) use the latest quarter value with data (preserving undefined vs explicit zero)
 * Section G uses intelligent detection based on activity code/name
 * 
 * Note: F = D - E (Net Financial Assets), so F inherits stock behavior from its components
 * 
 * @param q1 - Quarter 1 value (number | undefined | null)
 * @param q2 - Quarter 2 value (number | undefined | null)
 * @param q3 - Quarter 3 value (number | undefined | null)
 * @param q4 - Quarter 4 value (number | undefined | null)
 * @param section - Main section code (A, B, C, D, E, F, G, etc.)
 * @param subSection - Subsection code
 * @param code - Full activity code for Section G detection
 * @param name - Activity name/label for Section G detection (optional)
 * @returns Calculated cumulative balance (number for flow sections, number | undefined for stock sections)
 */
export function calculateCumulativeBalance(
  q1?: number | null,
  q2?: number | null,
  q3?: number | null,
  q4?: number | null,
  section?: string | null,
  subSection?: string | null,
  code?: string,
  name?: string
): number | undefined {

  // Determine effective section (subSection overrides section)
  const effectiveSection = (subSection || section || '').trim().toUpperCase();

  // Define classification logic
  const flowSections = ['A', 'B', 'C']; // Flow-based: cumulative sum across quarters (income statement items)
  const stockSections = ['D', 'E', 'F']; // Stock-based: report most recent quarter only (balance sheet items)
  // Note: F = D - E, so F inherits stock behavior from its components

  // --- FLOW-BASED SECTIONS ---
  if (flowSections.includes(effectiveSection)) {
    // Treat undefined/null as 0 to allow safe summing
    return (q1 ?? 0) + (q2 ?? 0) + (q3 ?? 0) + (q4 ?? 0);
  }

  // --- STOCK-BASED SECTIONS ---
  if (stockSections.includes(effectiveSection)) {
    // Return latest valid quarter, preserving explicit zeros
    return getLatestQuarterValue(q1, q2, q3, q4);
  }

  // --- SECTION G (Mixed logic) ---
  if (effectiveSection === 'G') {
    const nameLower = (name || '').toLowerCase();
    const codeLower = (code || '').toLowerCase();
    
    // Special case: "Accumulated Surplus/Deficit" - use Q1 value (same for all quarters)
    // This is NOT a flow item and NOT a typical stock item
    // It stays the same across all quarters of the fiscal year
    const isAccumulatedSurplus = 
      (nameLower.includes('accumulated') || codeLower.includes('accumulated')) &&
      (nameLower.includes('surplus') || nameLower.includes('deficit'));
    
    if (isAccumulatedSurplus) {
      // Use Q1 value as cumulative (it's the same for all quarters)
      return q1 ?? 0;
    }
    
    // For other Section G items, use flow/stock detection
    const isFlowItem = isSectionGFlowItem(code || '', name || '');

    if (isFlowItem) {
      return (q1 ?? 0) + (q2 ?? 0) + (q3 ?? 0) + (q4 ?? 0);
    } else {
      return getLatestQuarterValue(q1, q2, q3, q4);
    }
  }

  // --- DEFAULT FALLBACK ---
  // For unclassified sections, default to flow behavior (safer for reporting)
  return (q1 ?? 0) + (q2 ?? 0) + (q3 ?? 0) + (q4 ?? 0);
}

/**
 * Adds cumulative_balance to each activity based on its section type
 * @param activities - Keyed activities object from enrichFormData
 * @returns Activities object with cumulative_balance added to each activity
 */
export function addCumulativeBalances(activities: Record<string, any>): Record<string, any> {
  const enriched: Record<string, any> = {};

  for (const code in activities) {
    const activity = activities[code];
    const { section, subSection } = parseCode(code);

    // Preserve undefined vs explicit zero distinction
    // Only convert to number if value exists, otherwise keep as undefined
    const q1 = activity.q1 !== undefined && activity.q1 !== null ? Number(activity.q1) : undefined;
    const q2 = activity.q2 !== undefined && activity.q2 !== null ? Number(activity.q2) : undefined;
    const q3 = activity.q3 !== undefined && activity.q3 !== null ? Number(activity.q3) : undefined;
    const q4 = activity.q4 !== undefined && activity.q4 !== null ? Number(activity.q4) : undefined;

    // Determine calculation strategy based on section
    // Pass code and name for Section G intelligent detection
    const cumulativeBalance = calculateCumulativeBalance(
      q1,
      q2,
      q3,
      q4,
      section,
      subSection,
      code,
      activity.name || activity.label
    );

    enriched[code] = {
      ...activity,
      cumulative_balance: cumulativeBalance
    };
  }

  return enriched;
}

export function toKeyedActivities(activities: any[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const row of activities || []) {
    const { section, subSection } = parseCode(row.code);
    out[row.code] = { ...row, section, subSection };
  }
  return out;
}

/**
 * Computes rollups (aggregations) by section and subsection
 * CRITICAL: Uses cumulative_balance if available (respects stock/flow logic)
 * Falls back to summing quarters only if cumulative_balance is not set
 * 
 * @param keyed - Activities object with cumulative_balance already calculated
 * @returns Rollups by section and subsection
 */
/**
 * Checks if an activity is the "Surplus/Deficit of the Period" computed item
 * This item should be excluded from G section rollups because it's computed as A - B
 * and added separately in toBalances to avoid double-counting
 */
function isSurplusDeficitOfPeriod(activity: any): boolean {
  const name = (activity.name || activity.label || '').toLowerCase();
  // Match "Surplus/Deficit of the Period" but NOT "Accumulated Surplus/Deficit"
  return name.includes('surplus') && 
         name.includes('deficit') && 
         name.includes('period') && 
         !name.includes('accumulated');
}

export function computeRollups(keyed: Record<string, any>) {
  const bySection: Record<string, any> = {};
  const bySubSection: Record<string, any> = {};

  console.log('[computeRollups] DEBUG: Starting rollup calculation');
  console.log('[computeRollups] DEBUG: Processing', Object.keys(keyed).length, 'activities');

  for (const k in keyed) {
    const a = keyed[k];
    console.log(`[computeRollups] DEBUG: Activity ${k} -> section: ${a.section}, subSection: ${a.subSection}`);
    
    // CRITICAL: Skip "Surplus/Deficit of the Period" from G section rollups
    // This item is computed as A - B and added separately in toBalances
    // Including it here would cause double-counting
    if (a.section === 'G' && isSurplusDeficitOfPeriod(a)) {
      console.log(`[computeRollups] DEBUG: Skipping "Surplus/Deficit of the Period" from G rollup to avoid double-counting`);
      continue;
    }
    
    const q1 = Number(a.q1 || 0), q2 = Number(a.q2 || 0),
      q3 = Number(a.q3 || 0), q4 = Number(a.q4 || 0);

    // CRITICAL FIX: Use cumulative_balance if available (respects stock/flow logic)
    // For stock sections (D, E, F), cumulative_balance = latest quarter
    // For flow sections (A, B, C), cumulative_balance = sum of quarters
    // This ensures rollups respect the section-specific calculation logic
    const total = a.cumulative_balance !== undefined && a.cumulative_balance !== null
      ? Number(a.cumulative_balance)
      : q1 + q2 + q3 + q4; // Fallback to sum if cumulative_balance not set

    if (a.section) {
      bySection[a.section] ||= { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
      bySection[a.section].q1 += q1;
      bySection[a.section].q2 += q2;
      bySection[a.section].q3 += q3;
      bySection[a.section].q4 += q4;
      bySection[a.section].total += total; // Uses cumulative_balance
    }

    if (a.subSection) {
      bySubSection[a.subSection] ||= { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
      bySubSection[a.subSection].q1 += q1;
      bySubSection[a.subSection].q2 += q2;
      bySubSection[a.subSection].q3 += q3;
      bySubSection[a.subSection].q4 += q4;
      bySubSection[a.subSection].total += total; // Uses cumulative_balance
    }
  }

  console.log('[computeRollups] DEBUG: Final bySection keys:', Object.keys(bySection));
  console.log('[computeRollups] DEBUG: Final bySection:', JSON.stringify(bySection, null, 2));
  console.log('[computeRollups] DEBUG: Final bySubSection keys:', Object.keys(bySubSection));

  return { bySection, bySubSection };
}

export function toBalances(rollups: { bySection: any; bySubSection: any }) {
  // DEBUG: Log rollups structure
  console.log('[toBalances] DEBUG: Starting balance calculation');
  console.log('[toBalances] DEBUG: rollups.bySection keys:', Object.keys(rollups.bySection || {}));
  console.log('[toBalances] DEBUG: rollups.bySection:', JSON.stringify(rollups.bySection, null, 2));
  
  // CRITICAL FIX: Use bySection for main sections (A, B, D, E, G), not bySubSection
  // bySubSection only contains B-01, B-02, etc., not the main sections
  const getSec = (s: string) => {
    const sec = rollups.bySection[s] || { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
    console.log(`[toBalances] DEBUG: Section ${s}:`, JSON.stringify(sec));
    return sec;
  };
  
  const A = getSec('A'); // Receipts
  const B = getSec('B'); // Expenditures
  const D = getSec('D'); // Financial Assets
  const E = getSec('E'); // Financial Liabilities
  const G = getSec('G'); // Closing Balance components (Accumulated + Prior + Surplus of Period)

  const receipts = { q1: A.q1, q2: A.q2, q3: A.q3, q4: A.q4, cumulativeBalance: A.total };
  const expenditures = { q1: B.q1, q2: B.q2, q3: B.q3, q4: B.q4, cumulativeBalance: B.total };
  // CRITICAL FIX: Use A.total and B.total which respect flow logic from rollups
  // This ensures consistency with how cumulative_balance is calculated for activities
  const surplus = {
    q1: A.q1 - B.q1, q2: A.q2 - B.q2, q3: A.q3 - B.q3, q4: A.q4 - B.q4,
    cumulativeBalance: A.total - B.total, // Use rollup totals instead of manual sum
  };

  // CRITICAL FIX: For stock sections (D, E, F), cumulative = latest quarter's section total
  // NOT the sum of individual activities' cumulative balances
  // This matches the client-side calculation
  function getLatestQuarterTotal(sec: { q1: number; q2: number; q3: number; q4: number }): number {
    // Check quarters in reverse order (Q4 -> Q3 -> Q2 -> Q1)
    // Use the latest quarter that has data
    if (sec.q4 !== 0) return sec.q4;
    if (sec.q3 !== 0) return sec.q3;
    if (sec.q2 !== 0) return sec.q2;
    return sec.q1;
  }

  const financialAssets = { 
    q1: D.q1, q2: D.q2, q3: D.q3, q4: D.q4, 
    cumulativeBalance: getLatestQuarterTotal(D) 
  };
  const financialLiabilities = { 
    q1: E.q1, q2: E.q2, q3: E.q3, q4: E.q4, 
    cumulativeBalance: getLatestQuarterTotal(E) 
  };
  
  // F = D - E for each quarter
  const fQ1 = D.q1 - E.q1;
  const fQ2 = D.q2 - E.q2;
  const fQ3 = D.q3 - E.q3;
  const fQ4 = D.q4 - E.q4;
  
  // F cumulative = latest quarter's F value (stock section behavior)
  // Check in reverse order (Q4 -> Q3 -> Q2 -> Q1) for the latest reported quarter
  let fCumulative: number;
  if (fQ4 !== 0 || (D.q4 !== 0 || E.q4 !== 0)) {
    fCumulative = fQ4;
  } else if (fQ3 !== 0 || (D.q3 !== 0 || E.q3 !== 0)) {
    fCumulative = fQ3;
  } else if (fQ2 !== 0 || (D.q2 !== 0 || E.q2 !== 0)) {
    fCumulative = fQ2;
  } else {
    fCumulative = fQ1;
  }
  
  const netFinancialAssets = {
    q1: fQ1, q2: fQ2, q3: fQ3, q4: fQ4,
    cumulativeBalance: fCumulative,
  };

  // Closing balance G = (Accumulated + Prior) + Surplus/Deficit of the Period
  // G.total = sum of G activities' cumulative balances:
  //   - Accumulated Surplus/Deficit: Q1 value (same for all quarters)
  //   - Prior Year Adjustments: Q1+Q2+Q3+Q4 (flow)
  // surplus.cumulativeBalance = A.total - B.total (Surplus/Deficit of Period)
  // closingBalance.cumulativeBalance = G.total + surplus.cumulativeBalance
  
  // DEBUG: Log G section details
  console.log('[toBalances] DEBUG: Section G breakdown:', {
    G_q1: G.q1,
    G_q2: G.q2,
    G_q3: G.q3,
    G_q4: G.q4,
    G_total: G.total,
    surplus_q1: surplus.q1,
    surplus_q2: surplus.q2,
    surplus_q3: surplus.q3,
    surplus_q4: surplus.q4,
    surplus_cumulative: surplus.cumulativeBalance,
    A_total: A.total,
    B_total: B.total
  });
  
  // Calculate G quarterly totals (G activities + Surplus/Deficit of Period)
  const gQ1 = (G.q1 || 0) + surplus.q1;
  const gQ2 = (G.q2 || 0) + surplus.q2;
  const gQ3 = (G.q3 || 0) + surplus.q3;
  const gQ4 = (G.q4 || 0) + surplus.q4;
  
  // G cumulative = sum of children's cumulative balances
  // This matches the client-side calculation
  const gCumulative = (G.total || 0) + surplus.cumulativeBalance;
  
  const closingBalance = {
    q1: gQ1,
    q2: gQ2,
    q3: gQ3,
    q4: gQ4,
    cumulativeBalance: gCumulative,
  };
  
  console.log('[toBalances] DEBUG: Final G calculation:', {
    G_total: G.total,
    surplus_cumulative: surplus.cumulativeBalance,
    G_cumulative: gCumulative,
    F_cumulative: fCumulative,
    difference: Math.abs(fCumulative - gCumulative)
  });

  // CRITICAL: Always calculate isBalanced - validation should ALWAYS run
  // Even if sections have no data (default to zeros), we can still validate F = G
  // This ensures health centers and hospitals are validated equally
  const isBalanced = Math.abs(netFinancialAssets.cumulativeBalance - closingBalance.cumulativeBalance) < 0.01;

  // Check which sections have data (not all zeros)
  const hasDataInSection = (sec: any) => {
    return sec.q1 !== 0 || sec.q2 !== 0 || sec.q3 !== 0 || sec.q4 !== 0 || sec.total !== 0;
  };

  const sectionsAvailable = {
    A: Object.keys(rollups.bySection).includes('A') && hasDataInSection(A),
    B: Object.keys(rollups.bySection).includes('B') && hasDataInSection(B),
    D: Object.keys(rollups.bySection).includes('D') && hasDataInSection(D),
    E: Object.keys(rollups.bySection).includes('E') && hasDataInSection(E),
    G: Object.keys(rollups.bySection).includes('G') && hasDataInSection(G),
  };

  // Can validate balance if we have the required sections (D, E, G) or if they exist in rollups
  // Even if sections are all zeros, we can still validate (0 = 0 is valid)
  const canValidateBalance = 
    Object.keys(rollups.bySection).includes('D') || 
    Object.keys(rollups.bySection).includes('E') || 
    Object.keys(rollups.bySection).includes('G');

  // DEBUG: Log calculated balances
  console.log('[toBalances] DEBUG: Calculated balances:', {
    F_cumulative: netFinancialAssets.cumulativeBalance,
    G_cumulative: closingBalance.cumulativeBalance,
    F_quarterly: {
      q1: netFinancialAssets.q1,
      q2: netFinancialAssets.q2,
      q3: netFinancialAssets.q3,
      q4: netFinancialAssets.q4
    },
    G_quarterly: {
      q1: closingBalance.q1,
      q2: closingBalance.q2,
      q3: closingBalance.q3,
      q4: closingBalance.q4
    },
    surplus_cumulative: surplus.cumulativeBalance,
    D_total: D.total,
    E_total: E.total,
    G_total: G.total,
    A_total: A.total,
    B_total: B.total,
    calculation_breakdown: {
      F: `${D.total} - ${E.total} = ${netFinancialAssets.cumulativeBalance}`,
      G: `${G.total} + ${surplus.cumulativeBalance} = ${closingBalance.cumulativeBalance}`,
      surplus: `${A.total} - ${B.total} = ${surplus.cumulativeBalance}`
    },
    isBalanced,
    difference: Math.abs(netFinancialAssets.cumulativeBalance - closingBalance.cumulativeBalance),
    canValidateBalance,
    sectionsAvailable
  });

  // Verify F and G are calculated from actual data (not default zeros)
  console.log('[toBalances] DEBUG: Data verification:', {
    F_from_actual_data: D.total !== 0 || E.total !== 0,
    G_from_actual_data: G.total !== 0 || surplus.cumulativeBalance !== 0,
    D_has_data: hasDataInSection(D),
    E_has_data: hasDataInSection(E),
    G_has_data: hasDataInSection(G),
    A_has_data: hasDataInSection(A),
    B_has_data: hasDataInSection(B)
  });

  return {
    receipts,
    expenditures,
    surplus,
    financialAssets,
    financialLiabilities,
    netFinancialAssets,
    closingBalance,
    isBalanced,
    validationErrors: [],
    metadata: {
      canValidateBalance,
      sectionsAvailable,
      sectionsInRollups: Object.keys(rollups.bySection)
    }
  };
}

// export function enrichFormData(formData: any, context: { projectType: string; facilityType: string; year?: number; quarter?: string; }) {
//     const incoming = Array.isArray(formData?.activities) ? formData.activities : [];
//     const activities = toKeyedActivities(incoming);

//     // Add cumulative balances to activities
//     const activitiesWithBalances = addCumulativeBalances(activities);

//     // Compute rollups with enriched activities that include cumulative_balance
//     const rollups = computeRollups(activitiesWithBalances);

//     return {
//       version: '1.0',
//       context,
//       activities: activitiesWithBalances, // Return enriched activities with cumulative_balance
//       rollups,
//     };
//   }

export function enrichFormData(formData: any, context: { projectType: string; facilityType: string; year?: number; quarter?: string; }) {
  // Handle both array and object formats for activities
  let incoming: any[] = [];
  if (Array.isArray(formData?.activities)) {
    incoming = formData.activities;
  } else if (formData?.activities && typeof formData.activities === 'object') {
    // If activities is already a keyed object, convert to array
    incoming = Object.values(formData.activities);
  }

  const activities = toKeyedActivities(incoming);

  // Add cumulative balances to activities
  const activitiesWithBalances = addCumulativeBalances(activities);

  // Compute rollups with enriched activities that include cumulative_balance
  const rollups = computeRollups(activitiesWithBalances);

  return {
    version: '1.0',
    context,
    activities: activitiesWithBalances, // Return enriched activities with cumulative_balance
    rollups,
  };
}