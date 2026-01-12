import { db } from "@/api/db";
import { dynamicActivities } from "@/api/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Script to add quarterly applicability to existing activities
 * Run this to update your existing activities with quarterly information
 */

async function addQuarterlyApplicability() {
  console.log('Adding quarterly applicability to activities...');

  try {
    // Define activity patterns and their applicable quarters
    const quarterlyRules = [
      // Annual activities (Q4 only)
      { pattern: /annual|audit|yearly|year.end/i, quarters: ['Q4'] },
      
      // Bonus activities (typically Q1)
      { pattern: /bonus|incentive|reward/i, quarters: ['Q1'] },
      
      // Quarterly activities
      { pattern: /quarterly|quarter/i, quarters: ['Q1', 'Q2', 'Q3', 'Q4'] },
      
      // Monthly activities (all quarters)
      { pattern: /salary|monthly|rent|utilities|maintenance/i, quarters: ['Q1', 'Q2', 'Q3', 'Q4'] },
      
      // Training activities (typically Q2 and Q4)
      { pattern: /training|workshop|seminar/i, quarters: ['Q2', 'Q4'] },
      
      // Default: all quarters
      { pattern: /.*/, quarters: ['Q1', 'Q2', 'Q3', 'Q4'] }
    ];

    // Fetch all activities
    const activities = await db
      .select({
        id: dynamicActivities.id,
        name: dynamicActivities.name,
        metadata: dynamicActivities.metadata
      })
      .from(dynamicActivities);

    console.log(`Found ${activities.length} activities to update`);

    let updatedCount = 0;

    for (const activity of activities) {
      // Skip if already has quarterly applicability
      const currentMetadata = activity.metadata as any || {};
      if (currentMetadata.applicableQuarters) {
        console.log(`Skipping ${activity.name} - already has quarterly applicability`);
        continue;
      }

      // Find matching rule
      let applicableQuarters = ['Q1', 'Q2', 'Q3', 'Q4']; // default
      
      for (const rule of quarterlyRules) {
        if (rule.pattern.test(activity.name)) {
          applicableQuarters = rule.quarters;
          break;
        }
      }

      // Update metadata
      const updatedMetadata = {
        ...currentMetadata,
        applicableQuarters
      };

      await db
        .update(dynamicActivities)
        .set({
          metadata: updatedMetadata,
          updatedAt: new Date()
        })
        .where(eq(dynamicActivities.id, activity.id));

      console.log(`Updated ${activity.name} -> ${applicableQuarters.join(', ')}`);
      updatedCount++;
    }

    console.log(`✅ Successfully updated ${updatedCount} activities with quarterly applicability`);

  } catch (error) {
    console.error('❌ Error updating activities:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  addQuarterlyApplicability()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { addQuarterlyApplicability };