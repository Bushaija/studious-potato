/**
 * Template Engine Foundation
 * Handles loading, validating, and caching of statement templates
 */

import { Database } from "@/db";
import { statementTemplates } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
    StatementTemplate,
    TemplateLine,
    TemplateMetadata,
    ValidationResult,
    TemplateProcessor,
    TemplateCache,
    TemplateError
} from "../types/core.types";
import { LineDefinition, StatementMetadata } from "@/db/schema/statement-templates/types";

export class TemplateEngine implements TemplateProcessor {
    private cache: Map<string, StatementTemplate> = new Map();
    private cacheExpiry: Map<string, number> = new Map();
    private readonly CACHE_TTL = 1 * 60 * 1000; // 2 minutes

    constructor(private db: Database) { }

    /**
     * Load statement template from database with caching
     */
    async loadTemplate(statementCode: string): Promise<StatementTemplate> {
        // Check cache first
        const cached = this.getFromCache(statementCode);
        if (cached) {
            return cached;
        }

        try {
            // Load template lines from database
            const templateRows = await this.db.query.statementTemplates.findMany({
                where: and(
                    eq(statementTemplates.statementCode, statementCode),
                    eq(statementTemplates.isActive, true)
                ),
                orderBy: [statementTemplates.displayOrder],
            });

            if (templateRows.length === 0) {
                throw new Error(`No active template found for statement code: ${statementCode}`);
            }

            // Build template structure
            const template = this.buildTemplateFromRows(templateRows);

            // Validate template
            const validation = this.validateTemplate(template);
            if (!validation.isValid) {
                throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
            }

            // Cache the template
            this.setInCache(statementCode, template);

            return template;
        } catch (error) {
            const templateError: TemplateError = {
                code: 'TEMPLATE_LOAD_ERROR',
                message: `Failed to load template for ${statementCode}`,
                context: { statementCode },
                timestamp: new Date(),
                severity: 'error',
                templateId: 0,
                validationFailures: [error instanceof Error ? error.message : 'Unknown error']
            };

            console.error('Template loading error:', templateError);
            throw error;
        }
    }

    /**
     * Validate template structure and configuration
     */
    validateTemplate(template: StatementTemplate): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Basic structure validation
        if (!template.statementCode) {
            errors.push('Statement code is required');
        }

        if (!template.statementName) {
            errors.push('Statement name is required');
        }

        if (!template.lines || template.lines.length === 0) {
            errors.push('Template must have at least one line');
        }

        // Line validation
        const lineCodes = new Set<string>();
        const displayOrders = new Set<number>();

        for (const line of template.lines) {
            // Check for duplicate line codes
            if (lineCodes.has(line.lineCode)) {
                errors.push(`Duplicate line code: ${line.lineCode}`);
            }
            lineCodes.add(line.lineCode);

            // Check for duplicate display orders
            if (displayOrders.has(line.displayOrder)) {
                warnings.push(`Duplicate display order: ${line.displayOrder}`);
            }
            displayOrders.add(line.displayOrder);

            // Validate line structure
            if (!line.description) {
                errors.push(`Line ${line.lineCode} missing description`);
            }

            // Validate event mappings or formula
            if (!line.eventMappings?.length && !line.calculationFormula) {
                warnings.push(`Line ${line.lineCode} has no event mappings or calculation formula`);
            }

            // Validate formula syntax if present
            if (line.calculationFormula) {
                const formulaValidation = this.validateFormulaSyntax(line.calculationFormula);
                if (!formulaValidation.isValid) {
                    errors.push(`Invalid formula in line ${line.lineCode}: ${formulaValidation.errors.join(', ')}`);
                }
            }
        }

