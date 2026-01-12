import PDFDocument from 'pdfkit';
import { promises as fs } from 'fs';
import path from 'path';
import type { FinancialReport } from './financial-reports.types';

/**
 * Service class for generating PDF snapshots of financial reports
 * Requirements: 3.4, 3.5, 10.1-10.5
 */
export class PdfGenerationService {
  private readonly pdfDirectory: string;

  constructor() {
    // Store PDFs in public/reports/pdfs directory
    this.pdfDirectory = path.join(process.cwd(), 'public', 'reports', 'pdfs');
  }

  /**
   * Generates a PDF snapshot of a financial report with approval metadata
   * Requirements: 10.1, 10.4
   */
  async generateFinancialReportPdf(report: FinancialReport): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const chunks: Buffer[] = [];

        // Collect PDF data
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Add header
        this.addHeader(doc, report);

        // Add approval metadata
        this.includeApprovalMetadata(doc, report);

        // Add report details
        this.addReportDetails(doc, report);

        // Add report data
        this.addReportData(doc, report);

        // Add signature section
        this.addSignatureSection(doc, report);

        // Add footer
        this.addFooter(doc);

        // Finalize PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Saves PDF buffer to file storage and returns the URL
   * Requirements: 10.2, 10.3
   */
  async savePdf(buffer: Buffer, filename: string): Promise<string> {
    try {
      // Ensure directory exists
      await fs.mkdir(this.pdfDirectory, { recursive: true });

      // Generate full file path
      const filePath = path.join(this.pdfDirectory, filename);

      // Write buffer to file
      await fs.writeFile(filePath, buffer);

      // Return URL path
      return `/reports/pdfs/${filename}`;
    } catch (error) {
      throw new Error(`Failed to save PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Includes approval metadata in the PDF
   * Requirements: 10.4
   */
  includeApprovalMetadata(doc: PDFKit.PDFDocument, report: FinancialReport): void {
    doc.fontSize(14).font('Helvetica-Bold').text('Approval Information', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');

    // Report status
    doc.font('Helvetica-Bold').text('Status: ', { continued: true });
    doc.font('Helvetica').text(this.formatStatus(report.status));
    doc.moveDown(0.5);

    // Submitter Information
    if ((report as any).submitter || report.submittedAt) {
      doc.font('Helvetica-Bold').text('Submitted By:', { underline: true });
      doc.moveDown(0.2);
      if ((report as any).submitter) {
        doc.font('Helvetica').text(`  Name: ${(report as any).submitter.name}`);
        if ((report as any).submitter.email) {
          doc.text(`  Email: ${(report as any).submitter.email}`);
        }
      }
      if (report.submittedAt) {
        doc.text(`  Date: ${this.formatDate(report.submittedAt)}`);
      }
      doc.moveDown(0.5);
    }

    // DAF Approval
    if (report.dafId && report.dafApprovedAt) {
      doc.font('Helvetica-Bold').text('DAF Reviewal:', { underline: true });
      doc.moveDown(0.2);
      if ((report as any).dafApprover) {
        doc.font('Helvetica').text(`  Reviewed By: ${(report as any).dafApprover.name}`);
        if ((report as any).dafApprover.email) {
          doc.text(`  Email: ${(report as any).dafApprover.email}`);
        }
      }
      doc.text(`  Date: ${this.formatDate(report.dafApprovedAt)}`);
      if (report.dafComment) {
        doc.text(`  Comment: ${report.dafComment}`);
      }
      doc.moveDown(0.5);
    }

    // DG Approval
    if (report.dgId && report.dgApprovedAt) {
      doc.font('Helvetica-Bold').text('DG Final Approval:', { underline: true });
      doc.moveDown(0.2);
      if ((report as any).dgApprover) {
        doc.font('Helvetica').text(`  Approved By: ${(report as any).dgApprover.name}`);
        if ((report as any).dgApprover.email) {
          doc.text(`  Email: ${(report as any).dgApprover.email}`);
        }
      }
      doc.text(`  Date: ${this.formatDate(report.dgApprovedAt)}`);
      if (report.dgComment) {
        doc.text(`  Comment: ${report.dgComment}`);
      }
      doc.moveDown(0.5);
    }

    doc.moveDown(1);
  }

  /**
   * Generates a unique filename for the PDF
   */
  generateFilename(reportId: number): string {
    const timestamp = Date.now();
    return `financial-report-${reportId}-${timestamp}.pdf`;
  }

  /**
   * Main method to generate and save PDF
   * Requirements: 3.4, 3.5, 10.1-10.5
   */
  async generateAndSavePdf(report: FinancialReport): Promise<string> {
    // Generate PDF buffer
    const pdfBuffer = await this.generateFinancialReportPdf(report);

    // Generate filename
    const filename = this.generateFilename(report.id);

    // Save PDF and get URL
    const pdfUrl = await this.savePdf(pdfBuffer, filename);

    return pdfUrl;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private addHeader(doc: PDFKit.PDFDocument, report: FinancialReport): void {
    doc.fontSize(18).font('Helvetica-Bold').text('Financial Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(report.title, { align: 'center' });
    doc.moveDown(1);
    
    // Add horizontal line
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);
  }

  private addReportDetails(doc: PDFKit.PDFDocument, report: FinancialReport): void {
    doc.fontSize(14).font('Helvetica-Bold').text('Report Details', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    
    doc.font('Helvetica-Bold').text('Report Code: ', { continued: true });
    doc.font('Helvetica').text(report.reportCode);
    
    doc.font('Helvetica-Bold').text('Fiscal Year: ', { continued: true });
    doc.font('Helvetica').text(report.fiscalYear);
    
    doc.font('Helvetica-Bold').text('Version: ', { continued: true });
    doc.font('Helvetica').text(report.version);
    
    if (report.createdAt) {
      doc.font('Helvetica-Bold').text('Created At: ', { continued: true });
      doc.font('Helvetica').text(this.formatDate(report.createdAt));
    }

    if (report.submittedAt) {
      doc.font('Helvetica-Bold').text('Submitted At: ', { continued: true });
      doc.font('Helvetica').text(this.formatDate(report.submittedAt));
    }

    doc.moveDown(1);
  }

  private addReportData(doc: PDFKit.PDFDocument, report: FinancialReport): void {
    doc.fontSize(14).font('Helvetica-Bold').text('Report Data', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');

    // Add computed totals if available
    if (report.computedTotals) {
      doc.font('Helvetica-Bold').text('Computed Totals:', { underline: true });
      doc.moveDown(0.3);
      
      const totals = report.computedTotals as Record<string, any>;
      for (const [key, value] of Object.entries(totals)) {
        doc.font('Helvetica').text(`  ${this.formatKey(key)}: ${this.formatValue(value)}`);
      }
      doc.moveDown(0.5);
    }

    // Add summary of report data
    if (report.reportData) {
      doc.font('Helvetica-Bold').text('Report Summary:', { underline: true });
      doc.moveDown(0.3);
      
      const data = report.reportData as Record<string, any>;
      const summaryKeys = Object.keys(data).slice(0, 10); // Limit to first 10 keys
      
      for (const key of summaryKeys) {
        const value = data[key];
        if (typeof value !== 'object' || value === null) {
          doc.font('Helvetica').text(`  ${this.formatKey(key)}: ${this.formatValue(value)}`);
        }
      }
      
      if (Object.keys(data).length > 10) {
        doc.moveDown(0.3);
        doc.font('Helvetica-Oblique').text('  ... and more data fields');
      }
    }

    doc.moveDown(1);
  }

  private addFooter(doc: PDFKit.PDFDocument): void {
    const pageCount = doc.bufferedPageRange().count;
    
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Add horizontal line at bottom
      doc.moveTo(50, 750).lineTo(545, 750).stroke();
      
      // Add footer text
      doc.fontSize(8).font('Helvetica').text(
        `Generated on ${this.formatDate(new Date().toISOString())} | Page ${i + 1} of ${pageCount}`,
        50,
        760,
        { align: 'center' }
      );
    }
  }

  private addSignatureSection(doc: PDFKit.PDFDocument, report: FinancialReport): void {
    // Add a new page for signatures if needed
    doc.addPage();
    
    doc.fontSize(14).font('Helvetica-Bold').text('Approval Signatures', { underline: true });
    doc.moveDown(1);

    doc.fontSize(10).font('Helvetica');

    // Prepared by (Submitter)
    doc.font('Helvetica-Bold').text('Prepared by:');
    doc.moveDown(0.3);
    if ((report as any).submitter) {
      doc.font('Helvetica').text(`Name: ${(report as any).submitter.name}`);
    } else {
      doc.font('Helvetica').text('Name: _______________________________');
    }
    if (report.submittedAt) {
      doc.text(`Date: ${this.formatDate(report.submittedAt)}`);
    } else {
      doc.text('Date: _______________________________');
    }
    doc.moveDown(0.5);
    doc.text('Signature: _______________________________');
    doc.moveDown(2);

    // Approved by DAF
    doc.font('Helvetica-Bold').text('Reviewed by (DAF):');
    doc.moveDown(0.3);
    if ((report as any).dafApprover) {
      doc.font('Helvetica').text(`Name: ${(report as any).dafApprover.name}`);
    } else {
      doc.font('Helvetica').text('Name: _______________________________');
    }
    if (report.dafApprovedAt) {
      doc.text(`Date: ${this.formatDate(report.dafApprovedAt)}`);
    } else {
      doc.text('Date: _______________________________');
    }
    doc.moveDown(0.5);
    doc.text('Signature: _______________________________');
    doc.moveDown(2);

    // Approved by DG
    doc.font('Helvetica-Bold').text('Approved by (DG):');
    doc.moveDown(0.3);
    if ((report as any).dgApprover) {
      doc.font('Helvetica').text(`Name: ${(report as any).dgApprover.name}`);
    } else {
      doc.font('Helvetica').text('Name: _______________________________');
    }
    if (report.dgApprovedAt) {
      doc.text(`Date: ${this.formatDate(report.dgApprovedAt)}`);
    } else {
      doc.text('Date: _______________________________');
    }
    doc.moveDown(0.5);
    doc.text('Signature: _______________________________');
  }

  private formatStatus(status: string): string {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private formatKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'number') {
      return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  }
}

// Export singleton instance
export const pdfGenerationService = new PdfGenerationService();
