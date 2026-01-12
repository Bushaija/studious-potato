// import { eq, and, inArray, gte, lte } from "drizzle-orm";
// import { db } from "@/db";
// import { 
//   financialReports,
//   statementTemplates,
//   formSchemas,
//   dynamicActivities,
//   systemConfigurations,
//   configurationAuditLog,
// } from "@/db/schema";
// import { v4 as uuidv4 } from 'uuid';
// import * as crypto from 'crypto';


// interface ExportJob {
//   exportId: string;
//   status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
//   progress: {
//     current: number;
//     total: number;
//     percentage: number;
//     stage: string;
//     message?: string;
//   };
//   startedAt: string;
//   completedAt?: string;
//   estimatedTimeRemaining?: number;
//   error?: string;
//   files: Array<{
//     filename: string;
//     format: string;
//     fileSize: number;
//     recordCount: number;
//     downloadUrl: string;
//     data?: Buffer;
//   }>;
//   metadata: {
//     requestedBy: number;
//     exportType: string;
//     parameters: any;
//   };
// }

// export class BulkExportService {
//   private exportJobs = new Map<string, ExportJob>();

//   async exportSingleReport(reportId: number, params: {
//     format: string;
//     templateType?: string;
//     includeMetadata?: boolean;
//     includeValidation?: boolean;
//     includeHistory?: boolean;
//     includeComparatives?: boolean;
//     requestedBy: number;
//   }) {
//     const exportId = uuidv4();
//     const startTime = Date.now();

//     // Get the report with all relations
//     const report = await db.query.financialReports.findFirst({
//       where: eq(financialReports.id, reportId),
//       with: {
//         project: true,
//         facility: {
//           with: { district: true },
//         },
//         reportingPeriod: true,
//         creator: true,
//         submitter: true,
//         approver: true,
//       },
//     });

//     if (!report) {
//       throw new Error("Financial report not found");
//     }

//     // Generate export data based on format
//     let exportData: Buffer;
//     let contentType: string;
//     let fileExtension: string;

//     switch (params.format) {
//       case 'pdf':
//         exportData = await this.generatePDF(report, params);
//         contentType = 'application/pdf';
//         fileExtension = 'pdf';
//         break;
//       case 'excel':
//         exportData = await this.generateExcel(report, params);
//         contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
//         fileExtension = 'xlsx';
//         break;
//       case 'csv':
//         exportData = Buffer.from(await this.generateCSV(report, params));
//         contentType = 'text/csv';
//         fileExtension = 'csv';
//         break;
//       case 'json':
//         exportData = Buffer.from(JSON.stringify(this.formatReportForExport(report, params), null, 2));
//         contentType = 'application/json';
//         fileExtension = 'json';
//         break;
//       default:
//         throw new Error(`Unsupported export format: ${params.format}`);
//     }

//     const filename = `report_${report.reportCode}_${Date.now()}.${fileExtension}`;
//     const processingTime = Date.now() - startTime;
//     const checksum = crypto.createHash('sha256').update(exportData).digest('hex');

//     return {
//       exportId,
//       format: params.format,
//       filename,
//       fileSize: exportData.length,
//       downloadUrl: `/bulk/export/${exportId}/download`,
//       expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
//       metadata: {
//         recordsCount: 1,
//         generatedAt: new Date().toISOString(),
//         generatedBy: params.requestedBy,
//         processingTime,
//         checksum,
//       },
//     };
//   }

//   async initiateBulkExport(params: {
//     exportType: string;
//     format: string;
//     filters?: any;
//     includeRelations?: boolean;
//     includeInactive?: boolean;
//     compression?: boolean;
//     splitFiles?: boolean;
//     maxFileSize?: number;
//     requestedBy: number;
//   }) {
//     const exportId = uuidv4();
    
//     const exportJob: ExportJob = {
//       exportId,
//       status: 'queued',
//       progress: {
//         current: 0,
//         total: 0,
//         percentage: 0,
//         stage: 'initializing',
//       },
//       startedAt: new Date().toISOString(),
//       files: [],
//       metadata: {
//         requestedBy: params.requestedBy,
//         exportType: params.exportType,
//         parameters: params,
//       },
//     };

//     this.exportJobs.set(exportId, exportJob);

//     // Process export asynchronously
//     this.processBulkExport(exportId, params).catch(error => {
//       const job = this.exportJobs.get(exportId);
//       if (job) {
//         job.status = 'failed';
//         job.error = error.message;
//         job.completedAt = new Date().toISOString();
//       }
//     });

//     return {
//       exportId,
//       status: exportJob.status,
//       progress: exportJob.progress,
//       files: [],
//       metadata: {
//         totalRecords: 0,
//         totalFiles: 0,
//         startedAt: exportJob.startedAt,
//       },
//     };
//   }

//   async getExportStatus(exportId: string) {
//     const job = this.exportJobs.get(exportId);
//     if (!job) return null;

