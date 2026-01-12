import { db } from "@/db";
import { financialReports } from "@/db/schema/financial-reports/schema";
import { eq, or } from "drizzle-orm";
import { snapshotService } from "@/lib/services/snapshot-service";

/**
 * Background job to detect outdated financial reports
 * 
 * This job runs periodically to check if source data has changed
 * after a report was submitted/approved. If changes are detected,
 * the report is flagged as outdated to notify users that the
 * snapshot may no longer reflect current data.
 * 
 * Requirements: 5.1, 5.2
 */
export async function detectOutdatedReports(): Promise<void> {
  try {
    // Query all submitted/approved reports that have snapshots
    const submittedReports = await db.query.financialReports.findMany({
      where: or(
        eq(financialReports.status, 'submitted'),
        eq(financialReports.status, 'pending_daf_approval'),
        eq(financialReports.status, 'approved_by_daf'),
        eq(financialReports.status, 'fully_approved')
      ),
    });

    let updatedCount = 0;
    let errorCount = 0;

    // Check each report for source data changes
    for (const report of submittedReports) {
      try {
        // Skip reports without snapshot data
        if (!report.reportData || !report.snapshotTimestamp) {
          continue;
        }

        // Detect if source data has changed since snapshot
        const hasChanges = await snapshotService.detectSourceDataChanges(report.id);

        // Update is_outdated flag if changes detected and not already flagged
        if (hasChanges && !report.isOutdated) {
          await db.update(financialReports)
            .set({ 
              isOutdated: true,
              updatedAt: new Date()
            })
            .where(eq(financialReports.id, report.id));

          updatedCount++;
        } else if (!hasChanges && report.isOutdated) {
          // Clear outdated flag if no changes detected but flag is set
          await db.update(financialReports)
            .set({ 
              isOutdated: false,
              updatedAt: new Date()
            })
            .where(eq(financialReports.id, report.id));

          updatedCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Schedule the outdated reports detection job
 * 
 * This function sets up a periodic job that runs every hour
 * to check for outdated reports. In production, this should
 * be replaced with a proper job scheduler like node-cron,
 * bull, or a cloud-based scheduler.
 * 
 * @param intervalMs - Interval in milliseconds (default: 1 hour)
 * @returns Interval ID that can be used to stop the job
 */
export function scheduleOutdatedReportsJob(intervalMs: number = 60 * 60 * 1000): NodeJS.Timeout {
  // Run immediately on startup
  detectOutdatedReports().catch(() => {});

  // Schedule periodic runs
  const intervalId = setInterval(() => {
    detectOutdatedReports().catch(() => {});
  }, intervalMs);

  return intervalId;
}

/**
 * Stop the scheduled outdated reports job
 * 
 * @param intervalId - The interval ID returned by scheduleOutdatedReportsJob
 */
export function stopOutdatedReportsJob(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
}
