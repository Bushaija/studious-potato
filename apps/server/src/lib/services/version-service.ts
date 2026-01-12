import { db } from "@/db";
import { reportVersions } from "@/db/schema/report-versions/schema";
import { eq, and, desc } from "drizzle-orm";
import type { SnapshotData } from "./snapshot-service";

/**
 * Report Version with Relations
 * Extended version data with related entities
 */
export interface ReportVersionWithRelations {
  id: number;
  reportId: number;
  versionNumber: string;
  snapshotData: SnapshotData;
  snapshotChecksum: string;
  snapshotTimestamp: Date;
  createdBy: number | null;
  createdAt: Date | null;
  changesSummary: string | null;
  creator?: {
    id: number;
    name: string | null;
    email: string | null;
  };
}

/**
 * Version Comparison Result
 * Contains differences between two report versions
 */
export interface VersionComparisonResult {
  version1: string;
  version2: string;
  differences: VersionDifference[];
  summary: {
    totalDifferences: number;
    significantChanges: number;
  };
}

/**
 * Version Difference
 * Represents a single difference between two versions
 */
export interface VersionDifference {
  lineCode: string;
  lineName: string;
  field: string;
  version1Value: number;
  version2Value: number;
  difference: number;
  percentageChange: number;
}

/**
 * VersionService
 * Handles report version creation, retrieval, and comparison
 * for financial reports
 */
