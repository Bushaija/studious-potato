"use client";

import React from 'react';
import { ReportRowData } from '@/features/reports/data/revenue-expenditure-data';
import { cn } from '@/lib/utils';

type TableRowProps = {
  row: ReportRowData;
  depth?: number;
};

const formatAmount = (amount?: number | null) => {
  if (amount === null || typeof amount === 'undefined') return '';
  return new Intl.NumberFormat('en-US').format(amount);
};

export function TableRow({ row, depth = 0 }: TableRowProps) {
  const isCategory = row.isCategory ?? false;
  const isTotal = row.isTotal ?? false;
  const isSubtotal = row.isSubtotal ?? false;

  const descriptionPadding = { paddingLeft: `${depth * 1.5}rem` };

  return (
    <tr className={cn(isCategory ? 'bg-gray-100' : 'hover:bg-gray-50', (isTotal || isSubtotal) && 'font-bold border-t-2 border-gray-300')}>
      <td style={descriptionPadding} className={cn('px-6 py-3', isCategory && 'font-bold text-gray-800')}>
        {row.description}
      </td>
      <td className="px-6 py-3 text-center">{row.note}</td>
      <td className="px-6 py-3 text-right">{formatAmount(row.currentPeriodAmount)}</td>
      <td className="px-6 py-3 text-right">{formatAmount(row.previousPeriodAmount)}</td>
    </tr>
  );
} 