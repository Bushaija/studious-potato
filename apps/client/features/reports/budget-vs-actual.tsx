"use client";

import React from 'react';
import { formatCurrency } from '@/features/planning/utils';

type Row = {
  description: string;
  note: number | null;
  current: number | null;  // actual amounts
  previous: number | null; // budget amounts
  variance: number | null;
  performancePercentage: number | null;
  isTotal: boolean;
  isSubtotal: boolean;
};

type StatementProps = {
  initialData: Row[];
};

const formatAmount = (amount: number | null) => amount !== null ? formatCurrency(amount) : '-';
const formatPercent = (percent: number) => `${percent.toFixed(2)}%`;

export function BudgetVsActualStatement({ initialData }: StatementProps) {
  if (!initialData) return null;

  const shouldIndent = (description: string, isTotal: boolean, isSubtotal: boolean) => {
    // Don't indent if it's a total or subtotal
    if (isTotal || isSubtotal) return false;

    // Don't indent if description starts with a number followed by a period or space
    if (/^\d+[\.+]/.test(description)) return false;

    // Indent all other items
    return true;
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full bg-white text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-[30%]">Description</th>
            <th scope="col" className="px-4 py-3 text-center font-medium text-gray-500 uppercase tracking-wider">Note</th>
            <th scope="col" className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Revised Budget (A)</th>
            <th scope="col" className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Actual (B)</th>
            <th scope="col" className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Variance (A - B)</th>
            <th scope="col" className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Performance %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {initialData.map((row, idx) => {
            const rowClass = `${row.isSubtotal ? 'font-semibold bg-gray-50' : ''} ${row.isTotal ? 'font-bold border-t-2 bg-gray-100' : ''}`;
            const isIndented = shouldIndent(row.description, row.isTotal, row.isSubtotal);
            
            return (
              <tr key={idx} className={rowClass}>
                <td className={`py-2 whitespace-nowrap text-sm text-gray-700 ${isIndented ? 'pl-12' : 'px-6'}`}>{row.description}</td>
                <td className="px-4 py-2 text-center text-sm text-gray-700">{row.note ?? ''}</td>
                <td className="px-4 py-2 text-right text-sm text-gray-900">{formatAmount(row.previous)}</td>
                <td className="px-4 py-2 text-right text-sm text-gray-900">{formatAmount(row.current)}</td>
                <td className="px-4 py-2 text-right text-sm text-gray-900">{formatAmount(row.variance)}</td>
                <td className="px-4 py-2 text-right text-sm text-gray-900">
                  {row.performancePercentage !== null ? formatPercent(row.performancePercentage) : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
} 