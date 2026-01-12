import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { SeedManager } from "../utils/seed-manager";
import { statementConfigurations } from "../../../lib/statement-engine/examples/statement-configurations";

/* eslint-disable no-console */
export default async function seed(db: Database) {
  console.log("Seeding statement configurations...");

  // Get the admin user ID for createdBy field
  const adminUser = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, 'admin'))
    .limit(1);

  const createdBy = adminUser[0]?.id || 1; // fallback to ID 1 if no admin found

  const configRows = statementConfigurations.map((config) => ({
    statementCode: config.statementCode,
    statementName: config.statementName,
    description: config.description,
    statementType: config.statementType,
    version: config.version || '1.0',
    configuration: config,
    isActive: config.isActive !== false,
    isTemplate: config.metadata?.isTemplate || false,
    sourceTemplate: config.metadata?.sourceTemplate || null,
    tags: config.metadata?.tags || [],
    createdBy,
    metadata: config.metadata || {}
  }));

  const seedManager = new SeedManager(db);
  await seedManager.seedWithConflictResolution(schema.statementConfigurations, configRows, {
    uniqueFields: ["statementCode", "version"],
    onConflict: "update",
    updateFields: [
      "statementName", 
      "description", 
      "statementType", 
      "configuration", 
      "isActive", 
      "isTemplate", 
      "sourceTemplate", 
      "tags", 
      "metadata"
    ],
  });

  console.log(`Seeded ${configRows.length} statement configurations:`);
  configRows.forEach(config => {
    console.log(`- ${config.statementCode}: ${config.statementName} (v${config.version})`);
  });
}