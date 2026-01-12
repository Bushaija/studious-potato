'use client';

import React, { useEffect } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ReadOnlyField } from '@/components/share/readonly-field';
import { Activity } from '@/features/planning/schema/hiv/plan-form-schema';
import { formatCurrency } from '@/features/planning/utils';
import { UseFormReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface PlanActivityRowProps {
  activity: Activity;
  index: number;
  form: UseFormReturn<any>;
  isSubCategory: boolean;
  isReadOnly?: boolean;
}

// Helper function to identify bonus activities
const isBonusActivity = (activity: Activity): boolean => {
  const bonusIdentifiers = [
    'Bonus (All staff paid on GF)',
    'All Staff Bonus',
    'bonus', // case-insensitive fallback
  ];
  
  return bonusIdentifiers.some(identifier => 
    activity.typeOfActivity?.toLowerCase().includes(identifier.toLowerCase())
  );
};

export function PlanActivityRow({ activity, index, form, isSubCategory, isReadOnly = false }: PlanActivityRowProps) {
  const { watch, setValue, register, formState: { errors } } = form;
  
  const shouldBeReadOnly = isReadOnly || index === -1;
  const isBonus = isBonusActivity(activity);
  
  // Prefer form values when available (even in read-only) to show loaded data, fallback to activity defaults
  const frequency = (index >= 0 ? watch(`activities.${index}.frequency`) : undefined) ?? activity.frequency;
  const unitCost = (index >= 0 ? watch(`activities.${index}.unitCost`) : undefined) ?? activity.unitCost;
  const countQ1 = (index >= 0 ? watch(`activities.${index}.countQ1`) : undefined) ?? activity.countQ1;
  const countQ2 = (index >= 0 ? watch(`activities.${index}.countQ2`) : undefined) ?? activity.countQ2;
  const countQ3 = (index >= 0 ? watch(`activities.${index}.countQ3`) : undefined) ?? activity.countQ3;
  const countQ4 = (index >= 0 ? watch(`activities.${index}.countQ4`) : undefined) ?? activity.countQ4;
  const comment = (index >= 0 ? watch(`activities.${index}.comment`) : undefined) ?? activity.comment;
  
  // Update calculated fields when inputs change
  useEffect(() => {
    if (shouldBeReadOnly) return;
    
    const freq = Number(frequency) || 0;
    const cost = Number(unitCost) || 0;
    const c1 = Number(countQ1) || 0;
    const c2 = Number(countQ2) || 0;
    const c3 = Number(countQ3) || 0;
    const c4 = Number(countQ4) || 0;

    const amountQ1 = freq * cost * c1;
    const amountQ2 = freq * cost * c2;
    const amountQ3 = freq * cost * c3;
    const amountQ4 = freq * cost * c4;
    
    setValue(`activities.${index}.amountQ1`, amountQ1, { shouldValidate: true });
    setValue(`activities.${index}.amountQ2`, amountQ2, { shouldValidate: true });
    setValue(`activities.${index}.amountQ3`, amountQ3, { shouldValidate: true });
    setValue(`activities.${index}.amountQ4`, amountQ4, { shouldValidate: true });
    
    const totalBudget = amountQ1 + amountQ2 + amountQ3 + amountQ4;
    setValue(`activities.${index}.totalBudget`, totalBudget, { shouldValidate: true });
  }, [frequency, unitCost, countQ1, countQ2, countQ3, countQ4, setValue, index, shouldBeReadOnly]);

  // Clear Q2, Q3, Q4 values for bonus activities when user attempts to edit them
  useEffect(() => {
    if (isBonus && !shouldBeReadOnly && isSubCategory) {
      // Only clear if there are values to prevent infinite loops
      const c2 = Number(countQ2) || 0;
      const c3 = Number(countQ3) || 0;
      const c4 = Number(countQ4) || 0;
      
      if (c2 !== 0) {
        setValue(`activities.${index}.countQ2`, 0, { shouldValidate: true });
      }
      if (c3 !== 0) {
        setValue(`activities.${index}.countQ3`, 0, { shouldValidate: true });
      }
      if (c4 !== 0) {
        setValue(`activities.${index}.countQ4`, 0, { shouldValidate: true });
      }
    }
  }, [isBonus, shouldBeReadOnly, isSubCategory, setValue, index, countQ2, countQ3, countQ4]);

  const _freq = Number(frequency) || 0;
  const _cost = Number(unitCost) || 0;
  const _c1 = Number(countQ1) || 0;
  const _c2 = Number(countQ2) || 0;
  const _c3 = Number(countQ3) || 0;
  const _c4 = Number(countQ4) || 0;
  const amountQ1 = _freq * _cost * _c1;
  const amountQ2 = _freq * _cost * _c2;
  const amountQ3 = _freq * _cost * _c3;
  const amountQ4 = _freq * _cost * _c4;
  const totalBudget = amountQ1 + amountQ2 + amountQ3 + amountQ4;

  // Helper function to render field (Input or ReadOnlyField)
  const renderField = (fieldName: string, value: any, options: {
    placeholder?: string;
    isDisabled?: boolean;
    isRequired?: boolean;
    textAlign?: 'left' | 'center' | 'right';
  } = {}) => {
    const { placeholder = "0", isDisabled = false, isRequired = false, textAlign = 'right' } = options;
    
    if (shouldBeReadOnly) {
      return (
        <ReadOnlyField
          value={value}
          placeholder={placeholder}
          textAlign={textAlign}
          isRequired={isRequired}
          className="h-8 w-32"
        />
      );
    }

    return (
      <Input
        type="text"
        inputMode="decimal"
        pattern="-?[0-9]*\.?[0-9]*"
        placeholder={placeholder}
        className={cn(
          "h-8 w-32 text-right",
          isDisabled && "bg-gray-100 text-gray-400 cursor-not-allowed",
          (errors as any)?.activities?.[index]?.[fieldName] && "border-red-500"
        )}
        readOnly={isDisabled}
        title={isDisabled && isBonus ? "Bonus is only paid in Q1" : ""}
        {...register(`activities.${index}.${fieldName}`, { valueAsNumber: fieldName !== 'comment' })}
      />
    );
  };

  // Helper function to render comment field
  const renderCommentField = () => {
    if (shouldBeReadOnly) {
      return (
        <ReadOnlyField
          value={comment}
          placeholder="No comment"
          textAlign="left"
          className="w-full h-8"
        />
      );
    }

    return (
      <Input
        type="text"
        placeholder="Add comment..."
        className="w-full"
        {...register(`activities.${index}.comment`)}
      />
    );
  };

  return (
    <TableRow className={isSubCategory ? "bg-muted/20" : "bg-muted/50 font-semibold"}>
      <TableCell 
        className="w-[200px] sticky left-0 z-10" 
        style={{ backgroundColor: isSubCategory ? 'rgba(240, 240, 243, 0.2)' : 'rgba(240, 240, 243, 0.5)' }}
      >
        {!isSubCategory && activity.activityCategory}
      </TableCell>
      <TableCell className="w-[250px]">
        {isSubCategory && (
          <div className="space-y-1">
            <div className="font-medium flex items-center gap-2">
              {activity.typeOfActivity}
              {isBonus && (
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                  Q1 Only
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500" dangerouslySetInnerHTML={{ __html: activity.activity || '' }}></div>
            {isBonus && (
              <div className="text-xs text-amber-600 font-medium">
                Bonus is paid once per fiscal year (Q1 only)
              </div>
            )}
          </div>
        )}
      </TableCell>
      <TableCell className="w-[90px]">
        {isSubCategory ? (
          <div className="relative">
            {renderField('frequency', frequency, { isRequired: true })}
            {!shouldBeReadOnly && (
              <span className="absolute -top-1 -right-1 text-red-500 text-xs">*</span>
            )}
          </div>
        ) : "-"}
      </TableCell>
      <TableCell className="w-[90px]">
        {isSubCategory ? renderField('unitCost', unitCost) : "-"}
      </TableCell>
      <TableCell className="w-[90px]">
        {isSubCategory ? renderField('countQ1', countQ1) : "-"}
      </TableCell>
      <TableCell className="w-[90px]">
        {isSubCategory ? renderField('countQ2', countQ2, { isDisabled: isBonus }) : "-"}
      </TableCell>
      <TableCell className="w-[90px]">
        {isSubCategory ? renderField('countQ3', countQ3, { isDisabled: isBonus }) : "-"}
      </TableCell>
      <TableCell className="w-[90px]">
        {isSubCategory ? renderField('countQ4', countQ4, { isDisabled: isBonus }) : "-"}
      </TableCell>
      <TableCell className="w-[90px] text-center">{amountQ1}</TableCell>
      <TableCell className="w-[90px] text-center">{amountQ2}</TableCell>
      <TableCell className="w-[90px] text-center">{amountQ3}</TableCell>
      <TableCell className="w-[90px] text-center">{amountQ4}</TableCell>
      <TableCell className="w-[120px] font-semibold text-center">{formatCurrency(totalBudget)}</TableCell>
      <TableCell className="w-[180px] text-center">
        {isSubCategory && renderCommentField()}
      </TableCell>
    </TableRow>
  );
}

// Different defaults based on field type
export const getSmartDefault = (fieldType: string, activityType: string) => {
  switch (fieldType) {
    case 'frequency':
      return activityType.includes('annual') ? 1 : 
             activityType.includes('monthly') ? 12 : 
             activityType.includes('weekly') ? 52 : undefined;
    case 'unitCost':
      return undefined; // Always let user enter
    case 'count':
      return undefined; // Let user decide
    default:
      return undefined;
  }
}; 