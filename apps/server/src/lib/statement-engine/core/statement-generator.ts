import { Database } from "@/db";
import { statementTemplates, projects, facilities, reportingPeriods } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { DataCollectionService, FilterCriteria, EventSummary } from "../../../api/routes/financial-reports/data-collection.service";
import { StatementFormulaEngine } from "./formula-engine";
import { StatementLineProcessor } from "./line-processor";
import { StatementValidator } from "./validator";

export interface StatementContext {
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  fiscalYear: string;
  projectType?: string;
  facilityType?: string;
  includeComparatives?: boolean;
  customMappings?: Record<string, any>;
  generateFromPlanning?: boolean;
  generateFromExecution?: boolean;
}

export interface StatementOutput {
  statementCode: string;
  statementName: string;
  generatedDate: Date;
  reportingPeriod: {
    year: number;
    type: string;
    startDate: Date;
    endDate: Date;
  };
  lines: StatementLine[];
  totals: StatementTotals;
  metadata: StatementMetadata;
  validationResults: ValidationResults;
}

export interface StatementLine {
  id: number;
  lineCode: string;
  lineItem: string;
  level: number;
  parentLineId?: number;
  displayOrder: number;
  currentValue: number;
  priorValue?: number;
  isTotalLine: boolean;
  isSubtotalLine: boolean;
  formatRules: Record<string, any>;
  displayConditions: Record<string, any>;
  children?: StatementLine[];
  noteNumber?: number;
}

export interface StatementTotals {
  totalRevenue: number;
  totalExpenses: number;
  netSurplusDeficit: number;
  totalAssets: number;
  totalLiabilities: number;
  netAssets: number;
  [key: string]: number;
}

export interface StatementMetadata {
  statementType: string;
  currency: string;
  generatedBy: number;
  facility: {
    name: string;
    type: string;
    district?: string;
  };
  project: {
    name: string;
    code: string;
    type: string;
  };
  dataSources: string[];
  templateVersion: string;
}

export interface ValidationResults {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  accountingEquation: {
    isValid: boolean;
    leftSide: number;
    rightSide: number;
    difference: number;
  };
  completeness: {
    isValid: boolean;
    completionPercentage: number;
    missingFields: string[];
  };
  businessRules: {
    isValid: boolean;
    violations: Array<{
      rule: string;
      field: string;
      message: string;
    }>;
  };
}

export class StatementGeneratorEngine {
  constructor(
    private db: Database,
    private dataCollectionService: DataCollectionService,
    private lineProcessor: StatementLineProcessor,
    private validator: StatementValidator
  ) {}

  /**
   * Generate a complete financial statement
   */
  async generateStatement(
    statementCode: string,
    context: StatementContext
  ): Promise<StatementOutput> {
    console.log(`🏗️ Generating ${statementCode} statement for project ${context.projectId}`);
    console.log(`   Context:`, {
      projectId: context.projectId,
      facilityId: context.facilityId,
      reportingPeriodId: context.reportingPeriodId,
      projectType: context.projectType,
      facilityType: context.facilityType,
      generateFromPlanning: context.generateFromPlanning,
      generateFromExecution: context.generateFromExecution,
    });

    // 1. Load statement template
    const template = await this.loadStatementTemplate(statementCode);
    if (!template) {
      throw new Error(`Statement template not found: ${statementCode}`);
    }

    // 2. Load contextual entities (project, facility with district, reporting period)
    const [project, facility, period] = await Promise.all([
      this.db.query.projects.findFirst({ where: eq(projects.id, context.projectId) }),
      this.db.query.facilities.findFirst({ where: eq(facilities.id, context.facilityId), with: { district: true } }),
      this.db.query.reportingPeriods.findFirst({ where: eq(reportingPeriods.id, context.reportingPeriodId) }),
    ]);

    // 2b. Collect and aggregate data
    const eventData = await this.collectEventData(context);
    console.log(`📊 Collected ${eventData.length} events`);
    if (eventData.length === 0) {
      console.log(`   ⚠️ No event data found for filters. This will lead to 0 values.`);
    } else {
      const sample = eventData.slice(0, 5).map(e => ({ code: e.eventCode, total: e.totalAmount }));
      console.log(`   Sample event totals:`, sample);
    }

    // 3. Generate statement lines
    const lines = await this.generateStatementLines(template, eventData, context);
    console.log(`📋 Generated ${lines.length} statement lines`);
    const nonZero = lines.filter(l => l.currentValue !== 0).length;
    console.log(`   Non-zero lines: ${nonZero}`);

    // 4. Calculate totals
    const totals = this.calculateStatementTotals(lines, statementCode);

    // 5. Validate statement
    const validationResults = await this.validateStatement(lines, totals, statementCode);

    // 6. Build metadata
    const metadata = await this.buildStatementMetadata(template, context, {
      project,
      facility,
    });

    return {
      statementCode,
      statementName: template.statementName,
      generatedDate: new Date(),
      reportingPeriod: period
        ? {
            year: Number(period.year),
            type: String(period.periodType || 'ANNUAL'),
            // These are dates in DB (date type); cast to Date
            startDate: new Date(String(period.startDate)),
            endDate: new Date(String(period.endDate)),
          }
        : {
            year: context.fiscalYear ? parseInt(String(context.fiscalYear).split('/')[0]) : new Date().getFullYear(),
            type: 'ANNUAL',
            startDate: new Date(),
            endDate: new Date(),
          },
      lines,
      totals,
      metadata,
      validationResults,
    };
  }

