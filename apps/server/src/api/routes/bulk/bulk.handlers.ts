import { eq, and, desc, sql } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { db } from "@/api/db";
import { systemConfigurations } from "@/api/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";
import type {
  ExportSingleReportRoute,
  BulkExportRoute,
  GetExportStatusRoute,
  DownloadExportRoute,
  CancelExportRoute,
  MigrationExportRoute,
  ListExportTemplatesRoute,
  CreateExportTemplateRoute,
  GetExportTemplateRoute,
  UpdateExportTemplateRoute,
  DeleteExportTemplateRoute,
} from "./bulk.routes";
import { bulkExportService } from "./bulk.service";

export const exportSingleReport: AppRouteHandler<ExportSingleReportRoute> = async (c) => {
  const { id } = c.req.param();
  const reportId = parseInt(id);
  const exportParams = await c.req.json();
  const user = c.get("user");

  try {
    const result = await bulkExportService.exportSingleReport(reportId, {
      ...exportParams,
      requestedBy: user.id,
    });

    return c.json(result, HttpStatusCodes.OK);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json({ message: "Report not found" }, HttpStatusCodes.NOT_FOUND);
    }

    console.error("Error exporting single report:", error);
    return c.json({
      message: "Failed to export report",
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const bulkExport: AppRouteHandler<BulkExportRoute> = async (c) => {
  const exportParams = await c.req.json();
  const user = c.get("user");

  try {
    const result = await bulkExportService.initiateBulkExport({
      ...exportParams,
      requestedBy: user.id,
    });

    return c.json(result, HttpStatusCodes.ACCEPTED);
  } catch (error) {
    console.error("Error initiating bulk export:", error);
    return c.json({
      message: "Failed to initiate bulk export",
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const getExportStatus: AppRouteHandler<GetExportStatusRoute> = async (c) => {
  const { exportId } = c.req.param();

  try {
    const status = await bulkExportService.getExportStatus(exportId);
    
    if (!status) {
      return c.json({ message: "Export job not found" }, HttpStatusCodes.NOT_FOUND);
    }

    return c.json(status, HttpStatusCodes.OK);
  } catch (error) {
    console.error("Error getting export status:", error);
    return c.json({
      message: "Failed to get export status",
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const downloadExport: AppRouteHandler<DownloadExportRoute> = async (c) => {
  const { exportId } = c.req.param();
  const { fileIndex } = c.req.query();

  try {
    const downloadResult = await bulkExportService.downloadExport(exportId, fileIndex);
    
    if (!downloadResult) {
      return c.json({ message: "Export file not found" }, HttpStatusCodes.NOT_FOUND);
    }

    // Set appropriate headers
    c.header('Content-Type', downloadResult.contentType);
    c.header('Content-Disposition', `attachment; filename="${downloadResult.filename}"`);
    c.header('Content-Length', downloadResult.fileSize.toString());

    return c.body(downloadResult.data, HttpStatusCodes.OK);
  } catch (error) {
    console.error("Error downloading export:", error);
    return c.json({
      message: "Failed to download export file",
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const cancelExport: AppRouteHandler<CancelExportRoute> = async (c) => {
  const { exportId } = c.req.param();

  try {
    const result = await bulkExportService.cancelExport(exportId);
    
    if (!result.found) {
      return c.json({ message: "Export job not found" }, HttpStatusCodes.NOT_FOUND);
    }

    if (!result.cancelled) {
      return c.json({ 
        message: "Cannot cancel export in current state" 
      }, HttpStatusCodes.BAD_REQUEST);
    }

    return c.json({ message: "Export cancelled successfully" }, HttpStatusCodes.OK);
  } catch (error) {
    console.error("Error cancelling export:", error);
    return c.json({
      message: "Failed to cancel export",
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const migrationExport: AppRouteHandler<MigrationExportRoute> = async (c) => {
  const migrationParams = await c.req.json();
  const user = c.get("user");

  try {
    const result = await bulkExportService.initiateMigrationExport({
      ...migrationParams,
      requestedBy: user.id,
    });

    return c.json(result, HttpStatusCodes.ACCEPTED);
  } catch (error) {
    console.error("Error initiating migration export:", error);
    return c.json({
      message: "Failed to initiate migration export",
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const listExportTemplates: AppRouteHandler<ListExportTemplatesRoute> = async (c) => {
  const query = c.req.query();
  const { templateType, format, isPublic, createdBy, page = 1, limit = 20 } = query;
  const user = c.get("user");

  try {
    const conditions = [eq(systemConfigurations.configKey, 'export_template')];
    
    if (templateType) {
      conditions.push(sql`${systemConfigurations.configValue}->>'templateType' = ${templateType}`);
    }
    if (format) {
      conditions.push(sql`${systemConfigurations.configValue}->>'format' = ${format}`);
    }
    if (createdBy) {
      conditions.push(sql`(${systemConfigurations.configValue}->>'createdBy')::int = ${createdBy}`);
    }
    
    // Show public templates or user's own templates
    if (isPublic !== undefined) {
      conditions.push(sql`(${systemConfigurations.configValue}->>'isPublic')::boolean = ${isPublic}`);
    } else {
      const visibilityCondition = sql`(
        (${systemConfigurations.configValue}->>'isPublic')::boolean = true OR 
        (${systemConfigurations.configValue}->>'createdBy')::int = ${user.id}
      )`;
      conditions.push(visibilityCondition);
    }

    const offset = (page - 1) * limit;

    const [templates, totalCount] = await Promise.all([
      db.query.systemConfigurations.findMany({
        where: and(...conditions),
        limit,
        offset,
        orderBy: [desc(systemConfigurations.createdAt)],
      }),
      db.$count(systemConfigurations, and(...conditions)),
    ]);

    const formattedTemplates = templates.map(template => ({
      id: template.id,
      name: template.configValue.name,
      description: template.configValue.description,
      templateType: template.configValue.templateType,
      format: template.configValue.format,
      scope: template.configValue.scope,
      configuration: template.configValue.configuration,
      isActive: template.isActive,
      isPublic: template.configValue.isPublic || false,
      createdBy: template.configValue.createdBy,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    }));

    return c.json({
      templates: formattedTemplates,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error listing export templates:", error);
    return c.json({
      message: "Failed to list export templates",
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const createExportTemplate: AppRouteHandler<CreateExportTemplateRoute> = async (c) => {
  const templateData = await c.req.json();
  const user = c.get("user");

  try {
    const [template] = await db.insert(systemConfigurations)
      .values({
        configKey: 'export_template',
        configType: 'export_template',
        configValue: {
          ...templateData,
          createdBy: user.id,
        },
        scope: 'GLOBAL',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const responseTemplate = {
      id: template.id,
      ...template.configValue,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };

    return c.json(responseTemplate, HttpStatusCodes.CREATED);
  } catch (error) {
    console.error("Error creating export template:", error);
    return c.json({
      message: "Failed to create export template",
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const getExportTemplate: AppRouteHandler<GetExportTemplateRoute> = async (c) => {
  const { id } = c.req.param();
  const templateId = parseInt(id);

  try {
    const template = await db.query.systemConfigurations.findFirst({
      where: and(
        eq(systemConfigurations.id, templateId),
        eq(systemConfigurations.configKey, 'export_template')
      ),
    });

    if (!template) {
      return c.json({ message: "Export template not found" }, HttpStatusCodes.NOT_FOUND);
    }

    const responseTemplate = {
      id: template.id,
      ...template.configValue,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };

    return c.json(responseTemplate, HttpStatusCodes.OK);
  } catch (error) {
    console.error("Error getting export template:", error);
    return c.json({
      message: "Failed to get export template",
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const updateExportTemplate: AppRouteHandler<UpdateExportTemplateRoute> = async (c) => {
  const { id } = c.req.param();
  const templateId = parseInt(id);
  const updates = await c.req.json();

  try {
    const existingTemplate = await db.query.systemConfigurations.findFirst({
      where: and(
        eq(systemConfigurations.id, templateId),
        eq(systemConfigurations.configKey, 'export_template')
      ),
    });

    if (!existingTemplate) {
      return c.json({ message: "Export template not found" }, HttpStatusCodes.NOT_FOUND);
    }

    const [updatedTemplate] = await db.update(systemConfigurations)
      .set({
        configValue: {
          ...existingTemplate.configValue,
          ...updates,
        },
        updatedAt: new Date(),
      })
      .where(eq(systemConfigurations.id, templateId))
      .returning();

    const responseTemplate = {
      id: updatedTemplate.id,
      ...updatedTemplate.configValue,
      createdAt: updatedTemplate.createdAt.toISOString(),
      updatedAt: updatedTemplate.updatedAt.toISOString(),
    };

    return c.json(responseTemplate, HttpStatusCodes.OK);
  } catch (error) {
    console.error("Error updating export template:", error);
    return c.json({
      message: "Failed to update export template",
    }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const deleteExportTemplate: AppRouteHandler<DeleteExportTemplateRoute> = async (c) => {
  const { id } = c.req.param();
  const templateId = parseInt(id);

  try {
    const result = await db.delete(systemConfigurations)
      .where(and(
        eq(systemConfigurations.id, templateId),
        eq(systemConfigurations.configKey, 'export_template')
      ));

    if (result.rowCount === 0) {
      return c.json({ message: "Export template not found" }, HttpStatusCodes.NOT_FOUND);
    }

    return c.body(null, HttpStatusCodes.NO_CONTENT);
  } catch (error) {
    console.error("Error deleting export template:", error);
    return c.json({
      message: "Failed to delete export template",
    }, HttpStatusCodes.BAD_REQUEST);
  }
};
