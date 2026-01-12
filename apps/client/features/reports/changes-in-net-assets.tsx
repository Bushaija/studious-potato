"use client";

import React from 'react';
import { formatCurrency } from '@/features/planning/utils';

export type NetAssetRow = {
  description: string;
  note: number | null;
  accumulated: number | null;
  adjustments: number | null;
  total: number | null;
  isTotal: boolean;
  isSubtotal: boolean;
};

interface Props {
  initialData: NetAssetRow[];
}

export function ChangesInNetAssetsStatement({ initialData }: Props) {
  if (!initialData) return null;

    const shouldIndent = (description: string, isTotal: boolean, isSubtotal: boolean) => {
    // Don't indent if it's a total or subtotal
    if (isTotal || isSubtotal) return false;

    // Don't indent if description starts with a number followed by a period or space
    if (/^\d+[\.+]/.test(description)) return false;

    // Indent all other items
    return true;
  };

  const formatValue = (value: number | null): string => {
    if (value === null) return '-';
    if (value === 0) return '0';
    return formatCurrency(value);
  };

  const renderRow = (row: NetAssetRow, idx: number) => {
    const rowClass = `${row.isSubtotal ? 'font-semibold' : ''} ${row.isTotal ? 'font-bold border-t-2' : ''}`;
    const isIndented = shouldIndent(row.description, row.isTotal, row.isSubtotal);
    return (
      <tr key={idx} className={rowClass}>
        <td className={`py-2 whitespace-nowrap text-sm text-gray-700 ${isIndented ? 'pl-12' : 'px-6'}`}>{row.description}</td>
        <td className="px-6 py-2 text-center text-sm text-gray-700">{row.note ?? ''}</td>
        <td className="px-6 py-2 text-right text-sm text-gray-900">{formatValue(row.accumulated)}</td>
        <td className="px-6 py-2 text-right text-sm text-gray-900">{formatValue(row.adjustments)}</td>
        <td className="px-6 py-2 text-right text-sm text-gray-900">{formatValue(row.total)}</td>
      </tr>
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">Description</th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Accumulated surplus/loss (Frw)</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Adjustments (Frw)</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total (Frw)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {initialData.map(renderRow)}
        </tbody>
      </table>
    </div>
  );
} 