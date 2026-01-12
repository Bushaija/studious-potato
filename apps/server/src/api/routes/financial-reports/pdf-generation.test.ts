import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { pdfGenerationService } from './pdf-generation.service';
import type { FinancialReport } from './financial-reports.types';

describe('PdfGenerationService', () => {
  const testPdfDirectory = path.join(process.cwd(), 'public', 'reports', 'pdfs');

  beforeAll(async () => {
    // Ensure test directory exists
    await fs.mkdir(testPdfDirectory, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test PDFs
    try {
      const files = await fs.readdir(testPdfDirectory);
      for (const file of files) {
        if (file.startsWith('financial-report-')) {
          await fs.unlink(path.join(testPdfDirectory, file));
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should generate a PDF buffer from a financial report', async () => {
    const mockReport: FinancialReport = {
      id: 1,
      reportCode: 'FR-2024-001',
      title: 'Test Financial Report',
      projectId: 1,
      facilityId: 1,
      reportingPeriodId: 1,
      version: '1.0',
      fiscalYear: '2024',
      status: 'fully_approved',
      reportData: { revenue: 100000, expenses: 75000 },
      metadata: null,
      computedTotals: { netIncome: 25000 },
      validationResults: null,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedBy: 1,
      updatedAt: new Date().toISOString(),
      submittedBy: 1,
      submittedAt: new Date().toISOString(),
      approvedBy: null,
      approvedAt: null,
      dafId: 2,
      dafApprovedAt: new Date().toISOString(),
      dafComment: 'Approved by DAF',
      dgId: 3,
      dgApprovedAt: new Date().toISOString(),
      dgComment: 'Final approval by DG',
      finalPdfUrl: null,
      locked: true,
    };

    const pdfBuffer = await pdfGenerationService.generateFinancialReportPdf(mockReport);

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    
    // Verify PDF header
    const pdfHeader = pdfBuffer.toString('utf8', 0, 5);
    expect(pdfHeader).toBe('%PDF-');
  });

  it('should save PDF buffer to file and return URL', async () => {
    const mockBuffer = Buffer.from('test pdf content');
    const filename = 'test-report-123.pdf';

    const pdfUrl = await pdfGenerationService.savePdf(mockBuffer, filename);

    expect(pdfUrl).toBe('/reports/pdfs/test-report-123.pdf');

    // Verify file exists
    const filePath = path.join(testPdfDirectory, filename);
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);

    // Clean up
    await fs.unlink(filePath);
  });

  it('should generate a unique filename', async () => {
    const filename1 = pdfGenerationService.generateFilename(1);
    
    // Add small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const filename2 = pdfGenerationService.generateFilename(1);

    expect(filename1).toMatch(/^financial-report-1-\d+\.pdf$/);
    expect(filename2).toMatch(/^financial-report-1-\d+\.pdf$/);
    expect(filename1).not.toBe(filename2);
  });

  it('should generate and save PDF in one operation', async () => {
    const mockReport: FinancialReport = {
      id: 999,
      reportCode: 'FR-2024-999',
      title: 'Integration Test Report',
      projectId: 1,
      facilityId: 1,
      reportingPeriodId: 1,
      version: '1.0',
      fiscalYear: '2024',
      status: 'fully_approved',
      reportData: { revenue: 50000 },
      metadata: null,
      computedTotals: null,
      validationResults: null,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedBy: 1,
      updatedAt: new Date().toISOString(),
      submittedBy: 1,
      submittedAt: new Date().toISOString(),
      approvedBy: null,
      approvedAt: null,
      dafId: 2,
      dafApprovedAt: new Date().toISOString(),
      dafComment: null,
      dgId: 3,
      dgApprovedAt: new Date().toISOString(),
      dgComment: null,
      finalPdfUrl: null,
      locked: true,
    };

    const pdfUrl = await pdfGenerationService.generateAndSavePdf(mockReport);

    expect(pdfUrl).toMatch(/^\/reports\/pdfs\/financial-report-999-\d+\.pdf$/);

    // Verify file exists
    const filename = pdfUrl.split('/').pop()!;
    const filePath = path.join(testPdfDirectory, filename);
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);

    // Verify file has content
    const stats = await fs.stat(filePath);
    expect(stats.size).toBeGreaterThan(0);
  });
});
