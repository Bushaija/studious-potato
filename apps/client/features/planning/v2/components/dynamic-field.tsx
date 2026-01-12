import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calculator } from "lucide-react";

export interface DynamicFieldProps {
    field: {
      key: string;
      type: string;
      readonly: boolean;
      validation?: any;
      computationFormula?: string;
    };
    value: any;
    calculatedValue?: number;
    onChange: (value: any) => void;
    activityId: string;
    isAnnualOnly?: boolean;
  }
  
export const DynamicField: React.FC<DynamicFieldProps> = ({
    field,
    value,
    calculatedValue,
    onChange,
    activityId,
    isAnnualOnly = false
  }) => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount || 0);
    };
  
    // Handle annual-only logic for quarterly fields
    const isQuarterlyField = ['q2_count', 'q3_count', 'q4_count'].includes(field.key);
    const shouldDisable = field.readonly || (isAnnualOnly && isQuarterlyField);
    const displayValue = field.type === 'calculated' ? calculatedValue : value;
  
    if (field.type === 'calculated') {
      return (
        <div className="flex items-center justify-center text-sm font-mono text-gray-700">
          <Calculator className="h-3 w-3 mr-1 text-gray-400" />
          {formatCurrency(calculatedValue || 0)}
        </div>
      );
    }
  
    if (field.type === 'textarea') {
      return (
        <Textarea
          value={displayValue || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Add comment..."
          className="w-full text-xs"
          rows={2}
          disabled={shouldDisable}
        />
      );
    }
  
    if (field.type === 'currency' || field.type === 'number') {
      return (
        <Input
          type="number"
          value={displayValue || ''}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full text-center text-sm"
          min={field.validation?.min || 0}
          step={field.validation?.step || (field.type === 'currency' ? 0.01 : 1)}
          disabled={shouldDisable}
          title={shouldDisable && isAnnualOnly ? 'This activity is annual-only (Q1 only)' : ''}
        />
      );
    }
  
    return (
      <Input
        type="text"
        value={displayValue || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-center text-sm"
        disabled={shouldDisable}
      />
    );
  };