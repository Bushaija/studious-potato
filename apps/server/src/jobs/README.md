# Background Jobs

This directory contains background jobs that run periodically to maintain system integrity and data consistency.

## Outdated Reports Detection Job

**File:** `detect-outdated-reports.ts`

**Purpose:** Detects when source data (planning or execution entries) has been modified after a financial report was submitted or approved, flagging the report as outdated.

**Schedule:** Runs every hour (configurable)

**Requirements:** 5.1, 5.2

### How It Works

1. Queries all reports with status: `submitted`, `pending_daf_approval`, `approved_by_daf`, or `fully_approved`
2. For each report with snapshot data:
   - Calls `snapshotService.detectSourceDataChanges()` to check if source data has been modified
   - Compares timestamps of planning and execution entries against the snapshot timestamp
   - Updates the `is_outdated` flag if changes are detected
3. Logs results and any errors encountered

### Configuration

The job is started automatically when the server starts in `src/index.ts`:

```typescript
import { scheduleOutdatedReportsJob } from "./jobs/detect-outdated-reports";

// Run every hour (60 * 60 * 1000 ms)
const jobId = scheduleOutdatedReportsJob(60 * 60 * 1000);
```

To change the interval, modify the parameter passed to `scheduleOutdatedReportsJob()`:
- Every 30 minutes: `30 * 60 * 1000`
- Every 2 hours: `2 * 60 * 60 * 1000`
- Every 15 minutes: `15 * 60 * 1000`

### Manual Execution

You can manually trigger the job for testing or maintenance:

```typescript
import { detectOutdatedReports } from "./jobs/detect-outdated-reports";

// Run once
await detectOutdatedReports();
```

### Monitoring

The job logs its activity to the console:
- Start of detection run
- Number of reports checked
- Reports flagged as outdated
- Reports cleared of outdated flag
- Errors encountered
- Summary of results

### Production Considerations

For production deployments, consider:

1. **Job Scheduler:** Replace `setInterval` with a robust job scheduler:
   - [node-cron](https://www.npmjs.com/package/node-cron) for cron-style scheduling
   - [Bull](https://github.com/OptimalBits/bull) for Redis-based job queues
   - Cloud-based schedulers (AWS EventBridge, Google Cloud Scheduler, etc.)

2. **Distributed Systems:** Ensure only one instance runs the job:
   - Use distributed locks (Redis, database)
   - Use a dedicated worker process
   - Use cloud-based job schedulers

3. **Error Handling:** Implement retry logic and alerting for failures

4. **Performance:** Consider batching updates and adding pagination for large datasets

5. **Monitoring:** Integrate with monitoring tools (DataDog, New Relic, etc.)

### Testing

To test the job locally:

1. Create a financial report and submit it
2. Modify the source planning or execution data
3. Wait for the job to run (or trigger manually)
4. Verify the report's `is_outdated` flag is set to `true`
5. Check the console logs for job execution details
