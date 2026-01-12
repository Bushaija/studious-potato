import React from 'react';
import { cn } from '@/lib/utils';

interface ReadOnlyFieldProps {
  value?: string | number;
  placeholder?: string;
  className?: string;
  textAlign?: 'left' | 'center' | 'right';
  isCurrency?: boolean;
  isRequired?: boolean;
  suffix?: string;
}

export function ReadOnlyField({ 
  value, 
  placeholder = "—", 
  className,
  textAlign = 'left',
  isCurrency = false,
  isRequired = false,
  suffix
}: ReadOnlyFieldProps) {
  const displayValue = React.useMemo(() => {
    if (value === undefined || value === null || value === '') {
      return placeholder;
    }
    
    const stringValue = value.toString();
    
    if (isCurrency) {
      const numValue = Number(stringValue);
      if (isNaN(numValue)) return placeholder;
      return new Intl.NumberFormat('en-US', { 
        maximumFractionDigits: 0 
      }).format(numValue);
    }
    
    return stringValue;
  }, [value, placeholder, isCurrency]);

  const finalDisplayValue = suffix ? `${displayValue}${suffix}` : displayValue;

  return (
    <div className={cn(
      "min-h-8 px-3 py-2 text-sm",
      "bg-slate-50 border border-slate-200 rounded-md",
      "text-slate-700",
      textAlign === 'center' && "text-center",
      textAlign === 'right' && "text-right",
      textAlign === 'left' && "text-left",
      className
    )}>
      <span className="select-text">{finalDisplayValue}</span>
      {isRequired && value === placeholder && (
        <span className="ml-1 text-red-500 text-xs">*</span>
      )}
    </div>
  );
} 