//     return {
//       exportId: job.exportId,
//       status: job.status,
//       progress: job.progress,
//       startedAt: job.startedAt,
//       completedAt: job.completedAt,
//       estimatedTimeRemaining: job.estimatedTimeRemaining,
//       error: job.error,
//     };
//   }

//   async downloadExport(exportId: string, fileIndex?: number) {
//     const job = this.exportJobs.get(exportId);
//     if (!job || job.status !== 'completed') return null;

//     const fileIdx = fileIndex || 0;
//     if (fileIdx >= job.files.length) return null;

//     const file = job.files[fileIdx];
//     return {
//       filename: file.filename,
//       contentType: this.getContentType(file.format),
//       fileSize: file.fileSize,
//       data: file.data!,
//     };
//   }

//   async cancelExport(exportId: string) {
//     const job = this.exportJobs.get(exportId);
//     if (!job) return false;

//     if (job.status === 'processing' || job.status === 'queued') {
//       job.status = 'cancelled';
//       job.completedAt = new Date().toISOString();
//       return true;
//     }

//     return false;
//   }

//   async initiateMigrationExport(params: {
//     sourceSystem: string;
//     targetFormat: string;
//     migrationScope: string;
//     dataMapping?: any;
//     transformationRules?: any[];
//     validateData?: boolean;
//     createBackup?: boolean;
//     requestedBy: number;
//   }) {
//     const exportId = uuidv4();
    
//     const exportJob: ExportJob = {
//       exportId,
//       status: 'queued',
//       progress: {
//         current: 0,
//         total: 0,
//         percentage: 0,
//         stage: 'preparing_migration',
//       },
//       startedAt: new Date().toISOString(),
//       files: [],
//       metadata: {
//         requestedBy: params.requestedBy,
//         exportType: 'migration',
//         parameters: params,
//       },
//     };

//     this.exportJobs.set(exportId, exportJob);

//     // Process migration export asynchronously
//     this.processMigrationExport(exportId, params).catch(error => {
//       const job = this.exportJobs.get(exportId);
//       if (job) {
//         job.status = 'failed';
//         job.error = error.message;
//         job.completedAt = new Date().toISOString();
//       }
//     });

//     return {
//       exportId,
//       status: exportJob.status,
//       progress: exportJob.progress,
//       files: [],
//       metadata: {
//         totalRecords: 0,
//         totalFiles: 0,
//         startedAt: exportJob.startedAt,
//       },
//     };
//   }

//   private async processBulkExport(exportId: string, params: any) {
//     const job = this.exportJobs.get(exportId);
//     if (!job) return;

//     job.status = 'processing';
//     job.progress.stage = 'fetching_data';

//     try {
//       let data: any[] = [];
//       let totalRecords = 0;

//       // Fetch data based on export type
//       switch (params.exportType) {
//         case 'financial_reports':
//           data = await this.fetchFinancialReports(params.filters);
//           break;
//         case 'statement_templates':
//           data = await this.fetchStatementTemplates(params.filters);
//           break;
//         case 'form_schemas':
//           data = await this.fetchFormSchemas(params.filters);
//           break;
//         case 'activities':
//           data = await this.fetchActivities(params.filters);
//           break;
//         case 'event_mappings':
//           data = await this.fetchEventMappings(params.filters);
//           break;
//         case 'system_configurations':
//           data = await this.fetchSystemConfigurations(params.filters);
//           break;
//         case 'audit_logs':
//           data = await this.fetchAuditLogs(params.filters);
//           break;
//         default:
//           throw new Error(`Unsupported export type: ${params.exportType}`);
//       }

//       totalRecords = data.length;
//       job.progress.total = totalRecords;
//       job.progress.stage = 'generating_files';

//       // Generate export files
//       const files: any[] = [];
//       const maxFileSize = params.maxFileSize || 50 * 1024 * 1024; // 50MB
      
//       if (params.splitFiles && totalRecords > 1000) {
//         // Split into multiple files
//         const chunkSize = Math.ceil(totalRecords / Math.ceil(totalRecords / 1000));
//         for (let i = 0; i < data.length; i += chunkSize) {
//           const chunk = data.slice(i, i + chunkSize);
//           const fileIndex = Math.floor(i / chunkSize) + 1;
//           const filename = `${params.exportType}_part_${fileIndex}.${params.format}`;
          
//           const fileData = await this.generateFileData(chunk, params.format, params);
          
//           files.push({
//             filename,
//             format: params.format,
//             fileSize: fileData.length,
//             recordCount: chunk.length,
//             downloadUrl: `/bulk/export/${exportId}/download?fileIndex=${files.length}`,
//             data: fileData,
//           });

//           job.progress.current = i + chunk.length;
//           job.progress.percentage = Math.round((job.progress.current / job.progress.total) * 100);
//         }
//       } else {
//         // Single file
//         const filename = `${params.exportType}_${Date.now()}.${params.format}`;
//         const fileData = await this.generateFileData(data, params.format, params);
        
