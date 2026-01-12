import { PlanningActivity, PlanningDataEntry } from "@/fetchers/planning/types";
import { calculateActivityAmounts } from "./calculations";
import { extractFormDataFromPlanningEntry } from "./data-transforms";

export interface ExportOptions {
    format: 'json' | 'csv' | 'xlsx';
    includeCalculations?: boolean;
    includeMetadata?: boolean;
    filename?: string;
  }
  
  export function exportPlanningData(
    data: PlanningDataEntry[],
    activities: PlanningActivity[],
    options: ExportOptions
  ): void {
    const {
      format,
      includeCalculations = true,
      includeMetadata = false,
      filename = `planning-data-${new Date().toISOString().split('T')[0]}`
    } = options;
  
    switch (format) {
      case 'json':
        exportAsJSON(data, filename, includeMetadata);
        break;
      case 'csv':
        exportAsCSV(data, activities, filename, includeCalculations);
        break;
      case 'xlsx':
        console.warn('XLSX export not implemented - falling back to CSV');
        exportAsCSV(data, activities, filename, includeCalculations);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
  
  function exportAsJSON(data: PlanningDataEntry[], filename: string, includeMetadata: boolean): void {
    const exportData = includeMetadata ? data : data.map(({ metadata, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${filename}.json`);
  }
  
  function exportAsCSV(
    data: PlanningDataEntry[],
    activities: PlanningActivity[],
    filename: string,
    includeCalculations: boolean
  ): void {
    const headers = [
      'ID',
      'Project ID',
      'Facility ID',
      'Reporting Period ID',
      'Activity Name',
      'Activity Code',
      'Frequency',
      'Unit Cost',
      'Q1 Count',
      'Q2 Count',
      'Q3 Count',
      'Q4 Count'
    ];
  
    if (includeCalculations) {
      headers.push('Q1 Amount', 'Q2 Amount', 'Q3 Amount', 'Q4 Amount', 'Total Amount');
    }
  
    headers.push('Comments', 'Created At', 'Updated At');
  
    const rows: string[] = [headers.join(',')];
  
    data.forEach(entry => {
      const formData = extractFormDataFromPlanningEntry(entry);
      
      Object.keys(formData).forEach(activityId => {
        const activity = activities.find(a => a.id === parseInt(activityId));
        const activityData = formData[activityId];
        
        if (!activity || !activityData) return;
  
        const row = [
          entry.id,
          entry.projectId,
          entry.facilityId,
          entry.reportingPeriodId || '',
          `"${activity.name.replace(/"/g, '""')}"`,
          activity.code,
          activityData.frequency || 0,
          activityData.unitCost || 0,
          activityData.q1Count || 0,
          activityData.q2Count || 0,
          activityData.q3Count || 0,
          activityData.q4Count || 0
        ];
  
        if (includeCalculations) {
          const calc = calculateActivityAmounts(
            activityData.frequency || 1,
            activityData.unitCost || 0,
            activityData.q1Count || 0,
            activityData.q2Count || 0,
            activityData.q3Count || 0,
            activityData.q4Count || 0,
            activity.isAnnualOnly
          );
          row.push(
            calc.q1Amount.toFixed(2),
            calc.q2Amount.toFixed(2),
            calc.q3Amount.toFixed(2),
            calc.q4Amount.toFixed(2),
            calc.totalAmount.toFixed(2)
          );
        }
  
        row.push(
          `"${(activityData.comments || '').replace(/"/g, '""')}"`,
          entry.createdAt,
          entry.updatedAt
        );
  
        rows.push(row.join(','));
      });
    });
  
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    downloadBlob(blob, `${filename}.csv`);
  }
  
  function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }