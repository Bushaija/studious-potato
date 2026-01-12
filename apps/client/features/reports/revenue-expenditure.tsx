"use client";

import React from 'react';
import { formatCurrency } from '@/features/planning/utils';

type Row = {
  description: string;
  note: number | null;
  current: number | null;
  previous: number | null;
  isTotal: boolean;
  isSubtotal: boolean;
};

type StatementProps = {
  initialData: Row[];
  currentPeriodLabel: string;
  previousPeriodLabel: string;
};

export function RevenueExpenditureStatement({ initialData, currentPeriodLabel, previousPeriodLabel }: StatementProps) {
  if (!initialData) return null;

  // Helper function to determine if a line should be indented
  const shouldIndent = (description: string, isTotal: boolean, isSubtotal: boolean) => {
    // Don't indent if it's a total or subtotal
    if (isTotal || isSubtotal) return false;

    // Don't indent if description starts with a number followed by a period or space
    if (/^\d+[\.\s]/.test(description)) return false;

    // Indent all other items
    return true;
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="bg-white">
        <thead className="bg-[#e9e9e9]">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-2 w-[360px]">Description</th>
            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-2 w-[80px]">Note</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider border-2 w-[380px]">{currentPeriodLabel}</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider border-2 w-[380px]">{previousPeriodLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {initialData.map((row, idx) => {
            const rowClass = `${row.isSubtotal ? 'font-semibold' : ''} ${row.isTotal ? 'font-bold border-t-2 bg-[#f2f2f2] border-b-2 border-double border-gray-500' : ''}`;
            const isIndented = shouldIndent(row.description, row.isTotal, row.isSubtotal);

            return (
              <tr key={idx} className={rowClass}>
                <td className={`py-2 whitespace-nowrap text-sm text-gray-700 ${isIndented ? 'pl-12' : 'px-6'}`}>
                  {row.description}
                </td>
                <td className="px-6 py-2 text-center text-sm text-gray-700">{row.note ?? ''}</td>
                <td className="px-6 py-2 text-right text-sm text-gray-900">{row.current !== null ? formatCurrency(row.current) : ''}</td>
                <td className="px-6 py-2 text-right text-sm text-gray-900">{row.previous !== null ? formatCurrency(row.previous) : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}