//         files.push({
//           filename,
//           format: params.format,
//           fileSize: fileData.length,
//           recordCount: totalRecords,
//           downloadUrl: `/bulk/export/${exportId}/download`,
//           data: fileData,
//         });

//         job.progress.current = totalRecords;
//         job.progress.percentage = 100;
//       }

//       // Apply compression if requested
//       if (params.compression && files.length > 0) {
//         job.progress.stage = 'compressing_files';
//         // Would implement compression logic here
//       }

//       job.files = files;
//       job.status = 'completed';
//       job.completedAt = new Date().toISOString();
//       job.progress.stage = 'completed';

//     } catch (error) {
//       job.status = 'failed';
//       job.error = error instanceof Error ? error.message : 'Unknown error';
//       job.completedAt = new Date().toISOString();
//       throw error;
//     }
//   }

//   private async processMigrationExport(exportId: string, params: any) {
//     const job = this.exportJobs.get(exportId);
//     if (!job) return;

//     job.status = 'processing';
    
//     try {
//       // Create backup if requested
//       if (params.createBackup) {
//         job.progress.stage = 'creating_backup';
//         await this.createSystemBackup(exportId);
//       }

//       // Fetch all system data based on migration scope
//       job.progress.stage = 'fetching_system_data';
//       const systemData = await this.fetchSystemData(params.migrationScope);

//       // Apply data transformations
//       if (params.transformationRules) {
//         job.progress.stage = 'applying_transformations';
//         await this.applyDataTransformations(systemData, params.transformationRules);
//       }

//       // Validate data if requested
//       if (params.validateData) {
//         job.progress.stage = 'validating_data';
//         await this.validateMigrationData(systemData);
//       }

//       // Generate migration files
//       job.progress.stage = 'generating_migration_files';
//       const migrationFiles = await this.generateMigrationFiles(systemData, params);

//       job.files = migrationFiles;
//       job.status = 'completed';
//       job.completedAt = new Date().toISOString();
//       job.progress.percentage = 100;
//       job.progress.stage = 'completed';

//     } catch (error) {
//       job.status = 'failed';
//       job.error = error instanceof Error ? error.message : 'Unknown error';
//       job.completedAt = new Date().toISOString();
//       throw error;
//     }
//   }

//   private async fetchFinancialReports(filters?: any) {
//     const conditions = [];
    
//     if (filters?.dateRange) {
//       conditions.push(gte(financialReports.createdAt, new Date(filters.dateRange.startDate)));
//       conditions.push(lte(financialReports.createdAt, new Date(filters.dateRange.endDate)));
//     }
//     if (filters?.facilityIds) {
//       conditions.push(inArray(financialReports.facilityId, filters.facilityIds));
//     }
//     if (filters?.projectIds) {
//       conditions.push(inArray(financialReports.projectId, filters.projectIds));
//     }
//     if (filters?.status) {
//       conditions.push(inArray(financialReports.status, filters.status));
//     }

//     return await db.query.financialReports.findMany({
//       where: conditions.length > 0 ? and(...conditions) : undefined,
//       with: {
//         project: true,
//         facility: { with: { district: true } },
//         reportingPeriod: true,
//         creator: true,
//         submitter: true,
//         approver: true,
//       },
//     });
//   }

//   private async fetchStatementTemplates(filters?: any) {
//     const conditions = [];
//     if (filters?.statementCodes) {
//       conditions.push(inArray(statementTemplates.statementCode, filters.statementCodes));
//     }

//     return await db.query.statementTemplates.findMany({
//       where: conditions.length > 0 ? and(...conditions) : undefined,
//       with: {
//         childLines: true,
//         parentLine: true,
//       },
//     });
//   }

//   private async fetchFormSchemas(filters?: any) {
//     const conditions = [];
//     if (filters?.moduleTypes) {
//       conditions.push(inArray(formSchemas.moduleType, filters.moduleTypes));
//     }
//     if (filters?.projectTypes) {
//       conditions.push(inArray(formSchemas.projectType, filters.projectTypes));
//     }

//     return await db.query.formSchemas.findMany({
//       where: conditions.length > 0 ? and(...conditions) : undefined,
//       with: {
//         formFields: true,
//         creator: true,
//       },
//     });
//   }

//   private async fetchActivities(filters?: any) {
//     const conditions = [];
//     if (filters?.categoryIds) {
//       conditions.push(inArray(dynamicActivities.categoryId, filters.categoryIds));
//     }

//     return await db.query.dynamicActivities.findMany({
//       where: conditions.length > 0 ? and(...conditions) : undefined,
//       with: {
//         category: true,
//         eventMappings: true,
//       },
//     });
//   }

