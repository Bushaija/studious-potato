import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { db } from "@/api/db";
import { dynamicActivities, schemaActivityCategories } from "@/api/db/schema";
import { eq, and } from "drizzle-orm";



interface ParseResult {
  success: boolean;
  data?: any;
  errors?: string[];
  warnings?: string[];
  metadata?: {
    rowCount: number;
    validRows: number;
    invalidRows: number;
    fileName: string;
    errorSummary?: Record<string, number>;
    warningSummary?: Record<string, number>;
  };
}

export class FileParserService {
  /**
   * Main entry point for parsing uploaded files
   */
  async parseFile(
    fileData: string, 
    fileName: string, 
    projectType: 'HIV' | 'Malaria' | 'TB',
    facilityType: 'hospital' | 'health_center'
  ): Promise<ParseResult> {
    try {
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      
      let rawData: any[];
      
      if (fileExtension === 'csv') {
        rawData = await this.parseCSV(fileData);
      } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
        rawData = await this.parseExcel(fileData);
      } else {
        return {
          success: false,
          errors: ['Unsupported file format. Please upload CSV or Excel files.']
        };
      }

      // Validate and transform the data
      return await this.validateAndTransform(rawData, projectType, facilityType, fileName);
    } catch (error: any) {
      return {
        success: false,
        errors: [error.message || 'Failed to parse file']
      };
    }
  }

  /**
   * Parse CSV file
   */
  private async parseCSV(base64Data: string): Promise<any[]> {
    const csvString = Buffer.from(base64Data, 'base64').toString('utf-8');
    
    const result = Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep as strings for better control
      transformHeader: (header) => this.normalizeColumnName(header)
    });

    if (result.errors.length > 0) {
      throw new Error(`CSV parsing errors: ${result.errors.map(e => e.message).join(', ')}`);
    }

    return result.data;
  }

  /**
   * Parse Excel file
   */
  private async parseExcel(base64Data: string): Promise<any[]> {
    const buffer = Buffer.from(base64Data, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(sheet, {
      defval: '', // Default empty cells to empty string
      raw: false  // Keep as strings for better control
    });

    // Normalize headers and handle empty cells
    return data.map((row: any) => {
      const normalized: any = {};
      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = this.normalizeColumnName(key);
        normalized[normalizedKey] = value || ''; // Handle null/undefined values
      }
      return normalized;
    });
  }

  /**
   * Normalize column names to snake_case
   */
  private normalizeColumnName(header: string): string {
    return header
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_')    // Replace spaces with underscores
      .replace(/_+/g, '_')     // Replace multiple underscores with single
      .replace(/^_|_$/g, '');  // Remove leading/trailing underscores
  }

  /**
   * Validate and transform parsed data into the expected JSON structure
   */
  private async validateAndTransform(
    rows: any[],
    projectType: 'HIV' | 'Malaria' | 'TB',
    facilityType: 'hospital' | 'health_center',
    fileName: string
  ): Promise<ParseResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const activities: Record<string, any> = {};

    // Fetch valid activities for this project/facility type with category information and metadata
    const validActivities = await db
      .select({
        id: dynamicActivities.id,
        name: dynamicActivities.name,
        code: dynamicActivities.code,
        categoryName: schemaActivityCategories.name,
        categoryCode: schemaActivityCategories.code,
        metadata: dynamicActivities.metadata,
      })
      .from(dynamicActivities)
      .innerJoin(
        schemaActivityCategories,
        eq(dynamicActivities.categoryId, schemaActivityCategories.id)
      )
      .where(
        and(
          eq(dynamicActivities.projectType, projectType as any),
          eq(dynamicActivities.facilityType, facilityType),
          eq(dynamicActivities.moduleType, 'planning'),
          eq(dynamicActivities.isActive, true),
          eq(schemaActivityCategories.isActive, true)
        )
      );

    // Create lookup maps
    const activityByCode = new Map(validActivities.map(a => [a.code, a]));
    const activityByName = new Map(validActivities.map(a => [a.name.toLowerCase(), a]));
    const activityById = new Map(validActivities.map(a => [a.id.toString(), a]));

    let validRows = 0;
    let invalidRows = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because Excel is 1-indexed and has header row

      try {
        // Extract activity identifier (support multiple column names)
        const activityId = row.activity_id || row.activityid || row.id;
        const activityCode = row.activity_code || row.code || row.activity_number;
        const activityName = row.activity_name || row.activity || row.name;
        
        // Extract category information (optional for matching)
        const categoryName = row.category_name || row.categoryname || row.category;
        
        // Extract applicable quarters information (for future use)
        // const applicableQuartersRaw = row.applicable_quarters || row.applicablequarters || row.quarters;

        // Find matching activity with priority: ID > Code > Name
        let matchedActivity;
        let matchMethod = '';

        // Priority 1: Match by activity_id (most reliable)
        if (activityId && activityId.toString().trim() !== '') {
          matchedActivity = activityById.get(activityId.toString().trim());
          if (matchedActivity) {
            matchMethod = 'ID';
          }
        }

        // Priority 2: Match by activity_code (fallback)
        if (!matchedActivity && activityCode && activityCode.toString().trim() !== '') {
          matchedActivity = activityByCode.get(activityCode.toString().trim());
          if (matchedActivity) {
            matchMethod = 'Code';
          }
        }

        // Priority 3: Match by activity_name (last resort)
        if (!matchedActivity && activityName && activityName.toString().trim() !== '') {
          const normalizedName = activityName.toString().trim().toLowerCase();
          matchedActivity = activityByName.get(normalizedName);
          if (matchedActivity) {
            matchMethod = 'Name';
          }
        }

        if (!matchedActivity) {
          const identifiers = [
            activityId ? `ID: "${activityId}"` : null,
            activityCode ? `Code: "${activityCode}"` : null,
            activityName ? `Name: "${activityName}"` : null
          ].filter(Boolean).join(', ');
          
          errors.push(`Row ${rowNum}: Could not match activity (${identifiers || 'No identifiers provided'})`);
          invalidRows++;
          continue;
        }

        // Log successful match for debugging
        if (matchMethod !== 'ID') {
          warnings.push(`Row ${rowNum}: Activity matched by ${matchMethod} - "${matchedActivity.name}"`);
        }

        // Validate category information if provided
        if (categoryName && categoryName.toString().trim() !== '' && matchedActivity.categoryName) {
          const providedCategory = categoryName.toString().trim().toLowerCase();
          const expectedCategory = matchedActivity.categoryName.toLowerCase();
          
          if (providedCategory !== expectedCategory) {
            warnings.push(`Row ${rowNum}: Category mismatch for "${matchedActivity.name}". Expected: "${matchedActivity.categoryName}", Found: "${categoryName}"`);
          }
        }

        // Parse numeric fields with enhanced validation and warnings
        const unitCost = this.parseNumber(
          row.unit_cost || row.unitcost || row.cost || row.price,
          'unit_cost', rowNum, warnings
        );
        const frequency = this.parseNumber(
          row.frequency || row.freq || 1,
          'frequency', rowNum, warnings
        );
        const q1Count = this.parseNumber(
          row.q1_count || row.q1 || row.quarter_1,
          'q1_count', rowNum, warnings
        );
        const q2Count = this.parseNumber(
          row.q2_count || row.q2 || row.quarter_2,
          'q2_count', rowNum, warnings
        );
        const q3Count = this.parseNumber(
          row.q3_count || row.q3 || row.quarter_3,
          'q3_count', rowNum, warnings
        );
        const q4Count = this.parseNumber(
          row.q4_count || row.q4 || row.quarter_4,
          'q4_count', rowNum, warnings
        );

        // Enhanced validation with specific error messages
        const rowErrors: string[] = [];
        
        if (unitCost < 0) rowErrors.push('unit_cost cannot be negative');
        if (frequency < 0) rowErrors.push('frequency cannot be negative');
        if (frequency === 0) rowErrors.push('frequency cannot be zero');
        if (q1Count < 0) rowErrors.push('q1_count cannot be negative');
        if (q2Count < 0) rowErrors.push('q2_count cannot be negative');
        if (q3Count < 0) rowErrors.push('q3_count cannot be negative');
        if (q4Count < 0) rowErrors.push('q4_count cannot be negative');
        
        // Check for unrealistic values
        if (unitCost > 1000000) rowErrors.push('unit_cost seems unrealistically high');
        if (frequency > 365) rowErrors.push('frequency seems unrealistically high (>365 per year)');
        
        // Validate quarterly applicability
        const metadata = (matchedActivity.metadata as any) || {};
        const metadataApplicable = Array.isArray(metadata.applicableQuarters)
          ? metadata.applicableQuarters
          : ['Q1', 'Q2', 'Q3', 'Q4'];

        // Allow file to provide explicit applicable_quarters (CSV/XLSX column)
        let fileApplicable: string[] | null = null;
        const rawApplicable = (row.applicable_quarters || row.applicablequarters || row.quarters || '').toString();
        if (rawApplicable && rawApplicable.trim().length > 0) {
          fileApplicable = rawApplicable
            .split(/[,;\s]+/)
            .map((s: string) => s.trim().toUpperCase())
            .filter((s: string) => ['Q1','Q2','Q3','Q4'].includes(s));
          if (fileApplicable.length === 0) {
            fileApplicable = null; // ignore invalid content
          }
        }

        // Final applicable quarters: intersect file-provided with metadata when both present
        let activityApplicableQuarters = fileApplicable
          ? metadataApplicable.filter((q: string) => fileApplicable!.includes(q))
          : metadataApplicable;

        // If intersection is empty but file specified quarters, fall back to file-provided values
        if (fileApplicable && activityApplicableQuarters.length === 0) {
          activityApplicableQuarters = fileApplicable;
          warnings.push(`Row ${rowNum}: File-provided applicable_quarters (${fileApplicable.join(', ')}) do not match metadata; using file-provided values`);
        }

        // As a final safety, if still empty, default to all quarters
        if (!activityApplicableQuarters || activityApplicableQuarters.length === 0) {
          activityApplicableQuarters = ['Q1', 'Q2', 'Q3', 'Q4'];
          warnings.push(`Row ${rowNum}: No applicable quarters determined; defaulting to Q1-Q4`);
        }
        
        // Check if user provided values for non-applicable quarters (only when we have a meaningful set)
        if (activityApplicableQuarters && activityApplicableQuarters.length > 0) {
          if (!activityApplicableQuarters.includes('Q1') && q1Count > 0) {
            rowErrors.push('Q1 count provided but activity is not applicable in Q1');
          }
          if (!activityApplicableQuarters.includes('Q2') && q2Count > 0) {
            rowErrors.push('Q2 count provided but activity is not applicable in Q2');
          }
          if (!activityApplicableQuarters.includes('Q3') && q3Count > 0) {
            rowErrors.push('Q3 count provided but activity is not applicable in Q3');
          }
          if (!activityApplicableQuarters.includes('Q4') && q4Count > 0) {
            rowErrors.push('Q4 count provided but activity is not applicable in Q4');
          }
        }
        
        if (rowErrors.length > 0) {
          errors.push(`Row ${rowNum} (${matchedActivity.name}): ${rowErrors.join(', ')}`);
          invalidRows++;
          continue;
        }

        // Enforce applicable quarters by zeroing non-applicable quarter counts
        const effectiveQ1Count = activityApplicableQuarters.includes('Q1') ? q1Count : 0;
        const effectiveQ2Count = activityApplicableQuarters.includes('Q2') ? q2Count : 0;
        const effectiveQ3Count = activityApplicableQuarters.includes('Q3') ? q3Count : 0;
        const effectiveQ4Count = activityApplicableQuarters.includes('Q4') ? q4Count : 0;

        // Calculate amounts using effective counts only for applicable quarters
        const q1Amount = frequency * unitCost * effectiveQ1Count;
        const q2Amount = frequency * unitCost * effectiveQ2Count;
        const q3Amount = frequency * unitCost * effectiveQ3Count;
        const q4Amount = frequency * unitCost * effectiveQ4Count;
        const totalBudget = q1Amount + q2Amount + q3Amount + q4Amount;

        // Store activity data in the desired transformation format
        activities[matchedActivity.id] = {
          // Category information
          category: {
            code: matchedActivity.categoryCode || 'UNKNOWN',
            name: matchedActivity.categoryName || 'Unknown Category'
          },
          
          // Activity details
          activity_name: matchedActivity.name,
          applicable_quarters: activityApplicableQuarters,
          
          // Input values
          unit_cost: unitCost,
          frequency: frequency,
          q1_count: effectiveQ1Count,
          q2_count: effectiveQ2Count,
          q3_count: effectiveQ3Count,
          q4_count: effectiveQ4Count,
          
          // Calculated amounts
          q1_amount: q1Amount,
          q2_amount: q2Amount,
          q3_amount: q3Amount,
          q4_amount: q4Amount,
          total_budget: totalBudget,
          
          // Additional information
          comments: row.comments || row.comment || row.notes || ''
        };

        validRows++;

        // Enhanced warnings for data quality
        if (totalBudget === 0) {
          warnings.push(`Row ${rowNum} (${matchedActivity.name}): Zero budget - all quarterly counts are zero`);
        }
        if (unitCost === 0 && (q1Count > 0 || q2Count > 0 || q3Count > 0 || q4Count > 0)) {
          warnings.push(`Row ${rowNum} (${matchedActivity.name}): Unit cost is zero but quantities are provided`);
        }
        if (frequency > 12) {
          warnings.push(`Row ${rowNum} (${matchedActivity.name}): High frequency (${frequency}/year) - please verify`);
        }
        if (frequency === 1 && unitCost > 100000) {
          warnings.push(`Row ${rowNum} (${matchedActivity.name}): High unit cost (${unitCost}) with low frequency - please verify`);
        }
        
        // Check for quarterly distribution patterns
        const totalCount = q1Count + q2Count + q3Count + q4Count;
        if (totalCount > 0) {
          const maxQuarter = Math.max(q1Count, q2Count, q3Count, q4Count);
          const minQuarter = Math.min(q1Count, q2Count, q3Count, q4Count);
          if (maxQuarter > minQuarter * 5) {
            warnings.push(`Row ${rowNum} (${matchedActivity.name}): Uneven quarterly distribution - verify if intentional`);
          }
        }

      } catch (error: any) {
        errors.push(`Row ${rowNum}: ${error.message}`);
        invalidRows++;
      }
    }

    // Group and summarize errors and warnings
    const errorSummary = this.groupMessages(errors);
    const warningSummary = this.groupMessages(warnings);

    // Check if we have any valid data
    if (Object.keys(activities).length === 0) {
      return {
        success: false,
        errors: [
          'No valid activities found in the file',
          ...errorSummary.summary,
          ...errors
        ],
        metadata: {
          rowCount: rows.length,
          validRows: 0,
          invalidRows: rows.length,
          fileName,
          errorSummary: errorSummary.grouped
        }
      };
    }

    return {
      success: true,
      data: {
        activities
      },
      errors: errors.length > 0 ? [...errorSummary.summary, ...errors] : undefined,
      warnings: warnings.length > 0 ? [...warningSummary.summary, ...warnings] : undefined,
      metadata: {
        rowCount: rows.length,
        validRows,
        invalidRows,
        fileName,
        errorSummary: errorSummary.grouped,
        warningSummary: warningSummary.grouped
      }
    };
  }

  /**
   * Group error/warning messages by type for better readability
   */
  private groupMessages(messages: string[]): { summary: string[], grouped: Record<string, number> } {
    const grouped: Record<string, number> = {};
    const summary: string[] = [];

    messages.forEach(message => {
      // Extract error type from message
      if (message.includes('Could not match activity')) {
        grouped['Unmatched Activities'] = (grouped['Unmatched Activities'] || 0) + 1;
      } else if (message.includes('cannot be negative')) {
        grouped['Negative Values'] = (grouped['Negative Values'] || 0) + 1;
      } else if (message.includes('Empty value')) {
        grouped['Empty Values'] = (grouped['Empty Values'] || 0) + 1;
      } else if (message.includes('Category mismatch')) {
        grouped['Category Mismatches'] = (grouped['Category Mismatches'] || 0) + 1;
      } else if (message.includes('Zero budget')) {
        grouped['Zero Budgets'] = (grouped['Zero Budgets'] || 0) + 1;
      } else {
        grouped['Other Issues'] = (grouped['Other Issues'] || 0) + 1;
      }
    });

    // Create summary messages
    Object.entries(grouped).forEach(([type, count]) => {
      summary.push(`${type}: ${count} occurrence${count > 1 ? 's' : ''}`);
    });

    return { summary, grouped };
  }

  /**
   * Helper to parse numbers from various formats with validation
   */
  private parseNumber(value: any, fieldName: string, rowNum: number, warnings: string[]): number {
    // Handle empty/null/undefined values
    if (value === null || value === undefined || value === '') {
      warnings.push(`Row ${rowNum}: Empty value for ${fieldName}, defaulting to 0`);
      return 0;
    }

    // Already a number
    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) {
        warnings.push(`Row ${rowNum}: Invalid number for ${fieldName}, defaulting to 0`);
        return 0;
      }
      return value;
    }

    // String conversion
    if (typeof value === 'string') {
      const trimmed = value.trim();
      
      // Handle empty string
      if (trimmed === '') {
        warnings.push(`Row ${rowNum}: Empty value for ${fieldName}, defaulting to 0`);
        return 0;
      }

      // Remove currency symbols, commas, and other formatting
      const cleaned = trimmed.replace(/[$,\s%]/g, '').replace(/[^\d.-]/g, '');
      
      if (cleaned === '') {
        warnings.push(`Row ${rowNum}: Non-numeric value "${value}" for ${fieldName}, defaulting to 0`);
        return 0;
      }

      const parsed = parseFloat(cleaned);
      
      if (isNaN(parsed) || !isFinite(parsed)) {
        warnings.push(`Row ${rowNum}: Invalid number "${value}" for ${fieldName}, defaulting to 0`);
        return 0;
      }

      return parsed;
    }

    warnings.push(`Row ${rowNum}: Unexpected value type for ${fieldName}, defaulting to 0`);
    return 0;
  }

  /**
   * Generate a sample template for download
   */
  generateTemplate(
    activities: Array<{ 
      id: number; 
      name: string; 
      code: string;
      categoryName?: string;
      categoryCode?: string;
      metadata?: any;
    }>,
    format: 'csv' | 'xlsx' = 'xlsx'
  ): Buffer {
    const rows = activities.map((activity, index) => {
      // Extract applicable quarters from metadata
      const applicableQuarters = activity.metadata?.applicableQuarters || ['Q1', 'Q2', 'Q3', 'Q4'];
      const quarterString = Array.isArray(applicableQuarters) 
        ? applicableQuarters.join(', ') 
        : 'Q1, Q2, Q3, Q4';

      return {
        activity_id: activity.id,
        category_name: activity.categoryName || 'General',
        category_code: activity.categoryCode || 'GEN',
        activity_name: activity.name,
        applicable_quarters: quarterString,
        unit_cost: index === 0 ? 3000 : 0,
        frequency: index === 0 ? 12 : 1,
        q1_count: index === 0 && applicableQuarters.includes('Q1') ? 1 : 0,
        q2_count: index === 0 && applicableQuarters.includes('Q2') ? 3 : 0,
        q3_count: index === 0 && applicableQuarters.includes('Q3') ? 3 : 0,
        q4_count: index === 0 && applicableQuarters.includes('Q4') ? 3 : 0,
        comments: index === 0 ? 'Example: DH Medical Dr. Salary' : ''
      };
    });

    if (format === 'csv') {
      const csv = Papa.unparse(rows);
      return Buffer.from(csv, 'utf-8');
    } else {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Planning Template');
      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }
  }
}

export const fileParserService = new FileParserService();