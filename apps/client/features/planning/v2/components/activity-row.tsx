import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Activity } from '../../types';
import { DynamicField } from './dynamic-field';


// interface ActivityRowProps {
//     activity: Activity;
//     isExpanded?: boolean;
//     calculations?: {
//       q1Amount: number;
//       q2Amount: number;
//       q3Amount: number;
//       q4Amount: number;
//       totalAmount: number;
//     };
//   }

//   export const ActivityRow: React.FC<ActivityRowProps> = ({ 
//     activity, 
//     isExpanded = true, 
//     calculations 
//   }) => {
//     const form = useFormContext();
    
//     if (!form) {
//       throw new Error('ActivityRow must be used within FormProvider');
//     }
  
//     const { register, watch } = form;
    
//     // Watch for real-time updates
//     const watchedData = watch(`activities.${activity.id}`);
//     const isAnnualOnly = (activity as { isAnnualOnly?: boolean }).isAnnualOnly ?? false;
//     const activityName = (activity as any).name ?? (activity as any).activity ?? '';
//     const activityCode = (activity as any).code ?? (activity as any).typeOfActivity ?? '';
  
//     const formatCurrency = (amount: number) => {
//       return new Intl.NumberFormat('en-US', { 
//         style: 'currency', 
//         currency: 'USD',
//         minimumFractionDigits: 0,
//         maximumFractionDigits: 0
//       }).format(amount);
//     };
  
//     if (!isExpanded) return null;
  
//     return (
//       <tr className="border-t hover:bg-gray-50">
//         <td className="px-4 py-3 text-sm">
//           <div>
//             <div className="font-medium">{activityName}</div>
//             <div className="text-gray-500 text-xs">{activityCode}</div>
//             {isAnnualOnly && (
//               <Badge variant="secondary" className="mt-1">Annual Only</Badge>
//             )}
//           </div>
//         </td>
        
//         {/* Frequency */}
//         <td className="px-4 py-3 text-center">
//           <Input
//             type="number"
//             className="w-20 text-center"
//             min="0"
//             step="1"
//             {...register(`activities.${activity.id}.frequency`, { valueAsNumber: true })}
//           />
//         </td>
        
//         {/* Unit Cost */}
//         <td className="px-4 py-3 text-center">
//           <Input
//             type="number"
//             className="w-24 text-center"
//             min="0"
//             step="0.01"
//             {...register(`activities.${activity.id}.unitCost`, { valueAsNumber: true })}
//           />
//         </td>
        
//         {/* Q1 Count */}
//         <td className="px-4 py-3 text-center">
//           <Input
//             type="number"
//             className="w-20 text-center"
//             min="0"
//             step="1"
//             {...register(`activities.${activity.id}.q1Count`, { valueAsNumber: true })}
//           />
//         </td>
        
//         {/* Q2 Count */}
//         <td className="px-4 py-3 text-center">
//           <Input
//             type="number"
//             className="w-20 text-center"
//             min="0"
//             step="1"
//             disabled={isAnnualOnly}
//             {...register(`activities.${activity.id}.q2Count`, { valueAsNumber: true })}
//           />
//         </td>
        
//         {/* Q3 Count */}
//         <td className="px-4 py-3 text-center">
//           <Input
//             type="number"
//             className="w-20 text-center"
//             min="0"
//             step="1"
//             disabled={isAnnualOnly}
//             {...register(`activities.${activity.id}.q3Count`, { valueAsNumber: true })}
//           />
//         </td>
        
//         {/* Q4 Count */}
//         <td className="px-4 py-3 text-center">
//           <Input
//             type="number"
//             className="w-20 text-center"
//             min="0"
//             step="1"
//             disabled={isAnnualOnly}
//             {...register(`activities.${activity.id}.q4Count`, { valueAsNumber: true })}
//           />
//         </td>
        
//         {/* Calculated Amounts */}
//         <td className="px-4 py-3 text-center text-sm font-mono">
//           {calculations ? formatCurrency(calculations.q1Amount) : '$0'}
//         </td>
//         <td className="px-4 py-3 text-center text-sm font-mono">
//           {calculations ? formatCurrency(calculations.q2Amount) : '$0'}
//         </td>
//         <td className="px-4 py-3 text-center text-sm font-mono">
//           {calculations ? formatCurrency(calculations.q3Amount) : '$0'}
//         </td>
//         <td className="px-4 py-3 text-center text-sm font-mono">
//           {calculations ? formatCurrency(calculations.q4Amount) : '$0'}
//         </td>
        
//         {/* Total */}
//         <td className="px-4 py-3 text-center text-sm font-mono font-bold">
//           {calculations ? formatCurrency(calculations.totalAmount) : '$0'}
//         </td>
        
//         {/* Comments */}
//         <td className="px-4 py-3">
//           <Input
//             type="text"
//             className="w-32"
//             placeholder="Add comment..."
//             {...register(`activities.${activity.id}.comments`)}
//           />
//         </td>
//       </tr>
//     );
//   };

export interface ActivityRowProps {
  activity: Activity;
  columns: any[];
  formData: Record<string, any>;
  calculations: Record<string, number>;
  onFieldChange: (activityId: string, fieldKey: string, value: any) => void;
}

export const ActivityRow: React.FC<ActivityRowProps> = ({
  activity,
  columns,
  formData,
  calculations,
  onFieldChange
}) => {
  const activityData = formData[activity.id] || {};

  return (
    <tr className="border-t hover:bg-gray-50/50">
      {/* Activity Name Column */}
      <td className="px-4 py-3 text-sm sticky left-0 bg-white border-r">
        <div>
          <div className="font-medium text-gray-900">{activity.name}</div>
          <div className="text-xs text-gray-500">{activity.code}</div>
          {activity.isAnnualOnly && (
            <Badge variant="secondary" className="mt-1 text-xs">
              Annual Only
            </Badge>
          )}
        </div>
      </td>

      {/* Dynamic Columns */}
      {columns.map(column => (
        <td key={column.key} className="px-2 py-3 text-center" style={{ width: column.width }}>
          <DynamicField
            field={column}
            value={activityData[column.key]}
            calculatedValue={calculations[column.key]}
            onChange={(value) => onFieldChange(activity.id, column.key, value)}
            activityId={activity.id}
            isAnnualOnly={activity.isAnnualOnly}
          />
        </td>
      ))}
    </tr>
  );
};