  /**
   * Load statement template with all line items
   */
  private async loadStatementTemplate(statementCode: string) {
    const templates = await this.db.query.statementTemplates.findMany({
      where: and(
        eq(statementTemplates.statementCode, statementCode),
        eq(statementTemplates.isActive, true)
      ),
      orderBy: [statementTemplates.displayOrder],
    });

    if (templates.length === 0) {
      return null;
    }

    // Get the first template to extract statement metadata
    const firstTemplate = templates[0];
    
    return {
      statementCode: firstTemplate.statementCode,
      statementName: firstTemplate.statementName,
      columns: firstTemplate.columns || [],
      validationRules: firstTemplate.validationRules || [],
      statementMetadata: firstTemplate.statementMetadata || {},
      lines: templates,
    };
  }

  /**
   * Collect and aggregate event data using data collection service
   */
  private async collectEventData(context: StatementContext): Promise<EventSummary[]> {
    const filters: FilterCriteria = {
      projectId: context.projectId,
      facilityId: context.facilityId,
      reportingPeriodId: context.reportingPeriodId,
      projectType: context.projectType,
      facilityType: context.facilityType,
      entityTypes: []
    };

    if (context.generateFromPlanning) {
      filters.entityTypes!.push('planning');
    }
    if (context.generateFromExecution) {
      filters.entityTypes!.push('execution');
    }

    const dataSummary = await this.dataCollectionService.getDataCollectionSummary(filters);
    return dataSummary.eventSummaries;
  }

  /**
   * Generate statement lines using line processor
   */
  private async generateStatementLines(
    template: any,
    eventData: EventSummary[],
    context: StatementContext
  ): Promise<StatementLine[]> {
    // Build lookup that supports both event codes and numeric IDs
    const eventLookup = new Map<any, any>();
    for (const event of eventData) {
      eventLookup.set(event.eventCode, event);
      // Also index by numeric id and stringified id to handle DB templates storing event IDs
      if ((event as any).eventId != null) {
        eventLookup.set((event as any).eventId, event);
        eventLookup.set(String((event as any).eventId), event);
      }
    }

    const lines: StatementLine[] = [];
    const lineValues = new Map<string, number>();

    // Process lines in display order
    for (const lineTemplate of template.lines) {
      try {
        const line = await this.lineProcessor.processLine(
          lineTemplate,
          eventLookup,
          lineValues,
          context
        );
        
        lines.push(line);
        
        // Store computed value for formula references
        if (line.lineCode) {
          lineValues.set(line.lineCode, line.currentValue);
        }
      } catch (error) {
        console.error(`Error processing line ${lineTemplate.lineItem}:`, error);
        // Add error line to maintain structure
        lines.push({
          id: lineTemplate.id,
          lineCode: lineTemplate.lineCode || `ERROR_${lineTemplate.id}`,
          lineItem: `${lineTemplate.lineItem} (ERROR)`,
          level: lineTemplate.level || 1,
          parentLineId: lineTemplate.parentLineId,
          displayOrder: lineTemplate.displayOrder,
          currentValue: 0,
          isTotalLine: lineTemplate.isTotalLine || false,
          isSubtotalLine: lineTemplate.isSubtotalLine || false,
          formatRules: lineTemplate.formatRules || {},
          displayConditions: lineTemplate.displayConditions || {},
          noteNumber: lineTemplate.noteNumber,
        });
      }
    }

    // Build hierarchical structure
    return this.buildHierarchicalStructure(lines);
  }

