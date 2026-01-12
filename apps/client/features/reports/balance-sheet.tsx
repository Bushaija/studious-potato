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

export function BalanceSheetStatement({ initialData, currentPeriodLabel, previousPeriodLabel }: StatementProps) {
  if (!initialData) return null;

    const shouldIndent = (description: string, isTotal: boolean, isSubtotal: boolean) => {
    // Don't indent if it's a total or subtotal
    if (isTotal || isSubtotal) return false;

    // Don't indent if description starts with a number followed by a period or space
    if (/^\d+[\.\s]/.test(description)) return false;

    // Indent all other items
    return true;
  };

  const renderRow = (row: Row, idx: number) => {
    const isHeader = row.isSubtotal;
    const isTotal = row.isTotal;
    const rowClass = `${isHeader ? 'font-semibold' : ''} ${isTotal ? 'font-bold border-t-2' : ''}`;
    const isIndented = shouldIndent(row.description, row.isTotal, row.isSubtotal);

    return (
      <tr key={idx} className={rowClass}>
        <td className={`py-2 whitespace-nowrap text-sm text-gray-700 ${isIndented ? 'pl-12' : 'px-6'}`}>{row.description}</td>
        <td className="px-6 py-2 text-center text-sm text-gray-700">{row.note ?? ''}</td>
        <td className="px-6 py-2 text-right text-sm text-gray-900">{row.current !== null ? formatCurrency(row.current) : ''}</td>
        <td className="px-6 py-2 text-right text-sm text-gray-900">{row.previous !== null ? formatCurrency(row.previous) : ''}</td>
      </tr>
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{currentPeriodLabel}</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{previousPeriodLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {initialData.map(renderRow)}
        </tbody>
      </table>
    </div>
  );
} 