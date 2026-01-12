import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { PlanActivityRow } from '@/features/planning/components/plan-activity-row';
import { PlanGeneralTotalRow } from '@/features/planning/components/plan-general-total-row';
import { createEmptyActivity, Plan } from '@/features/planning/schema/hiv/plan-form-schema';
import { ActivityEntry } from '../constants/types';
import { PlanActivitiesData } from '../types';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface PlanActivitiesTableProps {
  form: UseFormReturn<Plan>;
  activitiesData: PlanActivitiesData;
  getActivityIndex: (activity: any) => number;
  toggleCategory: (category: string) => void;
  isReadOnly?: boolean;
  /** The health programme (HIV, Malaria, TB) this plan belongs to */
  program?: string;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
};

export function PlanActivitiesTable({
  form,
  activitiesData,
  getActivityIndex,
  toggleCategory,
  isReadOnly = false,
}: PlanActivitiesTableProps) {
    const { activities, activityCategories, categorizedActivities, categoryTotals, expandedCategories } = activitiesData;
  return (
    <div className="rounded-md border shadow">
      <div className="overflow-auto max-h-[70vh]">
        <Table className="min-w-max relative">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="w-[200px] sticky left-0 z-20 bg-background">Activity Category</TableHead>
              <TableHead className="w-[250px] text-left">Type of Activity</TableHead>
              <TableHead className="w-[90px] text-center">Frequency</TableHead>
              <TableHead className="w-[90px] text-center">Unit Cost</TableHead>
              <TableHead className="w-[90px] text-center">Count Q1<br/>(Jul-Sep)</TableHead>
              <TableHead className="w-[90px] text-center">Count Q2<br/>(Oct-Dec)</TableHead>
              <TableHead className="w-[90px] text-center">Count Q3<br/>(Jan-Mar)</TableHead>
              <TableHead className="w-[90px] text-center">Count Q4<br/>(Apr-Jun)</TableHead>
              <TableHead className="w-[90px] text-center">Amount<br/>Q1</TableHead>
              <TableHead className="w-[90px] text-center">Amount<br/>Q2</TableHead>
              <TableHead className="w-[90px] text-center">Amount<br/>Q3</TableHead>
              <TableHead className="w-[90px] text-center">Amount<br/>Q4</TableHead>
              <TableHead className="w-[120px]">Total Budget</TableHead>
              <TableHead className="w-[180px]">Comment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.keys(activityCategories).map((category) => {
              // Determine list of entry descriptors for this category
              const entries: ActivityEntry[] = Array.isArray(activityCategories[category])
                ? (activityCategories[category] as any)
                : (categorizedActivities[category] || []).map((a: any) => ({
                    activity: a.activity ?? a.name ?? '',
                    typeOfActivity: a.typeOfActivity ?? a.name ?? ''
                  }));
              const categoryActivities = categorizedActivities[category] || [];
              const totals = categoryTotals[category];
              const isExpanded = expandedCategories[category];

              return (
                <React.Fragment key={category}>
                  <TableRow
                    className="bg-muted/50 font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => toggleCategory(category)}
                  >
                    <TableCell className="w-[200px] sticky left-0 bg-muted/50">
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        {category}
                      </div>
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">{formatCurrency(totals.amountQ1)}</TableCell>
                    <TableCell className="text-center">{formatCurrency(totals.amountQ2)}</TableCell>
                    <TableCell className="text-center">{formatCurrency(totals.amountQ3)}</TableCell>
                    <TableCell className="text-center">{formatCurrency(totals.amountQ4)}</TableCell>
                    <TableCell className="font-semibold text-center">{formatCurrency(totals.totalBudget)}</TableCell>
                    <TableCell className="text-center">-</TableCell>
                  </TableRow>

                  {isExpanded && entries.map((entry: ActivityEntry, entryIndex: number) => {
                    const activity = categoryActivities.find(
                      a => a.typeOfActivity === entry.typeOfActivity && a.activity === entry.activity
                    ) || createEmptyActivity(category, entry.typeOfActivity, entry.activity);
                    
                    return (
                      <PlanActivityRow
                        key={`${category}-${entry.typeOfActivity}-${entry.activity}-${entryIndex}`}
                        activity={activity as any}
                        index={getActivityIndex(activity)}
                        form={form}
                        isSubCategory={true}
                        isReadOnly={isReadOnly}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
          </TableBody>
          <TableFooter className="sticky bottom-0 bg-background">
            <PlanGeneralTotalRow activities={activities as any} />
          </TableFooter>
        </Table>
      </div>
    </div>
  );
} 