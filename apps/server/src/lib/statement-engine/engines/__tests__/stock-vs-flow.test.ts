/**
 * Stock vs Flow Section Test
 * 
 * Verifies that the data aggregation engine correctly handles:
 * - Stock sections (D, E): Use cumulative_balance (latest quarter)
 * - Flow sections (A, B, G): Sum all quarters
 */

import { describe, it, expect } from 'vitest';

// Mock activity data structure
interface MockActivity {
  code: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  cumulative_balance: number;
}

/**
 * Extract section from activity code (same logic as in data-aggregation-engine.ts)
 */
function extractSectionFromCode(code: string): string | null {
  if (!code) return null;
  
  const parts = code.split('_');
  const execIndex = parts.findIndex(p => p === 'EXEC');
  
  if (execIndex === -1) return null;
  
  for (let i = execIndex + 1; i < parts.length; i++) {
    if (parts[i].length === 1 && /[A-GX]/.test(parts[i])) {
      return parts[i];
    }
  }
  
  return null;
}

/**
 * Calculate amount based on section type (same logic as in data-aggregation-engine.ts)
 */
function calculateAmount(activity: MockActivity): number {
  const section = extractSectionFromCode(activity.code);
  
  if (section === 'D' || section === 'E') {
    // Stock sections: Use cumulative_balance
    return Number(activity.cumulative_balance) || 0;
  } else {
    // Flow sections: Sum all quarters
    return (Number(activity.q1) || 0) + (Number(activity.q2) || 0) + 
           (Number(activity.q3) || 0) + (Number(activity.q4) || 0);
  }
}

describe('Stock vs Flow Section Logic', () => {
  describe('Section Extraction', () => {
    it('should extract section D from HIV hospital code', () => {
      const section = extractSectionFromCode('HIV_EXEC_HOSPITAL_D_1');
      expect(section).toBe('D');
    });

    it('should extract section E from Malaria health center code', () => {
      const section = extractSectionFromCode('MAL_EXEC_HEALTH_CENTER_E_3');
      expect(section).toBe('E');
    });

    it('should extract section A from TB hospital code', () => {
      const section = extractSectionFromCode('TB_EXEC_HOSPITAL_A_2');
      expect(section).toBe('A');
    });

    it('should return null for invalid code', () => {
      const section = extractSectionFromCode('INVALID_CODE');
      expect(section).toBeNull();
    });
  });

  describe('Stock Sections (D, E) - Balance Sheet', () => {
    it('should use cumulative_balance for section D (Cash at Bank)', () => {
      const activity: MockActivity = {
        code: 'HIV_EXEC_HOSPITAL_D_1',
        q1: 50000,
        q2: 30000,
        q3: 0,
        q4: 0,
        cumulative_balance: 30000 // Latest quarter value
      };

      const amount = calculateAmount(activity);
      expect(amount).toBe(30000); // Should use cumulative_balance, NOT sum (80000)
    });

    it('should use cumulative_balance for section E (Payables)', () => {
      const activity: MockActivity = {
        code: 'MAL_EXEC_HEALTH_CENTER_E_1',
        q1: 10000,
        q2: 20000,
        q3: 15000,
        q4: 0,
        cumulative_balance: 15000 // Latest quarter value
      };

      const amount = calculateAmount(activity);
      expect(amount).toBe(15000); // Should use cumulative_balance, NOT sum (45000)
    });

    it('should handle zero cumulative_balance correctly', () => {
      const activity: MockActivity = {
        code: 'TB_EXEC_HOSPITAL_D_2',
        q1: 100000,
        q2: 50000,
        q3: 0,
        q4: 0,
        cumulative_balance: 0 // All cash was spent
      };

      const amount = calculateAmount(activity);
      expect(amount).toBe(0); // Should use cumulative_balance (0), NOT sum (150000)
    });
  });

  describe('Flow Sections (A, B, G) - Income Statement', () => {
    it('should sum all quarters for section A (Revenue)', () => {
      const activity: MockActivity = {
        code: 'HIV_EXEC_HOSPITAL_A_1',
        q1: 10000,
        q2: 20000,
        q3: 15000,
        q4: 25000,
        cumulative_balance: 25000 // Should NOT use this for flow sections
      };

      const amount = calculateAmount(activity);
      expect(amount).toBe(70000); // Should sum all quarters (10000+20000+15000+25000)
    });

    it('should sum all quarters for section B (Expenses)', () => {
      const activity: MockActivity = {
        code: 'MAL_EXEC_HEALTH_CENTER_B_2',
        q1: 5000,
        q2: 8000,
        q3: 6000,
        q4: 7000,
        cumulative_balance: 7000 // Should NOT use this for flow sections
      };

      const amount = calculateAmount(activity);
      expect(amount).toBe(26000); // Should sum all quarters (5000+8000+6000+7000)
    });

    it('should sum all quarters for section G (Equity)', () => {
      const activity: MockActivity = {
        code: 'TB_EXEC_HOSPITAL_G_1',
        q1: 1000,
        q2: 2000,
        q3: 1500,
        q4: 2500,
        cumulative_balance: 2500 // Should NOT use this for flow sections
      };

      const amount = calculateAmount(activity);
      expect(amount).toBe(7000); // Should sum all quarters (1000+2000+1500+2500)
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing quarterly data', () => {
      const activity: MockActivity = {
        code: 'HIV_EXEC_HOSPITAL_A_1',
        q1: 0,
        q2: 0,
        q3: 0,
        q4: 0,
        cumulative_balance: 0
      };

      const amount = calculateAmount(activity);
      expect(amount).toBe(0);
    });

    it('should handle partial quarterly data for stock sections', () => {
      const activity: MockActivity = {
        code: 'MAL_EXEC_HEALTH_CENTER_D_1',
        q1: 0,
        q2: 50000,
        q3: 0,
        q4: 0,
        cumulative_balance: 50000
      };

      const amount = calculateAmount(activity);
      expect(amount).toBe(50000); // Uses cumulative_balance
    });
  });
});

describe('Real-World Scenario', () => {
  it('should correctly calculate balance sheet values', () => {
    // Scenario: A facility has the following cash flow over 2 quarters
    // Q1: Received 100,000, spent 50,000 → Balance: 50,000
    // Q2: Received 30,000, spent 50,000 → Balance: 30,000
    
    const cashAtBank: MockActivity = {
      code: 'HIV_EXEC_HOSPITAL_D_1',
      q1: 50000,  // Balance after Q1
      q2: 30000,  // Balance after Q2
      q3: 0,
      q4: 0,
      cumulative_balance: 30000 // Current balance
    };

    const revenue: MockActivity = {
      code: 'HIV_EXEC_HOSPITAL_A_1',
      q1: 100000, // Q1 revenue
      q2: 30000,  // Q2 revenue
      q3: 0,
      q4: 0,
      cumulative_balance: 30000 // Not used for flow sections
    };

    const expenses: MockActivity = {
      code: 'HIV_EXEC_HOSPITAL_B_1',
      q1: 50000,  // Q1 expenses
      q2: 50000,  // Q2 expenses
      q3: 0,
      q4: 0,
      cumulative_balance: 50000 // Not used for flow sections
    };

    // Balance Sheet should show current cash position
    expect(calculateAmount(cashAtBank)).toBe(30000);
    
    // Income Statement should show total revenue and expenses
    expect(calculateAmount(revenue)).toBe(130000);
    expect(calculateAmount(expenses)).toBe(100000);
    
    // Surplus = Revenue - Expenses
    const surplus = calculateAmount(revenue) - calculateAmount(expenses);
    expect(surplus).toBe(30000);
  });
});
