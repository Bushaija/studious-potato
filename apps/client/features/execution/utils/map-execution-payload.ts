import { FinancialTableDataPayload } from '@/types';
import { z } from 'zod';
import { CreateExecutionDataSchema } from '@/app/api/[[...route]]/routes/execution-data/execution-data.schema';

type CreateExecutionData = z.infer<typeof CreateExecutionDataSchema>;

/**
 * Transforms form data into an array of execution data records for the API.
 * - reportingPeriodId comes from the UI state.
 * - activitiesMap maps your form row.id (e.g., "b04-1") to a database activityId.
 */
export const mapExecutionPayload = (
  form: FinancialTableDataPayload,
  opts: { reportingPeriodId: number; facilityId: number; projectId: number; activitiesMap: Record<string, number> }
): CreateExecutionData[] => {
  const leafNodes: any[] = [];
  
  const findLeafNodes = (rows: any[]) => {
    rows.forEach(row => {
      if (row.children && row.children.length > 0) {
        findLeafNodes(row.children);
      } else if (!row.isCategory) {
        leafNodes.push(row);
      }
    });
  };

  findLeafNodes(form.tableData);

  const seen = new Set<string>();
  const executionRows = leafNodes
    .filter(row => {
      // Prefer matching by the explicit row.id, but fall back to the row title
      const key = opts.activitiesMap[row.id] ? row.id : row.title;
      const activityId = opts.activitiesMap[key];
      const hasValues = (row.q1 || row.q2 || row.q3 || row.q4 || row.comments);
      
      if (seen.has(`${opts.reportingPeriodId}-${opts.facilityId}-${activityId}`)) return false;
      seen.add(`${opts.reportingPeriodId}-${opts.facilityId}-${activityId}`);
      return (
        key &&
        activityId &&
        hasValues
      );
    })
    .map(row => {
      const key = opts.activitiesMap[row.id] ? row.id : row.title;
      const amountRegex = /^-?\d+(\.\d{1,2})?$/;
      return {
        reportingPeriodId: opts.reportingPeriodId,
        facilityId: opts.facilityId,
        projectId: opts.projectId,
        activityId: opts.activitiesMap[key],
        q1Amount: row.q1 ? z.string().regex(amountRegex).parse(String(row.q1)) : undefined,
        q2Amount: row.q2 ? z.string().regex(amountRegex).parse(String(row.q2)) : undefined,
        q3Amount: row.q3 ? z.string().regex(amountRegex).parse(String(row.q3)) : undefined,
        q4Amount: row.q4 ? z.string().regex(amountRegex).parse(String(row.q4)) : undefined,
        comment: row.comments,
      };
    });

  return executionRows;
}; 