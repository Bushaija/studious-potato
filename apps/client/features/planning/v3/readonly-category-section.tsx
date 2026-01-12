"use client";

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/planning';
import { usePlanningFormContext } from './planning-form-context';

interface ReadonlyCategorySectionProps {
  category: {
    id: number;
    name: string;
    activities: any[];
  };
  isExpanded: boolean;
  onToggle: () => void;
}

export const ReadonlyCategorySection: React.FC<ReadonlyCategorySectionProps> = ({
  category,
  isExpanded,
  onToggle
}) => {
  const { formData, calculations } = usePlanningFormContext();

  // Calculate category totals
  const categoryTotals = React.useMemo(() => {
    if (!category.activities) return {
      q1Amount: 0,
      q2Amount: 0,
      q3Amount: 0,
      q4Amount: 0,
      totalAmount: 0
    };

    return category.activities.reduce((totals, activity) => {
      const activityData = formData[activity.id.toString()];
      if (activityData) {
        const unitCost = activityData.unit_cost || 0;
        const q1Count = activityData.q1_count || 0;
        const q2Count = activityData.q2_count || 0;
        const q3Count = activityData.q3_count || 0;
        const q4Count = activityData.q4_count || 0;
        
        const q1Amount = unitCost * q1Count;
        const q2Amount = unitCost * q2Count;
        const q3Amount = unitCost * q3Count;
        const q4Amount = unitCost * q4Count;
        const totalAmount = q1Amount + q2Amount + q3Amount + q4Amount;
        
        totals.q1Amount += q1Amount;
        totals.q2Amount += q2Amount;
        totals.q3Amount += q3Amount;
        totals.q4Amount += q4Amount;
        totals.totalAmount += totalAmount;
      }
      return totals;
    }, {
      q1Amount: 0,
      q2Amount: 0,
      q3Amount: 0,
      q4Amount: 0,
      totalAmount: 0
    });
  }, [category.activities, formData]);

  return (
    <>
      {/* Category Header Row */}
      <tr className="bg-blue-50 hover:bg-blue-100 cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3 font-semibold text-blue-800 border-r">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span>{category.name}</span>
            <span className="text-xs text-blue-600">
              ({category.activities?.length || 0} activities)
            </span>
          </div>
        </td>
        <td className="px-4 py-3 text-center">-</td>
        <td className="px-4 py-3 text-center">-</td>
        <td className="px-4 py-3 text-center">-</td>
        <td className="px-4 py-3 text-center">-</td>
        <td className="px-4 py-3 text-center">-</td>
        <td className="px-4 py-3 text-center">-</td>
        <td className="px-4 py-3 text-center font-semibold text-blue-600">
          {formatCurrency(categoryTotals.q1Amount)}
        </td>
        <td className="px-4 py-3 text-center font-semibold text-blue-600">
          {formatCurrency(categoryTotals.q2Amount)}
        </td>
        <td className="px-4 py-3 text-center font-semibold text-blue-600">
          {formatCurrency(categoryTotals.q3Amount)}
        </td>
        <td className="px-4 py-3 text-center font-semibold text-blue-600">
          {formatCurrency(categoryTotals.q4Amount)}
        </td>
        <td className="px-4 py-3 text-center font-semibold text-blue-700">
          {formatCurrency(categoryTotals.totalAmount)}
        </td>
        <td className="px-4 py-3 text-center">-</td>
      </tr>

      {/* Activity Rows - only show when expanded */}
      {isExpanded && category.activities?.map((activity) => {
        const activityData = formData[activity.id.toString()] || {};
        const activityCalculations = calculations[activity.id.toString()] || {};
        
        return (
          <tr key={activity.id} className="hover:bg-gray-50 border-l-4 border-l-transparent hover:border-l-blue-200">
            <td className="px-4 py-3 pl-8 text-sm text-gray-700 border-r">
              <div className="flex flex-col">
                <span className="font-medium">{activity.name}</span>
                {activity.activityType && (
                  <span className="text-xs text-gray-500 mt-1">{activity.activityType}</span>
                )}
                {activity.code && (
                  <span className="text-xs text-blue-600 mt-1">Code: {activity.code}</span>
                )}
              </div>
            </td>
            
            {/* Frequency - Read-only display */}
            <td className="px-4 py-3 text-center">
              <span className="text-sm font-medium text-gray-700">
                {activityData.frequency || 0}
              </span>
            </td>
            
            {/* Unit Cost - Read-only display */}
            <td className="px-4 py-3 text-center">
              <span className="text-sm font-medium text-gray-700">
                {formatCurrency(activityData.unit_cost || 0)}
              </span>
            </td>
            
            {/* Quarterly Counts - Read-only display */}
            <td className="px-4 py-3 text-center">
              <span className="text-sm font-medium text-gray-700">
                {activityData.q1_count || 0}
              </span>
            </td>
            <td className="px-4 py-3 text-center">
              <span className="text-sm font-medium text-gray-700">
                {activityData.q2_count || 0}
              </span>
            </td>
            <td className="px-4 py-3 text-center">
              <span className="text-sm font-medium text-gray-700">
                {activityData.q3_count || 0}
              </span>
            </td>
            <td className="px-4 py-3 text-center">
              <span className="text-sm font-medium text-gray-700">
                {activityData.q4_count || 0}
              </span>
            </td>
            
            {/* Calculated Amounts - Read-only display */}
            <td className="px-4 py-3 text-center">
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(activityCalculations.q1Amount || 0)}
              </span>
            </td>
            <td className="px-4 py-3 text-center">
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(activityCalculations.q2Amount || 0)}
              </span>
            </td>
            <td className="px-4 py-3 text-center">
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(activityCalculations.q3Amount || 0)}
              </span>
            </td>
            <td className="px-4 py-3 text-center">
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(activityCalculations.q4Amount || 0)}
              </span>
            </td>
            <td className="px-4 py-3 text-center">
              <span className="text-sm font-bold text-blue-600">
                {formatCurrency(activityCalculations.totalAmount || 0)}
              </span>
            </td>
            
            {/* Comments - Read-only display */}
            <td className="px-4 py-3 text-center">
              <span className="text-sm text-gray-600 max-w-[200px] truncate block">
                {activityData.comments || '-'}
              </span>
            </td>
          </tr>
        );
      })}
    </>
  );
};
