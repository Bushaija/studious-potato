import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategorySection } from './category-section';
import { Category } from '../types';

interface ActivitiesTableProps {
  categories: Category[];
  calculations: Record<string, any>;
  isLoading?: boolean;
}

export const ActivitiesTable: React.FC<ActivitiesTableProps> = ({ 
  categories, 
  calculations, 
  isLoading = false 
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    categories.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
  );

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Calculate grand totals
  const grandTotals = categories.reduce((totals, category) => {
    category.activities.forEach(activity => {
      const activityCalc = calculations[activity.id];
      if (activityCalc) {
        totals.q1 += activityCalc.q1Amount || 0;
        totals.q2 += activityCalc.q2Amount || 0;
        totals.q3 += activityCalc.q3Amount || 0;
        totals.q4 += activityCalc.q4Amount || 0;
        totals.total += activityCalc.totalAmount || 0;
      }
    });
    return totals;
  }, { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading activities...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Planning Activities
          <Badge variant="outline">{categories.length} categories</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 min-w-[300px]">
                  Activity Category
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Frequency</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Unit Cost</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Q1 Count</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Q2 Count</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Q3 Count</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Q4 Count</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Q1 Amount</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Q2 Amount</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Q3 Amount</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Q4 Amount</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Total Budget</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Comments</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(category => (
                <CategorySection
                  key={category.id}
                  category={category}
                  isExpanded={expandedCategories[category.id]}
                  onToggle={() => toggleCategory(category.id)}
                  calculations={calculations}
                />
              ))}
              
              {/* Grand Total Row */}
              <tr className="bg-blue-50 border-t-2 border-blue-300 border-2 border-blue-300">
                <td className="px-4 py-4 font-bold text-blue-900">GRAND TOTAL</td>
                <td className="px-4 py-4 text-center">-</td>
                <td className="px-4 py-4 text-center">-</td>
                <td className="px-4 py-4 text-center">-</td>
                <td className="px-4 py-4 text-center">-</td>
                <td className="px-4 py-4 text-center">-</td>
                <td className="px-4 py-4 text-center">-</td>
                <td className="px-4 py-4 text-center font-mono text-blue-900  font-semibold">{formatCurrency(grandTotals.q1)}</td>
                <td className="px-4 py-4 text-center font-mono text-blue-900  font-semibold">{formatCurrency(grandTotals.q2)}</td>
                <td className="px-4 py-4 text-center font-mono text-blue-900  font-semibold">{formatCurrency(grandTotals.q3)}</td>
                <td className="px-4 py-4 text-center font-mono text-blue-900  font-semibold">{formatCurrency(grandTotals.q4)}</td>
                <td className="px-4 py-4 text-center font-mono text-blue-900  font-bold text-lg">{formatCurrency(grandTotals.total)}</td>
                <td className="px-4 py-4">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

