import { serve } from "@hono/node-server";

import app from "./app";
import env from "./env";
import { scheduleOutdatedReportsJob } from "./jobs/detect-outdated-reports";

const port = env.PORT;
// eslint-disable-next-line no-console
console.log(`Server is running on port http://localhost:${port}`);

// Start background jobs
// Run outdated reports detection every hour
const outdatedReportsJobId = scheduleOutdatedReportsJob(60 * 60 * 1000);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  const { stopOutdatedReportsJob } = require('./jobs/detect-outdated-reports');
  stopOutdatedReportsJob(outdatedReportsJobId);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  const { stopOutdatedReportsJob } = require('./jobs/detect-outdated-reports');
  stopOutdatedReportsJob(outdatedReportsJobId);
  process.exit(0);
});

serve({
  fetch: app.fetch,
  port,
});