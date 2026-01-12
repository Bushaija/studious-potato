/**
 * Creates a new object by omitting specified keys from an existing object.
 *
 * @param obj The original object.
 * @param keys The keys to omit from the new object.
 * @returns A new object that contains all properties from the original object, except for the omitted ones.
 */
export const omit = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const newObj = { ...obj };
  for (const key of keys) {
    delete newObj[key];
  }
  return newObj;
}; 

/**
 * Determines the current fiscal quarter based on the current date.
 * Fiscal Year Calendar:
 * Q1 = July – September
 * Q2 = October – December  
 * Q3 = January – March
 * Q4 = April – June
 * 
 * @param date Optional date to check (defaults to current date)
 * @returns The fiscal quarter as "Q1", "Q2", "Q3", or "Q4"
 */
export const getCurrentFiscalQuarter = (date: Date = new Date()): string => {
  const month = date.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
  
  if (month >= 7 && month <= 9) {
    return "Q1"; // July - September
  } else if (month >= 10 && month <= 12) {
    return "Q2"; // October - December
  } else if (month >= 1 && month <= 3) {
    return "Q3"; // January - March
  } else {
    return "Q4"; // April - June (month 4-6)
  }
};

/**
 * Gets the fiscal year for a given date.
 * Fiscal year starts in July, so:
 * - July 2024 - June 2025 = FY 2025
 * 
 * @param date Optional date to check (defaults to current date)
 * @returns The fiscal year as a number
 */
export const getCurrentFiscalYear = (date: Date = new Date()): number => {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  // If we're in July-December, fiscal year is next calendar year
  // If we're in January-June, fiscal year is current calendar year
  return month >= 7 ? year + 1 : year;
};




