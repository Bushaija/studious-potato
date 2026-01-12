export function normalizeFormData(obj: any): any {
    if (obj == null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(normalizeFormData);
  
    const normalized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'frequency') {
        normalized[key] = normalizeFrequencyValue(value);
      } else if (key === 'unitCost' || key === 'unit_cost') {
        // Always use snake_case for consistency
        normalized['unit_cost'] = normalizeNumericValue(value);
      } else if (/^q([1-4])Count$/i.test(key)) {
        // Convert camelCase q1Count, q2Count, etc. to snake_case
        const match = key.match(/^q([1-4])Count$/i);
        if (match) {
          normalized[`q${match[1]}_count`] = normalizeNumericValue(value);
        }
      } else if (/^q([1-4])_count$/i.test(key)) {
        // Keep snake_case as is
        normalized[key] = normalizeNumericValue(value);
      } else if (typeof value === 'object' && value !== null) {
        normalized[key] = normalizeFormData(value);
      } else {
        normalized[key] = value;
      }
    }
    return normalized;
  };

export function normalizeFrequencyValue(input: unknown): number {
    if (typeof input === 'number' && Number.isFinite(input)) {
      return Math.max(1, Math.trunc(input));
    }
    if (typeof input !== 'string') return 1;
    
    const value = input.toLowerCase().trim();
    const frequencyMap: Record<string, number> = {
      'monthly': 12,
      'quarterly': 4,
      'bi-weekly': 26,
      'biweekly': 26,
      'weekly': 52,
      'annual': 1,
      'yearly': 1,
      'daily': 365
    };
    
    return frequencyMap[value] ?? 1;
  };

export function normalizeNumericValue(input: unknown): number {
    if (typeof input === 'number' && Number.isFinite(input)) {
      return Math.max(0, input);
    }
    if (typeof input === 'string') {
      const parsed = parseFloat(input.replace(/[,$\s]/g, ''));
      return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    }
    return 0;
}
  