//   private async fetchEventMappings(filters?: any) {
//     return await db.query.configurableEventMappings.findMany({
//       with: {
//         event: true,
//         activity: true,
//         category: true,
//       },
//     });
//   }

//   private async fetchSystemConfigurations(filters?: any) {
//     const conditions = [];
//     if (filters?.configTypes) {
//       conditions.push(inArray(systemConfigurations.configType, filters.configTypes));
//     }

//     return await db.query.systemConfigurations.findMany({
//       where: conditions.length > 0 ? and(...conditions) : undefined,
//     });
//   }

//   private async fetchAuditLogs(filters?: any) {
//     const conditions = [];
//     if (filters?.dateRange) {
//       conditions.push(gte(configurationAuditLog.changedAt, new Date(filters.dateRange.startDate)));
//       conditions.push(lte(configurationAuditLog.changedAt, new Date(filters.dateRange.endDate)));
//     }

//     return await db.query.configurationAuditLog.findMany({
//       where: conditions.length > 0 ? and(...conditions) : undefined,
//       with: {
//         changedByUser: true,
//       },
//     });
//   }

//   private async generateFileData(data: any[], format: string, params: any): Promise<Buffer> {
//     switch (format) {
//       case 'json':
//         return Buffer.from(JSON.stringify(data, null, 2));
//       case 'csv':
//         return Buffer.from(await this.generateCSVFromArray(data));
//       case 'excel':
//         return await this.generateExcelFromArray(data, params);
//       case 'xml':
//         return Buffer.from(this.generateXML(data));
//       default:
//         throw new Error(`Unsupported format: ${format}`);
//     }
//   }

//   private async generatePDF(report: any, params: any): Promise<Buffer> {
//     // Mock PDF generation - would use library like puppeteer or pdfkit
//     const content = `
//       PDF Report: ${report.title}
//       Report Code: ${report.reportCode}
//       Facility: ${report.facility.name}
//       Generated: ${new Date().toISOString()}
      
//       ${JSON.stringify(report.reportData, null, 2)}
//     `;
//     return Buffer.from(content);
//   }

//   private async generateExcel(report: any, params: any): Promise<Buffer> {
//     // Mock Excel generation - would use library like exceljs
//     const content = `Excel Report: ${report.title}\nData: ${JSON.stringify(report.reportData)}`;
//     return Buffer.from(content);
//   }

//   private async generateCSV(report: any, params: any): Promise<string> {
//     const headers = ['Field', 'Value'];
//     const rows = [headers.join(',')];
    
//     // Add report metadata
//     rows.push(`"Title","${report.title}"`);
//     rows.push(`"Code","${report.reportCode}"`);
//     rows.push(`"Status","${report.status}"`);
//     rows.push(`"Facility","${report.facility.name}"`);
    
//     // Add report data
//     Object.entries(report.reportData || {}).forEach(([key, value]) => {
//       rows.push(`"${key}","${String(value)}"`);
//     });

//     return rows.join('\n');
//   }

//   private formatReportForExport(report: any, params: any) {
//     const exported: any = {
//       id: report.id,
//       reportCode: report.reportCode,
//       title: report.title,
//       fiscalYear: report.fiscalYear,
//       status: report.status,
//       reportData: report.reportData,
//       computedTotals: report.computedTotals,
//     };

//     if (params.includeMetadata) {
//       exported.metadata = report.metadata;
//       exported.facility = report.facility;
//       exported.project = report.project;
//       exported.reportingPeriod = report.reportingPeriod;
//     }

//     if (params.includeValidation) {
//       exported.validationResults = report.validationResults;
//     }

//     return exported;
//   }

//   private async generateCSVFromArray(data: any[]): Promise<string> {
//     if (data.length === 0) return '';

//     const headers = Object.keys(data[0]);
//     const rows = [headers.join(',')];

//     data.forEach(item => {
//       const values = headers.map(header => {
//         const value = item[header];
//         return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : String(value || '');
//       });
//       rows.push(values.join(','));
//     });

//     return rows.join('\n');
//   }

//   private async generateExcelFromArray(data: any[], params: any): Promise<Buffer> {
//     // Mock Excel generation
//     const csvContent = await this.generateCSVFromArray(data);
//     return Buffer.from(csvContent);
//   }

//   private generateXML(data: any[]): string {
//     const xmlData = data.map(item => {
//       const fields = Object.entries(item).map(([key, value]) => 
//         `<${key}>${String(value)}</${key}>`
//       ).join('');
//       return `<record>${fields}</record>`;
//     }).join('');

//     return `<?xml version="1.0" encoding="UTF-8"?><root>${xmlData}</root>`;
//   }

//   private getContentType(format: string): string {
//     const contentTypes: Record<string, string> = {
//       'pdf': 'application/pdf',
//       'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//       'csv': 'text/csv',
//       'json': 'application/json',
//       'xml': 'application/xml',
//     };
//     return contentTypes[format] || 'application/octet-stream';
//   }

