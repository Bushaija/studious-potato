import { useMemo, memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/planning/formatters';
import { EnhancedActivityRow } from './enhanced-activity-row';
import { usePlanningFormContext } from './planning-form-context';

interface EnhancedCategorySectionProps {
  category: {
    id: number;
    name: string;
    code: string;
    activities: any[];
  };
  isExpanded: boolean;
  onToggle: () => void;
}

const EnhancedCategorySectionComponent: React.FC<EnhancedCategorySectionProps> = ({
  category,
  isExpanded,
  onToggle
}) => {
  const { calculations } = usePlanningFormContext();

  // Calculate category totals
  const categoryTotals = useMemo(() => {
    if (!category?.activities || !calculations) {
      return {
        q1Amount: 0,
        q2Amount: 0,
        q3Amount: 0,
        q4Amount: 0,
        totalAmount: 0
      };
    }

    return category.activities.reduce((totals, activity) => {
      if (activity?.id) {
        const calc = calculations[activity.id.toString()];
        if (calc) {
          totals.q1Amount += calc.q1Amount || 0;
          totals.q2Amount += calc.q2Amount || 0;
          totals.q3Amount += calc.q3Amount || 0;
          totals.q4Amount += calc.q4Amount || 0;
          totals.totalAmount += calc.totalAmount || 0;
        }
      }
      return totals;
    }, {
      q1Amount: 0,
      q2Amount: 0,
      q3Amount: 0,
      q4Amount: 0,
      totalAmount: 0
    });
  }, [category.activities, calculations]);

  return (
    <>
      {/* Category Header */}
      <tr 
        className="bg-gray-200 cursor-pointer border-t-2 border-gray-300"
        onClick={onToggle}
      >
        <td className="font-semibold bg-gray-200 sticky left-0 bg-gray-100 w-[350px]">
          <div className="flex items-center justify-center w-full">
            {isExpanded ? <ChevronDown className="ml-2 h-4 w-4" /> : <ChevronRight className="ml-2 h-4 w-4" />}
            <span className='ml-2 text-12 w-[280px]'>{category.name}</span>
            <Badge variant="outline" className="text-xs bg-yellow-100 border-1 rounded-full border-1 text-light">
              {category.activities.length} activities
            </Badge>
          </div>
        </td>
        <td className="p-2 text-center w-[80px]">-</td>
        <td className="p-2 text-center w-[80px]">-</td>
        <td className="p-2 text-center w-[80px]">-</td>
        <td className="p-2 text-center w-[80px]">-</td>
        <td className="p-2 text-center w-[80px]">-</td>
        <td className="p-2 text-center w-[80px]">-</td>
        <td className="p-2 text-center text-sm font-mono">
          {formatCurrency(categoryTotals.q1Amount)}
        </td>
        <td className="px-4 py-3 text-center text-sm font-mono">
          {formatCurrency(categoryTotals.q2Amount)}
        </td>
        <td className="px-4 py-3 text-center text-sm font-mono">
          {formatCurrency(categoryTotals.q3Amount)}
        </td>
        <td className="px-4 py-3 text-center text-sm font-mono">
          {formatCurrency(categoryTotals.q4Amount)}
        </td>
        <td className="px-4 py-3 text-center text-sm font-mono font-semibold">
          {formatCurrency(categoryTotals.totalAmount)}
        </td>
        <td className="p-2 text-center w-[180px]">-</td>
      </tr>

        {/* Activity Rows */}
        {isExpanded && category.activities.map(activity => (
          <EnhancedActivityRow
            key={activity.id}
            activity={activity}
          />
        ))}
    </>
  );
};

export const EnhancedCategorySection = memo(EnhancedCategorySectionComponent);