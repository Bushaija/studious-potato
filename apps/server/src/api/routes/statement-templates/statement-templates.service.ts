import { eq, and, asc, inArray, sql } from "drizzle-orm";
import { db } from "@/api/db";
import { statementTemplates, events } from "@/api/db/schema";

export class StatementTemplateService {
  async validateTemplateData(templateData: any): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Validate parent-child relationships
    if (templateData.parentLineId) {
      const parentExists = await db.query.statementTemplates.findFirst({
        where: eq(statementTemplates.id, templateData.parentLineId),
      });

      if (!parentExists) {
        errors.push("Parent line item does not exist");
      } else {
        const parentLevel = parentExists.level ?? -Infinity;
        if (parentLevel >= templateData.level) {
          errors.push("Child level must be greater than parent level");
        }
      }
    }

    // Validate event mappings if provided
    if (templateData.eventMappings && Array.isArray(templateData.eventMappings)) {
      const eventIds = templateData.eventMappings.filter((id: any) => typeof id === 'number');
      if (eventIds.length > 0) {
        const existingEvents = await db.query.events.findMany({
          where: inArray(events.id, eventIds),
        });
        
        const missingEventIds = eventIds.filter(
          (id: number) => !existingEvents.some(event => event.id === id)
        );
        
        if (missingEventIds.length > 0) {
          errors.push(`Event IDs do not exist: ${missingEventIds.join(', ')}`);
        }
      }
    }

    // Validate calculation formula syntax (basic validation)
    if (templateData.calculationFormula) {
      // Basic validation - could be enhanced with proper formula parser
      const invalidChars = /[^a-zA-Z0-9+\-*/().\s]/;
      if (invalidChars.test(templateData.calculationFormula)) {
        errors.push("Calculation formula contains invalid characters");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async getTemplatesByEvents(eventIds: number[]): Promise<any[]> {
    return await db.query.statementTemplates.findMany({
      where: and(
        eq(statementTemplates.isActive, true),
        // Need to check if eventMappings jsonb contains any of the event IDs
        sql`${statementTemplates.eventMappings} ? ANY(ARRAY[${eventIds.map(id => `'${id}'`).join(',')}])`
      ),
      orderBy: [asc(statementTemplates.displayOrder)],
    });
  }

  async calculateLineValue(
    templateId: number, 
    reportData: Record<string, any>
  ): Promise<number> {
    const template = await db.query.statementTemplates.findFirst({
      where: eq(statementTemplates.id, templateId),
    });

    if (!template) {
      throw new Error("Statement template not found");
    }

    // If it has a calculation formula, evaluate it
    if (template.calculationFormula) {
      return this.evaluateFormula(template.calculationFormula, reportData);
    }

    // If it has event mappings, sum values from those events
    if (template.eventMappings && Array.isArray(template.eventMappings)) {
      let total = 0;
      for (const eventId of template.eventMappings) {
        const eventValue = reportData[`event_${eventId}`] || 0;
        total += Number(eventValue);
      }
      return total;
    }

    return 0;
  }

  private evaluateFormula(formula: string, data: Record<string, any>): number {
    // This is a simplified formula evaluator
    // In production, you'd want a more robust expression parser
    try {
      // Replace data placeholders in formula
      let evaluableFormula = formula;
      
      // Replace event references like {event_123} with actual values
      evaluableFormula = evaluableFormula.replace(
        /\{event_(\d+)\}/g,
        (match, eventId) => {
          return String(data[`event_${eventId}`] || 0);
        }
      );

      // Replace line references like {line_456} with actual values
      evaluableFormula = evaluableFormula.replace(
        /\{line_(\d+)\}/g,
        (match, lineId) => {
          return String(data[`line_${lineId}`] || 0);
        }
      );

      // Use Function constructor for safe evaluation (basic safety)
      const result = Function(`"use strict"; return (${evaluableFormula})`)();
      return Number(result) || 0;
    } catch (error) {
      console.error("Formula evaluation error:", error);
      return 0;
    }
  }
}

export const statementTemplateService = new StatementTemplateService();