//   private async fetchSystemData(scope: string) {
//     // Mock system data fetching based on scope
//     switch (scope) {
//       case 'full_system':
//         return {
//           reports: await this.fetchFinancialReports(),
//           templates: await this.fetchStatementTemplates(),
//           schemas: await this.fetchFormSchemas(),
//           activities: await this.fetchActivities(),
//           configurations: await this.fetchSystemConfigurations(),
//         };
//       case 'selective_data':
//         return {
//           reports: await this.fetchFinancialReports(),
//           templates: await this.fetchStatementTemplates(),
//         };
//       case 'configuration_only':
//         return {
//           configurations: await this.fetchSystemConfigurations(),
//           templates: await this.fetchStatementTemplates(),
//         };
//       default:
//         return {};
//     }
//   }

//   private async createSystemBackup(exportId: string) {
//     // Mock backup creation
//     console.log(`Creating system backup for export ${exportId}`);
//   }

//   private async applyDataTransformations(data: any, rules: any[]) {
//     // Mock data transformation
//     console.log('Applying data transformations:', rules);
//   }

//   private async validateMigrationData(data: any) {
//     // Mock data validation
//     console.log('Validating migration data');
//   }

//   private async generateMigrationFiles(data: any, params: any) {
//     // Mock migration file generation
//     return [{
//       filename: `migration_${Date.now()}.${params.targetFormat}`,
//       format: params.targetFormat,
//       fileSize: 1024,
//       recordCount: Object.keys(data).length,
//       downloadUrl: '/mock/download',
//       data: Buffer.from(JSON.stringify(data, null, 2)),
//     }];
//   }
// }

// export const bulkExportService = new BulkExportService();


import { eq, and, inArray, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { 
  financialReports,
  statementTemplates,
  formSchemas,
  configurationAuditLog,
} from "@/db/schema";
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';


interface ExportJob {
  exportId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    current: number;
    total: number;
    percentage: number;
    stage: string;
    message?: string;
  };
  startedAt: string;
  completedAt?: string;
  estimatedTimeRemaining?: number;
  error?: string;
  files: Array<{
    filename: string;
    format: string;
    fileSize: number;
    recordCount: number;
    downloadUrl: string;
    data?: Buffer;
    contentType: string;
  }>;
  metadata: {
    requestedBy: number;
    exportType: string;
    parameters: any;
  };
}

export class BulkExportService {
  private exportJobs = new Map<string, ExportJob>();