  /**
   * Build parent-child relationships for statement lines
   */
  private buildHierarchicalStructure(lines: StatementLine[]): StatementLine[] {
    const lineMap = new Map(lines.map(line => [line.id, line]));
    const rootLines: StatementLine[] = [];

    for (const line of lines) {
      if (line.parentLineId) {
        const parent = lineMap.get(line.parentLineId);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(line);
        }
      } else {
        rootLines.push(line);
      }
    }

    return rootLines;
  }

  /**
   * Calculate statement totals based on statement type
   */
  private calculateStatementTotals(lines: StatementLine[], statementCode: string): StatementTotals {
    const totals: StatementTotals = {
      totalRevenue: 0,
      totalExpenses: 0,
      netSurplusDeficit: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      netAssets: 0,
    };

    // Calculate totals based on statement type
    switch (statementCode) {
      case 'REV_EXP':
        // Attempt to read totals via explicit total lines
        totals.totalRevenue = this.getTotalByLineCode(lines, 'TOTAL_REVENUE');
        totals.totalExpenses = this.getTotalByLineCode(lines, 'TOTAL_EXPENSES');
        // Fallbacks if total lines are zero or missing
        if (!totals.totalExpenses) {
          totals.totalExpenses = this.sumBySection(lines, ['COMPENSATION_EMPLOYEES','GOODS_SERVICES','GRANTS_TRANSFERS','SUBSIDIES','SOCIAL_ASSISTANCE','FINANCE_COSTS','ACQUISITION_FIXED_ASSETS','REPAYMENT_BORROWINGS','OTHER_EXPENSES']);
        }
        if (!totals.totalRevenue) {
          totals.totalRevenue = this.sumBySection(lines, ['TAX_REVENUE','GRANTS','TRANSFERS_CENTRAL','TRANSFERS_PUBLIC','FINES_PENALTIES','PROPERTY_INCOME','SALES_GOODS_SERVICES','SALE_CAPITAL_ITEMS','OTHER_REVENUE','DOMESTIC_BORROWINGS','EXTERNAL_BORROWINGS']);
        }
        totals.netSurplusDeficit = totals.totalRevenue - totals.totalExpenses;
        break;
      
      case 'ASSETS_LIAB':
        totals.totalAssets = this.getTotalByLineCode(lines, 'TOTAL_ASSETS');
        totals.totalLiabilities = this.getTotalByLineCode(lines, 'TOTAL_LIABILITIES');
        totals.netAssets = totals.totalAssets - totals.totalLiabilities;
        break;
      
      case 'CASH_FLOW':
        // Cash flow specific totals
        break;
    }

    return totals;
  }

  /**
   * Get total value by line code
   */
  private getTotalByLineCode(lines: StatementLine[], lineCode: string): number {
    const findLine = (lines: StatementLine[]): StatementLine | null => {
      for (const line of lines) {
        if (line.lineCode === lineCode) {
          return line;
        }
        if (line.children) {
          const found = findLine(line.children);
          if (found) return found;
        }
      }
      return null;
    };

    const line = findLine(lines);
    return line ? line.currentValue : 0;
  }

  /**
   * Sum currentValue for a set of line codes.
   */
  private sumBySection(lines: StatementLine[], codes: string[]): number {
    const targets = new Set(codes);
    let sum = 0;
    const visit = (arr: StatementLine[]) => {
      for (const l of arr) {
        if (targets.has(l.lineCode)) sum += l.currentValue || 0;
        if (l.children) visit(l.children);
      }
    };
    visit(lines);
    return sum;
  }

  /**
   * Validate the generated statement
   */
  private async validateStatement(
    lines: StatementLine[],
    totals: StatementTotals,
    statementCode: string
  ): Promise<ValidationResults> {
    return await this.validator.validateStatement(lines, totals, statementCode);
  }

  /**
   * Build statement metadata
   */
  private async buildStatementMetadata(
    template: any,
    context: StatementContext,
    extras: { project: any | null; facility: any | null }
  ): Promise<StatementMetadata> {
    const proj = extras.project;
    const fac = extras.facility;

    return {
      statementType: template.statementCode,
      currency: 'FRW',
      generatedBy: 1,
      facility: {
        name: fac?.name ?? 'Unknown Facility',
        type: String(fac?.facilityType ?? context.facilityType ?? ''),
        district: fac?.district?.name ?? undefined,
      },
      project: {
        name: proj?.name ?? 'Unknown Project',
        code: proj?.code ?? '',
        type: String(proj?.projectType ?? context.projectType ?? ''),
      },
      dataSources:
        context.generateFromPlanning && context.generateFromExecution
          ? ['planning', 'execution']
          : context.generateFromPlanning
          ? ['planning']
          : ['execution'],
      templateVersion: '1.0',
    };
  }
}