        // Validate hierarchical structure
        const hierarchyValidation = this.validateHierarchy(template.lines);
        if (!hierarchyValidation.isValid) {
            errors.push(...hierarchyValidation.errors);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Build hierarchical line structure
     */
    buildLineHierarchy(templateLines: TemplateLine[]): TemplateLine[] {
        // Sort by display order
        const sortedLines = [...templateLines].sort((a, b) => a.displayOrder - b.displayOrder);

        // Build parent-child relationships
        const lineMap = new Map(sortedLines.map(line => [line.id, line]));
        const rootLines: TemplateLine[] = [];

        for (const line of sortedLines) {
            // Note: The TemplateLine interface doesn't have parentLineId or children
            // This would need to be extended if hierarchical structure is needed
            rootLines.push(line);
        }

        return rootLines;
    }

    /**
     * Invalidate template cache
     */
    invalidateCache(statementCode?: string): void {
        if (statementCode) {
            this.cache.delete(statementCode);
            this.cacheExpiry.delete(statementCode);
        } else {
            this.cache.clear();
            this.cacheExpiry.clear();
        }
    }

    /**
     * Get template cache statistics
     */
    getCacheStats(): { size: number; hitRate: number; entries: string[] } {
        return {
            size: this.cache.size,
            hitRate: 0, // Would need to track hits/misses for accurate calculation
            entries: Array.from(this.cache.keys())
        };
    }

    // Private helper methods

    private buildTemplateFromRows(rows: any[]): StatementTemplate {
        if (rows.length === 0) {
            throw new Error('No template rows provided');
        }

        const firstRow = rows[0];

        // Extract statement-level metadata
        const metadata: TemplateMetadata = {
            version: firstRow.metadata?.version || '1.0',
            createdAt: firstRow.createdAt || new Date(),
            updatedAt: firstRow.updatedAt || new Date(),
            isActive: firstRow.isActive ?? true,
            validationRules: firstRow.validationRules || []
        };

        // Build template lines
        const lines: TemplateLine[] = rows.map(row => ({
            id: row.id,
            lineCode: row.lineCode,
            description: row.lineItem,
            displayOrder: row.displayOrder,
            eventMappings: Array.isArray(row.eventMappings) ? row.eventMappings : [],
            calculationFormula: row.calculationFormula || undefined,
            formatting: {
                bold: row.formatRules?.bold || row.isTotalLine || false,
                italic: row.formatRules?.italic || false,
                indentLevel: row.level || 1,
                isSection: row.formatRules?.isSection || false,
                isSubtotal: row.isSubtotalLine || false,
                isTotal: row.isTotalLine || false
            },
            displayConditions: row.displayConditions ? [row.displayConditions] : undefined,
            metadata: row.metadata || {} // Include metadata from database row
        }));

        return {
            id: firstRow.id,
            statementCode: firstRow.statementCode,
            statementName: firstRow.statementName,
            lines,
            metadata
        };
    }

    private getFromCache(statementCode: string): StatementTemplate | null {
        const expiry = this.cacheExpiry.get(statementCode);
        if (expiry && Date.now() > expiry) {
            this.cache.delete(statementCode);
            this.cacheExpiry.delete(statementCode);
            return null;
        }
        return this.cache.get(statementCode) || null;
    }

    private setInCache(statementCode: string, template: StatementTemplate): void {
        this.cache.set(statementCode, template);
        this.cacheExpiry.set(statementCode, Date.now() + this.CACHE_TTL);
    }

    private validateFormulaSyntax(formula: string): ValidationResult {
        const errors: string[] = [];

        try {
            // Basic syntax checks
            const openParens = (formula.match(/\(/g) || []).length;
            const closeParens = (formula.match(/\)/g) || []).length;

            if (openParens !== closeParens) {
                errors.push('Mismatched parentheses');
            }

            // Check for invalid characters (basic check)
            const invalidChars = formula.match(/[^a-zA-Z0-9\s\+\-\*\/\(\)\.\,\_\>\<\=\!\&\|\[\]]/g);
            if (invalidChars) {
                errors.push(`Invalid characters: ${invalidChars.join(', ')}`);
            }

            // Check for empty formula
            if (!formula.trim()) {
                errors.push('Formula cannot be empty');
            }

        } catch (error) {
            errors.push(`Formula syntax error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings: []
        };
    }

    private validateHierarchy(lines: TemplateLine[]): ValidationResult {
        const errors: string[] = [];

        // Check for valid display order sequence
        const orders = lines.map(l => l.displayOrder).sort((a, b) => a - b);
        for (let i = 1; i < orders.length; i++) {
            if (orders[i] === orders[i - 1]) {
                errors.push(`Duplicate display order: ${orders[i]}`);
            }
        }

        // Additional hierarchy validations could be added here
        // such as checking parent-child relationships, indent levels, etc.

        return {
            isValid: errors.length === 0,
            errors,
            warnings: []
        };
    }
}