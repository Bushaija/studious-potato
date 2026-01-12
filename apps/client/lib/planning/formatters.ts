export function formatCurrency(amount: number, options?: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    suffix?: string; // e.g., ' RWF'
  }): string {
    const {
      locale = 'en-RW',
      minimumFractionDigits = 0,
      maximumFractionDigits = 0,
      suffix = ' RWF'
    } = options || {};

    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits
    }).format(amount || 0);

    return `${formatted}${suffix}`;
  }
  
  export function formatNumber(value: number, options?: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }): string {
    const {
      locale = 'en-US',
      minimumFractionDigits = 0,
      maximumFractionDigits = 2
    } = options || {};
  
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits
    }).format(value || 0);
  };

  export function parseNumericInput(input: string | number): number {
    if (typeof input === 'number') {
      return Number.isFinite(input) ? Math.max(0, input) : 0;
    }
    
    if (typeof input === 'string') {
      // Remove common formatting characters
      const cleaned = input.replace(/[,$\s%]/g, '');
      const parsed = parseFloat(cleaned);
      return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    }
    
    return 0;
  };