#!/usr/bin/env tsx
/**
 * Diagnostic script to check VAT receivables in the database
 * 
 * Usage:
 *   tsx --require tsconfig-paths/register apps/server/src/scripts/diagnose-vat-receivables.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';

// Load environment variables
import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';

const myEnv = dotenv.config();
expand(myEnv);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('🔗 Connecting to database...');
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

async function diagnose() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   VAT RECEIVABLES DIAGNOSTIC                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const projectTypes = ['HIV', 'Malaria', 'TB'] as const;
  const facilityTypes = ['hospital', 'health_center'] as const;

  for (const projectType of projectTypes) {
    console.log(`\n📊 Project: ${projectType}`);
    console.log('─'.repeat(50));

    for (const facilityType of facilityTypes) {
      console.log(`\n  🏥 Facility Type: ${facilityType}`);

      // Get all Section D activities
      const sectionDActivities = await db
        .select({
          id: schema.dynamicActivities.id,
          name: schema.dynamicActivities.name,
          code: schema.dynamicActivities.code,
          activityType: schema.dynamicActivities.activityType,
          displayOrder: schema.dynamicActivities.displayOrder,
          fieldMappings: schema.dynamicActivities.fieldMappings,
          metadata: schema.dynamicActivities.metadata,
        })
        .from(schema.dynamicActivities)
        .where(
          and(
            eq(schema.dynamicActivities.projectType, projectType as any),
            eq(schema.dynamicActivities.facilityType, facilityType),
            eq(schema.dynamicActivities.moduleType, 'execution'),
            eq(schema.dynamicActivities.isActive, true),
            like(schema.dynamicActivities.code, '%_D_%')
          )
        )
        .orderBy(schema.dynamicActivities.displayOrder);

      console.log(`     Total Section D activities: ${sectionDActivities.length}`);

      // Check for VAT receivables
      const vatReceivables = sectionDActivities.filter(a => 
        a.activityType === 'VAT_RECEIVABLE' || 
        a.code?.includes('_VAT_') ||
        a.name?.toLowerCase().includes('vat receivable')
      );

      console.log(`     VAT Receivables found: ${vatReceivables.length}`);

      if (vatReceivables.length > 0) {
        console.log('\n     VAT Receivables:');
        vatReceivables.forEach(vat => {
          const fm = vat.fieldMappings as any;
          const meta = vat.metadata as any;
          console.log(`       ✅ ${vat.name}`);
          console.log(`          Code: ${vat.code}`);
          console.log(`          Activity Type: ${vat.activityType}`);
          console.log(`          fieldMappings.subcategory: ${fm?.subcategory || 'NOT SET'}`);
          console.log(`          fieldMappings.category: ${fm?.category || 'NOT SET'}`);
          console.log(`          metadata.vatCategory: ${meta?.vatCategory || 'NOT SET'}`);
        });
      } else {
        console.log('\n     ⚠️  NO VAT RECEIVABLES FOUND!');
        console.log('     This is the likely cause of the issue.');
        console.log('     Run: pnpm db:seed:execution to fix this.');
      }

      // Check for D-01 subcategory
      const d01Activities = sectionDActivities.filter(a => {
        const fm = a.fieldMappings as any;
        return fm?.subcategory === 'D-01';
      });

      console.log(`\n     Activities with D-01 subcategory: ${d01Activities.length}`);
      if (d01Activities.length > 0) {
        d01Activities.forEach(a => {
          console.log(`       - ${a.name} (${a.code})`);
        });
      }

      // List all Section D activities
      console.log('\n     All Section D activities:');
      sectionDActivities.forEach(a => {
        const fm = a.fieldMappings as any;
        const isVAT = a.activityType === 'VAT_RECEIVABLE' || a.code?.includes('_VAT_');
        const marker = isVAT ? '🔶' : '  ';
        console.log(`       ${marker} ${a.name}`);
        console.log(`          Code: ${a.code}`);
        console.log(`          Type: ${a.activityType}`);
        console.log(`          Subcategory: ${fm?.subcategory || 'none'}`);
      });
    }
  }

  // Check schema_activity_categories for D-01
  console.log('\n\n📋 Checking D-01 subcategory in schema_activity_categories...');
  const d01Categories = await db
    .select()
    .from(schema.schemaActivityCategories)
    .where(
      and(
        eq(schema.schemaActivityCategories.moduleType, 'execution' as any),
        eq(schema.schemaActivityCategories.subCategoryCode, 'D-01')
      )
    );

  console.log(`   Found ${d01Categories.length} D-01 subcategory entries`);
  d01Categories.forEach(cat => {
    console.log(`   - ${cat.name} (${cat.projectType}, ${cat.facilityType})`);
  });
}

diagnose()
  .then(() => {
    console.log('\n✨ Diagnostic complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  })
  .finally(() => {
    client.end();
  });