export class VersionService {
  /**
   * Create a new report version
   * Stores a snapshot as a versioned record for audit trail
   * 
   * @param reportId - Report ID
   * @param versionNumber - Version number (e.g., "1.0", "1.1")
   * @param snapshotData - Complete snapshot data
   * @param checksum - SHA-256 checksum of snapshot
   * @param userId - User ID creating the version
   * @param changesSummary - Optional description of changes
   */
  async createVersion(
    reportId: number,
    versionNumber: string,
    snapshotData: SnapshotData,
    checksum: string,
    userId: number,
    changesSummary?: string
  ): Promise<void> {
    try {
      await db.insert(reportVersions).values({
        reportId,
        versionNumber,
        snapshotData: snapshotData as any,
        snapshotChecksum: checksum,
        snapshotTimestamp: new Date(),
        createdBy: userId,
        changesSummary: changesSummary || null,
      });

      console.log(
        `Version ${versionNumber} created for report ${reportId} by user ${userId}`
      );
    } catch (error) {
      console.error('Error creating version:', error);
      throw new Error(
        `Failed to create version: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all versions for a report
   * Retrieves version history with creator information
   * 
   * @param reportId - Report ID
   * @returns Array of versions ordered by creation date (newest first)
   */
  async getVersions(reportId: number): Promise<ReportVersionWithRelations[]> {
    try {
      const versions = await db.query.reportVersions.findMany({
        where: eq(reportVersions.reportId, reportId),
        orderBy: [desc(reportVersions.createdAt)],
        with: {
          creator: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return versions as ReportVersionWithRelations[];
    } catch (error) {
      console.error('Error fetching versions:', error);
      return [];
    }
  }

  /**
   * Get a specific version
   * Retrieves a single version by report ID and version number
   * 
   * @param reportId - Report ID
   * @param versionNumber - Version number (e.g., "1.0")
   * @returns Version data or null if not found
   */
  async getVersion(
    reportId: number,
    versionNumber: string
  ): Promise<ReportVersionWithRelations | null> {
    try {
      const version = await db.query.reportVersions.findFirst({
        where: and(
          eq(reportVersions.reportId, reportId),
          eq(reportVersions.versionNumber, versionNumber)
        ),
        with: {
          creator: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return version as ReportVersionWithRelations | null;
    } catch (error) {
      console.error('Error fetching version:', error);
      return null;
    }
  }

  /**
   * Compare two versions
   * Performs line-by-line comparison of statement data
   * 
   * @param reportId - Report ID
   * @param version1 - First version number
   * @param version2 - Second version number
   * @returns Comparison result with differences and summary
   */
  async compareVersions(
    reportId: number,
    version1: string,
    version2: string
  ): Promise<VersionComparisonResult> {
    try {
      // Fetch both versions
      const v1 = await this.getVersion(reportId, version1);
      const v2 = await this.getVersion(reportId, version2);

      if (!v1 || !v2) {
        throw new Error(
          `Version not found: ${!v1 ? version1 : version2}`
        );
      }

      const snapshot1 = v1.snapshotData;
      const snapshot2 = v2.snapshotData;

      // Compare statement lines
      const differences: VersionDifference[] = [];
      
      // Create maps for efficient lookup
      const linesMap1 = new Map(
        snapshot1.statement.lines.map((line: any) => [line.code, line])
      );
      const linesMap2 = new Map(
        snapshot2.statement.lines.map((line: any) => [line.code, line])
      );

      // Get all unique line codes from both versions
      const allCodes = new Set([...linesMap1.keys(), ...linesMap2.keys()]);

      for (const code of allCodes) {
        const line1 = linesMap1.get(code);
        const line2 = linesMap2.get(code);

        // Skip if line doesn't exist in both versions
        if (!line1 || !line2) {
          continue;
        }

        // Compare current values
        if (line1.currentValue !== line2.currentValue) {
          differences.push({
            lineCode: code,
            lineName: line1.name || line1.lineName || code,
            field: "currentValue",
            version1Value: line1.currentValue || 0,
            version2Value: line2.currentValue || 0,
            difference: (line2.currentValue || 0) - (line1.currentValue || 0),
            percentageChange: this.calculatePercentageChange(
              line1.currentValue || 0,
              line2.currentValue || 0
            ),
          });
        }

        // Compare previous values if available
        if (
          line1.previousValue !== undefined &&
          line2.previousValue !== undefined &&
          line1.previousValue !== line2.previousValue
        ) {
          differences.push({
            lineCode: code,
            lineName: line1.name || line1.lineName || code,
            field: "previousValue",
            version1Value: line1.previousValue || 0,
            version2Value: line2.previousValue || 0,
            difference: (line2.previousValue || 0) - (line1.previousValue || 0),
            percentageChange: this.calculatePercentageChange(
              line1.previousValue || 0,
              line2.previousValue || 0
            ),
          });
        }
      }

      // Calculate summary
      const significantChanges = differences.filter(
        (d) => Math.abs(d.percentageChange) > 5
      ).length;

      console.log(
        `Version comparison: ${version1} vs ${version2} - ` +
        `${differences.length} differences, ${significantChanges} significant`
      );

      return {
        version1,
        version2,
        differences,
        summary: {
          totalDifferences: differences.length,
          significantChanges,
        },
      };
    } catch (error) {
      console.error('Error comparing versions:', error);
      throw new Error(
        `Failed to compare versions: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Increment version number
   * Generates next version number in sequence
   * 
   * @param currentVersion - Current version (e.g., "1.0")
   * @returns Next version number (e.g., "1.1")
   */
  incrementVersion(currentVersion: string): string {
    try {
      const parts = currentVersion.split('.');
      const major = parseInt(parts[0], 10);
      const minor = parseInt(parts[1] || '0', 10);

      if (isNaN(major) || isNaN(minor)) {
        throw new Error(`Invalid version format: ${currentVersion}`);
      }

      return `${major}.${minor + 1}`;
    } catch (error) {
      console.error('Error incrementing version:', error);
      // Default to incrementing from 1.0 if parsing fails
      return "1.1";
    }
  }

  /**
   * Get all versions for a report (simple list)
   * Returns basic version info without relations
   * 
   * @param reportId - Report ID
   * @returns Array of versions
   */
  async getVersionsByReportId(reportId: number): Promise<Array<{ versionNumber: string }>> {
    try {
      const versions = await db.query.reportVersions.findMany({
        where: eq(reportVersions.reportId, reportId),
        columns: {
          versionNumber: true,
        },
      });

      return versions;
    } catch (error) {
      console.error('Error fetching versions by report ID:', error);
      return [];
    }
  }

  /**
   * Delete a specific version
   * Used for cleaning up failed submissions or resubmissions
   * 
   * @param reportId - Report ID
   * @param versionNumber - Version number to delete
   */
  async deleteVersion(reportId: number, versionNumber: string): Promise<void> {
    try {
      await db.delete(reportVersions)
        .where(
          and(
            eq(reportVersions.reportId, reportId),
            eq(reportVersions.versionNumber, versionNumber)
          )
        );

      console.log(`Deleted version ${versionNumber} for report ${reportId}`);
    } catch (error) {
      console.error('Error deleting version:', error);
      throw new Error(
        `Failed to delete version: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate percentage change between two values
   * Helper method for version comparison
   * 
   * @param oldValue - Original value
   * @param newValue - New value
   * @returns Percentage change
   */
  private calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) {
      return newValue === 0 ? 0 : 100;
    }
    return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
  }
}

// Export singleton instance
export const versionService = new VersionService();
