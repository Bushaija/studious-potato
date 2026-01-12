import React, { useCallback, memo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calculator, AlertCircle } from 'lucide-react';
import { usePlanningFormContext } from './planning-form-context';
import { formatCurrency } from '@/lib/planning';

interface EnhancedActivityRowProps {
  activity: {
    id: number;
    name: string;
    code: string;
    isAnnualOnly: boolean;
  };
}

const EnhancedActivityRowComponent: React.FC<EnhancedActivityRowProps> = ({ activity }) => {
  const {
    formData,
    calculations,
    handleFieldChange,
    validationErrors
  } = usePlanningFormContext();

  const activityId = activity.id.toString();
  const activityData = formData[activityId] || {};
  const activityCalc = calculations[activityId] || {};
  const activityErrors = validationErrors[activityId] || {};

  // Optimized input change handler
  const handleInputChange = useCallback((field: string, rawValue: string) => {
    let processedValue: any = rawValue;
    
    // Process numeric fields
    if (['frequency', 'unit_cost', 'q1_count', 'q2_count', 'q3_count', 'q4_count'].includes(field)) {
      // Handle empty string
      if (rawValue === '') {
        processedValue = 0;
      } else {
        // Remove formatting and convert to number
        const cleaned = rawValue.replace(/[,$\s]/g, '');
        const numValue = parseFloat(cleaned);
        processedValue = isNaN(numValue) ? 0 : Math.max(0, numValue);
        
        // Special handling for frequency (minimum 1)
        if (field === 'frequency') {
          processedValue = Math.max(1, Math.floor(processedValue));
        }
      }
    }
    
    // Call the change handler
    handleFieldChange(activityId, field, processedValue);
  }, [activityId, handleFieldChange]);

  const hasError = (field: string) => !!activityErrors[field];
  const getErrorMessage = (field: string) => activityErrors[field]?.[0] || '';

  return (
    <tr className="border-t hover:bg-gray-50/50 ">
      {/* Activity Name */}
      <td className="text-sm sticky left-0 bg-white border-r">
        <div className='flex gap-2 items-center'>
          <div className="font-medium text-gray-900 ml-12">{activity.name}</div>
          {/* <div className="text-xs text-gray-500">{activity.code}</div> */}
          {activity.isAnnualOnly && (
            <Badge variant="secondary" className="mt-1 text-xs border-1 bg-yellow-100">
              Annual Only
            </Badge>
          )}
          {Object.keys(activityErrors).length > 0 && (
            <div className="flex items-center mt-1 text-red-500">
              <AlertCircle className="h-3 w-3 mr-1" />
              <span className="text-xs">Has errors</span>
            </div>
          )}
        </div>
      </td>

      {/* Frequency */}
      <td className="text-center ml-2">
        <Input
          type="number"
          value={activityData.frequency || ''}
          onChange={(e) => handleInputChange('frequency', e.target.value)}
          className={`w-20 m-0 p-0 text-center text-sm ${hasError('frequency') ? 'border-red-500' : ''}`}
          min="1"
          max="365"
          step="1"
          placeholder="1"
          title={hasError('frequency') ? getErrorMessage('frequency') : 'How many times per year'}
        />
      </td>

      {/* Unit Cost */}
      <td className="text-center">
        <Input
          type="number"
          value={activityData.unit_cost || ''}
          onChange={(e) => handleInputChange('unit_cost', e.target.value)}
          className={`w-28 text-center text-sm ${hasError('unit_cost') ? 'border-red-500' : ''}`}
          min="0"
          step="0.01"
          placeholder="0.00"
          title={hasError('unit_cost') ? getErrorMessage('unit_cost') : 'Cost per unit in USD'}
        />
      </td>

      {/* Q1 Count */}
      <td className="text-center">
        <Input
          type="number"
          value={activityData.q1_count || ''}
          onChange={(e) => handleInputChange('q1_count', e.target.value)}
          className={`w-20 text-center text-sm ${hasError('q1_count') ? 'border-red-500' : ''}`}
          min="0"
          step="1"
          placeholder="0"
          title={hasError('q1_count') ? getErrorMessage('q1_count') : 'Quarter 1 count'}
        />
      </td>

      {/* Q2 Count */}
      <td className="text-center">
        <Input
          type="number"
          value={activityData.q2_count || ''}
          onChange={(e) => handleInputChange('q2_count', e.target.value)}
          className={`w-20 text-center text-sm ${hasError('q2_count') ? 'border-red-500' : ''}`}
          min="0"
          step="1"
          placeholder="0"
          disabled={activity.isAnnualOnly}
          title={
            activity.isAnnualOnly 
              ? 'Disabled for annual-only activities' 
              : hasError('q2_count') 
                ? getErrorMessage('q2_count') 
                : 'Quarter 2 count'
          }
        />
      </td>

      {/* Q3 Count */}
      <td className="text-center">
        <Input
          type="number"
          value={activityData.q3_count || ''}
          onChange={(e) => handleInputChange('q3_count', e.target.value)}
          className={`w-20 text-center text-sm ${hasError('q3_count') ? 'border-red-500' : ''}`}
          min="0"
          step="1"
          placeholder="0"
          disabled={activity.isAnnualOnly}
          title={
            activity.isAnnualOnly 
              ? 'Disabled for annual-only activities' 
              : hasError('q3_count') 
                ? getErrorMessage('q3_count') 
                : 'Quarter 3 count'
          }
        />
      </td>

      {/* Q4 Count */}
      <td className="text-center">
        <Input
          type="number"
          value={activityData.q4_count || ''}
          onChange={(e) => handleInputChange('q4_count', e.target.value)}
          className={`w-20 text-center text-sm ${hasError('q4_count') ? 'border-red-500' : ''}`}
          min="0"
          step="1"
          placeholder="0"
          disabled={activity.isAnnualOnly}
          title={
            activity.isAnnualOnly 
              ? 'Disabled for annual-only activities' 
              : hasError('q4_count') 
                ? getErrorMessage('q4_count') 
                : 'Quarter 4 count'
          }
        />
      </td>

      {/* Calculated Amounts */}
      <td className="text-center">
        <div className="flex items-center justify-center text-sm font-mono text-gray-700">
          <Calculator className="h-3 w-3 mr-1 text-gray-400" />
          <span className="font-medium">
            {activityCalc.q1Amount || 0}
          </span>
        </div>
      </td>

      <td className="text-center">
        <div className="flex items-center justify-center text-sm font-mono text-gray-700">
          <Calculator className="h-3 w-3 mr-1 text-gray-400" />
          <span className="font-medium">
            {activityCalc.q2Amount || 0}
          </span>
        </div>
      </td>

      <td className="text-center">
        <div className="flex items-center justify-center text-sm font-mono text-gray-700">
          <Calculator className="h-3 w-3 mr-1 text-gray-400" />
          <span className="font-medium">
            {activityCalc.q3Amount || 0}
          </span>
        </div>
      </td>

      <td className="text-center">
        <div className="flex items-center justify-center text-sm font-mono text-gray-700">
          <Calculator className="h-3 w-3 mr-1 text-gray-400" />
          <span className="font-medium">
            {activityCalc.q4Amount || 0}
          </span>
        </div>
      </td>

      {/* Total Amount */}
      <td className="text-center">
        <div className="flex items-center justify-center text-sm font-mono font-bold text-blue-900 bg-blue-50 rounded px-2 py-1">
          <Calculator className="h-3 w-3 mr-1 text-blue-500 " />
          <span className="font-bold text-[14px]">
            {activityCalc.totalAmount || 0}
          </span>
        </div>
      </td>

      {/* Comments */}
      <td className="">
        <Textarea
          value={activityData.comments || ''}
          onChange={(e) => handleFieldChange(activityId, 'comments', e.target.value)}
          className={`w-full text-xs h-2 ${hasError('comments') ? 'border-red-500' : ''}`}
          placeholder="Add comments..."
          rows={0}
          title={hasError('comments') ? getErrorMessage('comments') : 'Optional comments'}
        />
      </td>
    </tr>
  );
};

export const EnhancedActivityRow = memo(EnhancedActivityRowComponent);