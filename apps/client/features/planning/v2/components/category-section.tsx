import { ChevronDown, ChevronRight } from "lucide-react";
import { ActivityRow } from "./activity-row";
import { useMemo } from "react";
import { ActivityFormData, Category } from "../types";
import { Badge } from '@/components/ui/badge';

interface CategorySectionProps {
  category: Category;
  isExpanded: boolean;
  onToggle: () => void;
  columns: any[];
  formData: ActivityFormData;
  calculations: Record<string, Record<string, number>>;
  onFieldChange: (activityId: string, fieldKey: string, value: any) => void;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  isExpanded,
  onToggle,
  columns,
  formData,
  calculations,
  onFieldChange
}) => {
  // Calculate category totals
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    
    columns.forEach(column => {
      if (column.type === 'calculated') {
        totals[column.key] = category.activities.reduce((sum, activity) => {
          return sum + (calculations[activity.id]?.[column.key] || 0);
        }, 0);
      }
    });
    
    return totals;
  }, [category.activities, calculations, columns]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <>
      {/* Category Header */}
      <tr 
        className="bg-gray-100 hover:bg-gray-200 cursor-pointer border-t-2 border-gray-300"
        onClick={onToggle}
      >
        <td className="px-4 py-3 font-semibold sticky left-0 bg-gray-100 border-r">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span>{category.name}</span>
            <Badge variant="outline" className="text-xs">
              {category.activities.length} activities
            </Badge>
          </div>
        </td>
        
        {columns.map(column => (
          <td key={column.key} className="px-2 py-3 text-center text-sm font-medium" style={{ width: column.width }}>
            {column.type === 'calculated' ? formatCurrency(categoryTotals[column.key]) : '-'}
          </td>
        ))}
      </tr>

      {/* Activity Rows */}
      {isExpanded && category.activities.map(activity => (
        <ActivityRow
          key={activity.id}
          activity={activity}
          columns={columns}
          formData={formData}
          calculations={calculations[activity.id] || {}}
          onFieldChange={onFieldChange}
        />
      ))}
    </>
  );
};