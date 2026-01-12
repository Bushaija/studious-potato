import type { Database } from "@/db";
import { and, eq, sql } from "drizzle-orm";

export interface SeedingOptions {
  skipExisting?: boolean;
  updateExisting?: boolean;
  deleteAndRecreate?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

export interface SeedResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export class SeedManager {
  constructor(private db: Database) {}

  async seedWithConflictResolution<T extends Record<string, any>>(
    table: any,
    data: T[],
    options: {
      uniqueFields: (keyof T)[];
      updateFields?: (keyof T)[];
      skipFields?: (keyof T)[];
      onConflict?: 'skip' | 'update' | 'error' | 'replace';
      batchSize?: number;
    }
  ): Promise<SeedResult> {
    const result: SeedResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };
    const { uniqueFields, updateFields, onConflict = 'skip', batchSize = 100 } = options;

    if (data.length === 0) return result;

    console.log(`SeedManager: Processing ${data.length} rows with conflict strategy: ${onConflict}`);

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      try {
        if (onConflict === 'skip') {
          // FIXED: Use returning() to get actual inserted count
          const insertedRows = await this.db
            .insert(table)
            .values(batch)
            .onConflictDoNothing()
            .returning({ id: table.id }); // Assuming table has an 'id' field
          
          const actualInserted = insertedRows.length;
          result.inserted += actualInserted;
          result.skipped += (batch.length - actualInserted);
          
          console.log(`Batch ${Math.floor(i/batchSize) + 1}: ${actualInserted} inserted, ${batch.length - actualInserted} skipped`);
          
        } else if (onConflict === 'update' && updateFields && updateFields.length > 0) {
          const updateSet = updateFields.reduce((acc, field) => {
            acc[field as string] = sql`EXCLUDED.${sql.identifier(field as string)}`;
            return acc;
          }, {} as Record<string, unknown>);

          // FIXED: Use returning() to track what actually happened
          const upsertedRows = await this.db
            .insert(table)
            .values(batch)
            .onConflictDoUpdate({
              target: uniqueFields as any,
              set: updateSet,
            })
            .returning({ id: table.id });
            
          // Note: PostgreSQL doesn't distinguish between insert/update in RETURNING
          // So we'll count as updates for now
          result.updated += upsertedRows.length;
          console.log(`Batch ${Math.floor(i/batchSize) + 1}: ${upsertedRows.length} upserted`);
          
        } else if (onConflict === 'replace') {
          // FIXED: Track deletions and insertions separately
          let deletedCount = 0;
          for (const item of batch) {
            const whereConditions = uniqueFields.map((field) => eq(table[field as string], item[field as string]));
            const deleteResult = await this.db
              .delete(table)
              .where(and(...whereConditions))
              .returning({ id: table.id });
            deletedCount += deleteResult.length;
          }
          
          const insertedRows = await this.db
            .insert(table)
            .values(batch)
            .returning({ id: table.id });
          
          result.inserted += insertedRows.length;
          console.log(`Batch ${Math.floor(i/batchSize) + 1}: ${deletedCount} deleted, ${insertedRows.length} inserted`);
          
        } else if (onConflict === 'error') {
          const insertedRows = await this.db
            .insert(table)
            .values(batch)
            .returning({ id: table.id });
          result.inserted += insertedRows.length;
          console.log(`Batch ${Math.floor(i/batchSize) + 1}: ${insertedRows.length} inserted (error on conflict)`);
          
        } else {
          // Default fallback
          const insertedRows = await this.db
            .insert(table)
            .values(batch)
            .onConflictDoNothing()
            .returning({ id: table.id });
          
          const actualInserted = insertedRows.length;
          result.inserted += actualInserted;
          result.skipped += (batch.length - actualInserted);
          console.log(`Batch ${Math.floor(i/batchSize) + 1}: ${actualInserted} inserted (default), ${batch.length - actualInserted} skipped`);
        }
      } catch (error: any) {
        const errorMsg = `Batch ${Math.floor(i/batchSize) + 1}: ${error?.message ?? String(error)}`;
        result.errors.push(errorMsg);
        console.error(`SeedManager error: ${errorMsg}`);
        
        // For debugging: log the problematic batch data
        console.error(`Problematic batch data:`, batch.slice(0, 2)); // First 2 items
      }
    }

    // FIXED: Proper summary logging
    console.log(`SeedManager completed: ${result.inserted} inserted, ${result.updated} updated, ${result.skipped} skipped, ${result.errors.length} errors`);

    if (result.errors.length > 0) {
      console.warn(`Seeding encountered ${result.errors.length} errors:`);
      for (const e of result.errors) console.warn(`  - ${e}`);
    }

    return result;
  }

  // BONUS: Add a method specifically for execution event mappings with better error handling
  async seedExecutionEventMappingsDirect<T extends Record<string, any>>(
    table: any,
    data: T[]
  ): Promise<SeedResult> {
    const result: SeedResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };
    
    if (data.length === 0) return result;

    console.log(`Direct execution mapping seeder: Processing ${data.length} mappings`);

    try {
      // Try direct insertion first
      const insertedRows = await this.db
        .insert(table)
        .values(data)
        .onConflictDoNothing()
        .returning({ id: table.id });

      result.inserted = insertedRows.length;
      result.skipped = data.length - insertedRows.length;

      console.log(`Direct seeding completed: ${result.inserted} inserted, ${result.skipped} skipped`);

      // If some were skipped, find out why
      if (result.skipped > 0) {
        console.log(`Investigating ${result.skipped} skipped rows...`);
        
        // This would require a more complex query to find existing conflicts
        // For now, just report the numbers
      }

    } catch (error: any) {
      const errorMsg = `Direct insertion failed: ${error?.message ?? String(error)}`;
      result.errors.push(errorMsg);
      console.error(errorMsg);
    }

    return result;
  }
}