  async exportSingleReport(reportId: number, params: {
    format: string;
    templateType?: string;
    includeMetadata?: boolean;
    includeValidation?: boolean;
    includeHistory?: boolean;
    includeComparatives?: boolean;
    requestedBy: number;
  }) {
    const exportId = uuidv4();
    const startTime = Date.now();

    // Get the report with all relations
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId),
      with: {
        project: true,
        facility: {
          with: { district: true },
        },
        reportingPeriod: true,
        creator: true,
        submitter: true,
        approver: true,
      },
    });

    if (!report) {
      throw new Error("Financial report not found");
    }

    // Generate export data based on format
    let exportData: Buffer;
    let contentType: string;
    let fileExtension: string;

    switch (params.format) {
      case 'pdf':
        exportData = await this.generatePDF(report, params);
        contentType = 'application/pdf';
        fileExtension = 'pdf';
        break;
      case 'excel':
        exportData = await this.generateExcel(report, params);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileExtension = 'xlsx';
        break;
      case 'csv':
        exportData = Buffer.from(await this.generateCSV(report, params));
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;
      case 'json':
        exportData = Buffer.from(JSON.stringify(this.formatReportForExport(report, params), null, 2));
        contentType = 'application/json';
        fileExtension = 'json';
        break;
      case 'xml':
        exportData = Buffer.from(this.generateXML([this.formatReportForExport(report, params)]));
        contentType = 'application/xml';
        fileExtension = 'xml';
        break;
      default:
        throw new Error(`Unsupported export format: ${params.format}`);
    }

    const filename = `report_${report.reportCode}_${Date.now()}.${fileExtension}`;
    const processingTime = Date.now() - startTime;
    const checksum = crypto.createHash('sha256').update(exportData).digest('hex');

    // Store the export temporarily (in production, would use cloud storage)
    const tempExportJob: ExportJob = {
      exportId,
      status: 'completed',
      progress: { current: 1, total: 1, percentage: 100, stage: 'completed' },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      files: [{
        filename,
        format: params.format,
        fileSize: exportData.length,
        recordCount: 1,
        downloadUrl: `/bulk/export/${exportId}/download`,
        data: exportData,
        contentType,
      }],
      metadata: {
        requestedBy: params.requestedBy,
        exportType: 'single_report',
        parameters: params,
      },
    };

    this.exportJobs.set(exportId, tempExportJob);

    return {
      exportId,
      format: params.format,
      filename,
      fileSize: exportData.length,
      downloadUrl: `/bulk/export/${exportId}/download`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      metadata: {
        recordsCount: 1,
        generatedAt: new Date().toISOString(),
        generatedBy: params.requestedBy,
        processingTime,
        checksum,
      },
    };
  }

  async initiateBulkExport(params: {
    exportType: string;
    format: string;
    filters?: any;
    includeRelations?: boolean;
    includeInactive?: boolean;
    compression?: boolean;
    splitFiles?: boolean;
    maxFileSize?: number;
    requestedBy: number;
  }) {
    const exportId = uuidv4();
    
    const exportJob: ExportJob = {
      exportId,
      status: 'queued',
      progress: {
        current: 0,
        total: 0,
        percentage: 0,
        stage: 'initializing',
      },
      startedAt: new Date().toISOString(),
      files: [],
      metadata: {
        requestedBy: params.requestedBy,
        exportType: params.exportType,
        parameters: params,
      },
    };

    this.exportJobs.set(exportId, exportJob);

    // Process export asynchronously
    this.processBulkExport(exportId, params).catch(error => {
      const job = this.exportJobs.get(exportId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date().toISOString();
      }
    });

    return {
      exportId,
      status: exportJob.status,
      progress: exportJob.progress,
      files: [],
      metadata: {
        totalRecords: 0,
        totalFiles: 0,
        startedAt: exportJob.startedAt,
      },
    };
  }

  async getExportStatus(exportId: string) {
    const job = this.exportJobs.get(exportId);
    if (!job) return null;

    return {
      exportId: job.exportId,
      status: job.status,
      progress: job.progress,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      estimatedTimeRemaining: job.estimatedTimeRemaining,
      error: job.error,
    };
  }

  async downloadExport(exportId: string, fileIndex?: number) {
    const job = this.exportJobs.get(exportId);
    if (!job || job.status !== 'completed') return null;

    const fileIdx = fileIndex || 0;
    if (fileIdx >= job.files.length) return null;

    const file = job.files[fileIdx];
    return {
      filename: file.filename,
      contentType: file.contentType,
      fileSize: file.fileSize,
      data: file.data!,
    };
  }

  async cancelExport(exportId: string): Promise<{ found: boolean; cancelled: boolean }> {
    const job = this.exportJobs.get(exportId);
    if (!job) return { found: false, cancelled: false };

    if (job.status === 'processing' || job.status === 'queued') {
      job.status = 'cancelled';
      job.completedAt = new Date().toISOString();
      return { found: true, cancelled: true };
    }

    return { found: true, cancelled: false };
  }

  async initiateMigrationExport(params: {
    sourceSystem: string;
    targetFormat: string;
    migrationScope: string;
    dataMapping?: any;
    transformationRules?: any[];
    validateData?: boolean;
    createBackup?: boolean;
    requestedBy: number;
  }) {
    const exportId = uuidv4();
    
    const exportJob: ExportJob = {
      exportId,
      status: 'queued',
      progress: {
        current: 0,
        total: 0,
        percentage: 0,
        stage: 'preparing_migration',
      },
      startedAt: new Date().toISOString(),
      files: [],
      metadata: {
        requestedBy: params.requestedBy,
        exportType: 'migration',
        parameters: params,
      },
    };

    this.exportJobs.set(exportId, exportJob);

    // Process migration export asynchronously
    this.processMigrationExport(exportId, params).catch(error => {
      const job = this.exportJobs.get(exportId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date().toISOString();
      }
    });

    return {
      exportId,
      status: exportJob.status,
      progress: exportJob.progress,
      files: [],
      metadata: {
        totalRecords: 0,
        totalFiles: 0,
        startedAt: exportJob.startedAt,
      },
    };
  }

  private async processBulkExport(exportId: string, params: any) {
    const job = this.exportJobs.get(exportId);
    if (!job) return;

    job.status = 'processing';
    job.progress.stage = 'fetching_data';

    try {
      let data: any[] = [];
      
      // Fetch data based on export type
      switch (params.exportType) {
        case 'financial_reports':
          data = await this.fetchFinancialReports(params.filters);
          break;
        case 'statement_templates':
          data = await this.fetchStatementTemplates(params.filters);
          break;
        case 'form_schemas':
          data = await this.fetchFormSchemas(params.filters);
          break;
        case 'activities':
          data = await this.fetchActivities(params.filters);
          break;
        case 'event_mappings':
          data = await this.fetchEventMappings(params.filters);
          break;
        case 'system_configurations':
          data = await this.fetchSystemConfigurations(params.filters);
          break;
        case 'audit_logs':
          data = await this.fetchAuditLogs(params.filters);
          break;
        default:
          throw new Error(`Unsupported export type: ${params.exportType}`);
      }

      const totalRecords = data.length;
      job.progress.total = totalRecords;
      job.progress.stage = 'generating_files';

      // Generate export files
      const files: any[] = [];
      const maxFileSize = params.maxFileSize || 50 * 1024 * 1024; // 50MB
      
      if (params.splitFiles && totalRecords > 1000) {
        // Split into multiple files
        const chunkSize = Math.ceil(totalRecords / Math.ceil(totalRecords / 1000));
        for (let i = 0; i < data.length; i += chunkSize) {
          const chunk = data.slice(i, i + chunkSize);
          const fileIndex = Math.floor(i / chunkSize) + 1;
          const filename = `${params.exportType}_part_${fileIndex}.${params.format}`;
          
          const fileData = await this.generateFileData(chunk, params.format, params);
          const contentType = this.getContentType(params.format);
          
          files.push({
            filename,
            format: params.format,
            fileSize: fileData.length,
            recordCount: chunk.length,
            downloadUrl: `/bulk/export/${exportId}/download?fileIndex=${files.length}`,
            data: fileData,
            contentType,
          });

          job.progress.current = i + chunk.length;
          job.progress.percentage = Math.round((job.progress.current / job.progress.total) * 100);
        }
      } else {
        // Single file
        const filename = `${params.exportType}_${Date.now()}.${params.format}`;
        const fileData = await this.generateFileData(data, params.format, params);
        const contentType = this.getContentType(params.format);
        
        files.push({
          filename,
          format: params.format,
          fileSize: fileData.length,
          recordCount: totalRecords,
          downloadUrl: `/bulk/export/${exportId}/download`,
          data: fileData,
          contentType,
        });

        job.progress.current = totalRecords;
        job.progress.percentage = 100;
      }

      job.files = files;
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.progress.stage = 'completed';

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date().toISOString();
      throw error;
    }
  }

  private async processMigrationExport(exportId: string, params: any) {
    const job = this.exportJobs.get(exportId);
    if (!job) return;

    job.status = 'processing';
    
    try {
      // Create backup if requested
      if (params.createBackup) {
        job.progress.stage = 'creating_backup';
        await this.createSystemBackup(exportId);
      }

      // Fetch all system data based on migration scope
      job.progress.stage = 'fetching_system_data';
      const systemData = await this.fetchSystemData(params.migrationScope);

      // Generate migration files
      job.progress.stage = 'generating_migration_files';
      const migrationFiles = await this.generateMigrationFiles(systemData, params);

      job.files = migrationFiles;
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.progress.percentage = 100;
      job.progress.stage = 'completed';

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date().toISOString();
      throw error;
    }
  }

  // Data fetching methods
  private async fetchFinancialReports(filters?: any) {
    const conditions = [];
    
    if (filters?.dateRange) {
      conditions.push(gte(financialReports.createdAt, new Date(filters.dateRange.startDate)));
      conditions.push(lte(financialReports.createdAt, new Date(filters.dateRange.endDate)));
    }
    if (filters?.facilityIds) {
      conditions.push(inArray(financialReports.facilityId, filters.facilityIds));
    }
    if (filters?.projectIds) {
      conditions.push(inArray(financialReports.projectId, filters.projectIds));
    }
    if (filters?.status) {
      conditions.push(inArray(financialReports.status, filters.status));
    }

    return await db.query.financialReports.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        project: true,
        facility: { with: { district: true } },
        reportingPeriod: true,
        creator: true,
      },
    });
  }

  private async fetchStatementTemplates(filters?: any) {
    const conditions = [];
    if (filters?.statementCodes) {
      conditions.push(inArray(statementTemplates.statementCode, filters.statementCodes));
    }

    return await db.query.statementTemplates.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        childLines: true,
        parentLine: true,
      },
    });
  }

  private async fetchFormSchemas(filters?: any) {
    const conditions = [];
    if (filters?.moduleTypes) {
      conditions.push(inArray(formSchemas.moduleType, filters.moduleTypes));
    }

    return await db.query.formSchemas.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        formFields: true,
        creator: true,
      },
    });
  }

  private async fetchActivities(filters?: any) {
    return await db.query.dynamicActivities.findMany({
      with: {
        category: true,
        eventMappings: true,
      },
    });
  }

  private async fetchEventMappings(filters?: any) {
    return await db.query.configurableEventMappings.findMany({
      with: {
        event: true,
        activity: true,
        category: true,
      },
    });
  }

  private async fetchSystemConfigurations(filters?: any) {
    return await db.query.systemConfigurations.findMany();
  }

  private async fetchAuditLogs(filters?: any) {
    const conditions = [];
    if (filters?.dateRange) {
      conditions.push(gte(configurationAuditLog.changedAt, new Date(filters.dateRange.startDate)));
      conditions.push(lte(configurationAuditLog.changedAt, new Date(filters.dateRange.endDate)));
    }

    return await db.query.configurationAuditLog.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        changedByUser: true,
      },
    });
  }

  // File generation methods
  private async generateFileData(data: any[], format: string, params: any): Promise<Buffer> {
    switch (format) {
      case 'json':
        return Buffer.from(JSON.stringify(data, null, 2));
      case 'csv':
        return Buffer.from(await this.generateCSVFromArray(data));
      case 'excel':
        return await this.generateExcelFromArray(data, params);
      case 'xml':
        return Buffer.from(this.generateXML(data));
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private async generatePDF(report: any, params: any): Promise<Buffer> {
    // Mock PDF generation - would use library like puppeteer or pdfkit
    const content = `
      PDF Report: ${report.title}
      Report Code: ${report.reportCode}
      Facility: ${report.facility.name}
      Generated: ${new Date().toISOString()}
      
      ${JSON.stringify(report.reportData, null, 2)}
    `;
    return Buffer.from(content);
  }

  private async generateExcel(report: any, params: any): Promise<Buffer> {
    // Mock Excel generation - would use library like exceljs
    const csvContent = await this.generateCSV(report, params);
    return Buffer.from(csvContent);
  }

  private async generateCSV(report: any, params: any): Promise<string> {
    const headers = ['Field', 'Value'];
    const rows = [headers.join(',')];
    
    // Add report metadata
    rows.push(`"Title","${report.title}"`);
    rows.push(`"Code","${report.reportCode}"`);
    rows.push(`"Status","${report.status}"`);
    rows.push(`"Facility","${report.facility.name}"`);
    
    // Add report data
    Object.entries(report.reportData || {}).forEach(([key, value]) => {
      rows.push(`"${key}","${String(value)}"`);
    });

    return rows.join('\n');
  }

  private formatReportForExport(report: any, params: any) {
    const exported: any = {
      id: report.id,
      reportCode: report.reportCode,
      title: report.title,
      fiscalYear: report.fiscalYear,
      status: report.status,
      reportData: report.reportData,
      computedTotals: report.computedTotals,
    };

    if (params.includeMetadata) {
      exported.metadata = report.metadata;
      exported.facility = report.facility;
      exported.project = report.project;
      exported.reportingPeriod = report.reportingPeriod;
    }

    if (params.includeValidation) {
      exported.validationResults = report.validationResults;
    }

    return exported;
  }

  private async generateCSVFromArray(data: any[]): Promise<string> {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = [headers.join(',')];

    data.forEach(item => {
      const values = headers.map(header => {
        const value = item[header];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        return stringValue.includes(',') || stringValue.includes('"') 
          ? `"${stringValue.replace(/"/g, '""')}"` 
          : stringValue;
      });
      rows.push(values.join(','));
    });

    return rows.join('\n');
  }

  private async generateExcelFromArray(data: any[], params: any): Promise<Buffer> {
    // Mock Excel generation - in production would use exceljs
    const csvContent = await this.generateCSVFromArray(data);
    return Buffer.from(csvContent);
  }

  private generateXML(data: any[]): string {
    const xmlData = data.map(item => {
      const fields = Object.entries(item).map(([key, value]) => 
        `<${key}>${this.escapeXml(String(value || ''))}</${key}>`
      ).join('');
      return `<record>${fields}</record>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?><root>${xmlData}</root>`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private getContentType(format: string): string {
    const contentTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'csv': 'text/csv',
      'json': 'application/json',
      'xml': 'application/xml',
    };
    return contentTypes[format] || 'application/octet-stream';
  }

  private async fetchSystemData(scope: string) {
    // Mock system data fetching based on scope
    switch (scope) {
      case 'full_system':
        return {
          reports: await this.fetchFinancialReports(),
          templates: await this.fetchStatementTemplates(),
          schemas: await this.fetchFormSchemas(),
          activities: await this.fetchActivities(),
          configurations: await this.fetchSystemConfigurations(),
        };
      case 'selective_data':
        return {
          reports: await this.fetchFinancialReports(),
          templates: await this.fetchStatementTemplates(),
        };
      case 'configuration_only':
        return {
          configurations: await this.fetchSystemConfigurations(),
          templates: await this.fetchStatementTemplates(),
        };
      default:
        return {};
    }
  }

  private async createSystemBackup(exportId: string) {
    // Mock backup creation
    console.log(`Creating system backup for export ${exportId}`);
  }

  private async generateMigrationFiles(data: any, params: any) {
    // Mock migration file generation
    const fileData = Buffer.from(JSON.stringify(data, null, 2));
    const contentType = this.getContentType(params.targetFormat);
    
    return [{
      filename: `migration_${Date.now()}.${params.targetFormat}`,
      format: params.targetFormat,
      fileSize: fileData.length,
      recordCount: Object.keys(data).reduce((count, key) => count + (Array.isArray(data[key]) ? data[key].length : 1), 0),
      downloadUrl: '/bulk/migration/download',
      data: fileData,
      contentType,
    }];
  }
}

export const bulkExportService = new BulkExportService();
