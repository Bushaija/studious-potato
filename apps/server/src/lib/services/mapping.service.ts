import { db } from "@/db";
import { dynamicActivities, schemaActivityCategories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { formulaEngine } from "../utils/computation.utils";


export class MappingService {
  async validateMappingFormula(formula: string, testData?: Record<string, any>) {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      testResult: undefined as any
    };

    try {
      // Basic syntax validation
      const parseResult = formulaEngine.parseFormula(formula);
      if (!parseResult.isValid) {
        result.isValid = false;
        result.errors = parseResult.errors;
        return result;
      }

      // Test execution if data provided
      if (testData) {
        try {
          result.testResult = await formulaEngine.evaluate(formula, testData);
        } catch (error) {
          result.warnings.push(`Formula execution warning: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Check for potentially dangerous operations
      if (formula.includes('/') && !formula.includes('SAFEDIV')) {
        result.warnings.push("Consider using SAFEDIV function to prevent division by zero");
      }

      return result;
    } catch (error) {
      result.isValid = false;
      result.errors.push(error instanceof Error ? error.message : "Validation failed");
      return result;
    }
  }

  async generateRecommendedMappings(
    unmappedEvents: any[], 
    projectType: string, 
    facilityType: string
  ) {
    const recommendations = [];

    // Get available activities and categories for this project/facility type
    const [activities, categories] = await Promise.all([
      db.query.dynamicActivities.findMany({
        where: and(
          eq(dynamicActivities.projectType, projectType as any),
          eq(dynamicActivities.facilityType, facilityType as any),
          eq(dynamicActivities.isActive, true)
        )
      }),
      db.query.schemaActivityCategories.findMany({
        where: and(
          eq(schemaActivityCategories.projectType, projectType as any),
          eq(schemaActivityCategories.facilityType, facilityType as any),
          eq(schemaActivityCategories.isActive, true)
        )
      })
    ]);

    for (const event of unmappedEvents) {
      // Simple keyword matching for recommendations
      const eventDescription = event.description.toLowerCase();
      
      // Try to match with activities
      const matchedActivity = activities.find(activity => {
        const activityName = activity.name.toLowerCase();
        const keywords = activityName.split(' ');
        return keywords.some(keyword => 
          keyword.length > 3 && eventDescription.includes(keyword)
        );
      });

      if (matchedActivity) {
        recommendations.push({
          eventId: event.id,
          suggestedActivityId: matchedActivity.id,
          confidence: 0.7,
          reason: `Matched keyword from activity: ${matchedActivity.name}`
        });
        continue;
      }

      // Try to match with categories
      const matchedCategory = categories.find(category => {
        const categoryName = category.name.toLowerCase();
        const keywords = categoryName.split(' ');
        return keywords.some(keyword => 
          keyword.length > 3 && eventDescription.includes(keyword)
        );
      });

      if (matchedCategory) {
        recommendations.push({
          eventId: event.id,
          suggestedCategoryId: matchedCategory.id,
          confidence: 0.5,
          reason: `Matched keyword from category: ${matchedCategory.name}`
        });
      } else {
        // Default recommendation based on event type
        const defaultCategory = categories.find(cat => 
          cat.name.toLowerCase().includes(event.eventType.toLowerCase())
        );
        
        if (defaultCategory) {
          recommendations.push({
            eventId: event.id,
            suggestedCategoryId: defaultCategory.id,
            confidence: 0.3,
            reason: `Default mapping based on event type: ${event.eventType}`
          });
        }
      }
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }
}

export const mappingService = new MappingService();