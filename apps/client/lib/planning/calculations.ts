export interface ActivityCalculation {
    q1Amount: number;
    q2Amount: number;
    q3Amount: number;
    q4Amount: number;
    totalAmount: number;
    annualizedAmount: number;
};

export function calculateActivityAmounts (
    frequency: number,
    unitCost: number,
    q1Count: number,
    q2Count: number,
    q3Count: number,
    q4Count: number,
    isAnnualOnly: boolean,
): ActivityCalculation {
    const counts = isAnnualOnly 
        ? { q1: q1Count, q2: 0, q3: 0, q4: 0, }
        : { q1: q1Count, q2: q2Count, q3: q3Count, q4: q4Count, };

    // const q1Amount = counts.q1 * unitCost * (isAnnualOnly ? frequency : frequency / 4)
    const q1Amount = counts.q1 * unitCost * frequency;
    const q2Amount = counts.q2 * unitCost * frequency;
    const q3Amount = counts.q3 * unitCost * frequency;
    const q4Amount = counts.q4 * unitCost * frequency;

    const totalAmount = q1Amount + q2Amount + q3Amount + q4Amount;
    const annualizedAmount = isAnnualOnly ? q1Amount : totalAmount;

    return {
        q1Amount, q2Amount, q3Amount, q4Amount,
        totalAmount, annualizedAmount
    }
};

export function calculateCategoryTotals(
    activities: any[],
    calculations: Record<string, ActivityCalculation>
  ): ActivityCalculation {
    return activities.reduce(
      (totals, activity) => {
        const calc = calculations[activity.id];
        if (calc) {
          totals.q1Amount += calc.q1Amount;
          totals.q2Amount += calc.q2Amount;
          totals.q3Amount += calc.q3Amount;
          totals.q4Amount += calc.q4Amount;
          totals.totalAmount += calc.totalAmount;
          totals.annualizedAmount += calc.annualizedAmount;
        }
        return totals;
      },
      {
        q1Amount: 0,
        q2Amount: 0,
        q3Amount: 0,
        q4Amount: 0,
        totalAmount: 0,
        annualizedAmount: 0
      }
    );
  }