import { eq, and, desc, sql } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { db } from "@/api/db";
import { documents, schemaFormDataEntries } from "@/api/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";
import type {
  UploadRoute,
  ListRoute,
  GetOneRoute,
  PatchRoute,
  VerifyRoute,
  UnverifyRoute,
  SoftDeleteRoute,
  RestoreRoute,
  DownloadRoute,
  GetByExecutionEntryRoute,
} from "./documents.routes";
import { getUserContext } from "@/api/lib/utils/get-user-facility";
import { 
  fileStorage, 
  ALLOWED_DOCUMENT_TYPES, 
  MAX_FILE_SIZE_MB 
} from "@/lib/utils/file-storage";

export const upload: AppRouteHandler<UploadRoute> = async (c) => {
  try {
    const userContext = await getUserContext(c);
    const accessibleFacilityIds = userContext.accessibleFacilityIds;
    const user = c.get('user');
    
    if (!user) {
      return c.json(
        { message: "User not authenticated" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    // Parse multipart form data
    const body = await c.req.parseBody();
    const file = body.file as File;
    
    if (!file) {
      return c.json(
        { message: "No file provided", error: "File is required" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Validate file type
    if (!fileStorage.validateFileType(file.type, ALLOWED_DOCUMENT_TYPES)) {
      return c.json(
        { 
          message: "Invalid file type", 
          error: `Allowed types: PDF, Word, Excel, Images, CSV, Text. Received: ${file.type}` 
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Validate file size
    if (!fileStorage.validateFileSize(file.size, MAX_FILE_SIZE_MB)) {
      return c.json(
        { 
          message: "File too large", 
          error: `Maximum file size is ${MAX_FILE_SIZE_MB}MB` 
        },
        HttpStatusCodes.REQUEST_TOO_LONG
      );
    }

    // Parse and validate execution entry
    const executionEntryId = parseInt(body.executionEntryId as string);
    
    // Verify execution entry exists and user has access
    const executionEntry = await db.query.schemaFormDataEntries.findFirst({
      where: eq(schemaFormDataEntries.id, executionEntryId),
    });

    if (!executionEntry) {
      return c.json(
        { message: "Execution entry not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    if (!accessibleFacilityIds.includes(executionEntry.facilityId)) {
      return c.json(
        { message: "Access denied: facility not in your hierarchy" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Save file to storage
    const uploadedFile = await fileStorage.saveFile(file);

    // Generate document code
    const documentCode = `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Parse optional metadata
    let metadata = undefined;
    if (body.metadata) {
      try {
        metadata = JSON.parse(body.metadata as string);
      } catch (error) {
        console.warn('Failed to parse metadata JSON:', error);
      }
    }

    // Insert document record
    const newDocument = await db.insert(documents).values({
      documentCode,
      documentName: body.documentName as string,
      documentType: body.documentType as any,
      description: body.description as string | undefined,
      fileName: uploadedFile.fileName,
      fileSize: uploadedFile.fileSize,
      mimeType: uploadedFile.mimeType,
      fileUrl: uploadedFile.fileUrl,
      executionEntryId,
      metadata,
      uploadedBy: parseInt(user.id),
      isVerified: false,
      isDeleted: false,
    }).returning();

    // Fetch the complete document with relations
    const documentWithRelations = await db.query.documents.findFirst({
      where: eq(documents.id, newDocument[0].id),
      with: {
        executionEntry: { 
          columns: { 
            id: true, 
            entityType: true,
            facilityId: true,
            projectId: true,
            reportingPeriodId: true,
          } 
        },
        uploader: { columns: { id: true, name: true, email: true } },
        verifier: { columns: { id: true, name: true, email: true } },
      },
    });

    return c.json(documentWithRelations, HttpStatusCodes.CREATED);
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return c.json(
      { message: "Failed to upload document", error: error.message },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const list: AppRouteHandler<ListRoute> = async (c) => {
  try {
    const userContext = await getUserContext(c);
    const accessibleFacilityIds = userContext.accessibleFacilityIds;

    if (accessibleFacilityIds.length === 0) {
      return c.json({
        documents: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        summary: { totalDocuments: 0, byType: {}, byExecutionEntry: {}, verifiedCount: 0, unverifiedCount: 0 },
        message: "No accessible facilities found for user"
      }, HttpStatusCodes.FORBIDDEN);
    }

    const query = c.req.query();
    const {
      executionEntryId,
      facilityId,
      projectId,
      reportingPeriodId,
      documentType,
      isVerified,
      uploadedBy,
      page,
      limit,
    } = query;

    const conditions = [];

    // Filter by execution entry if provided
    if (executionEntryId) {
      const entryId = parseInt(executionEntryId);
      
      // Verify execution entry exists and user has access
      const executionEntry = await db.query.schemaFormDataEntries.findFirst({
        where: eq(schemaFormDataEntries.id, entryId),
      });

      if (!executionEntry) {
        return c.json({
          documents: [],
          pagination: { page: parseInt(page || '1'), limit: parseInt(limit || '20'), total: 0, totalPages: 0 },
          summary: { totalDocuments: 0, byType: {}, byExecutionEntry: {}, verifiedCount: 0, unverifiedCount: 0 },
          message: "Execution entry not found"
        }, HttpStatusCodes.NOT_FOUND);
      }

      if (!accessibleFacilityIds.includes(executionEntry.facilityId)) {
        return c.json({
          documents: [],
          pagination: { page: parseInt(page || '1'), limit: parseInt(limit || '20'), total: 0, totalPages: 0 },
          summary: { totalDocuments: 0, byType: {}, byExecutionEntry: {}, verifiedCount: 0, unverifiedCount: 0 },
          message: "Access denied: facility not in your hierarchy"
        }, HttpStatusCodes.FORBIDDEN);
      }

      conditions.push(eq(documents.executionEntryId, entryId));
    } else {
      // Filter by accessible facilities through execution entries
      const accessibleEntries = await db.query.schemaFormDataEntries.findMany({
        where: sql`${schemaFormDataEntries.facilityId} IN (${sql.join(accessibleFacilityIds.map(id => sql`${id}`), sql`, `)})`,
        columns: { id: true },
      });

      const accessibleEntryIds = accessibleEntries.map(e => e.id);
      
      if (accessibleEntryIds.length === 0) {
        return c.json({
          documents: [],
          pagination: { page: parseInt(page || '1'), limit: parseInt(limit || '20'), total: 0, totalPages: 0 },
          summary: { totalDocuments: 0, byType: {}, byExecutionEntry: {}, verifiedCount: 0, unverifiedCount: 0 },
        }, HttpStatusCodes.OK);
      }

      conditions.push(sql`${documents.executionEntryId} IN (${sql.join(accessibleEntryIds.map(id => sql`${id}`), sql`, `)})`);
    }

    // Additional filters through execution entry
    if (facilityId || projectId || reportingPeriodId) {
      const entryConditions = [];
      if (facilityId) entryConditions.push(eq(schemaFormDataEntries.facilityId, parseInt(facilityId)));
      if (projectId) entryConditions.push(eq(schemaFormDataEntries.projectId, parseInt(projectId)));
      if (reportingPeriodId) entryConditions.push(eq(schemaFormDataEntries.reportingPeriodId, parseInt(reportingPeriodId)));

      const filteredEntries = await db.query.schemaFormDataEntries.findMany({
        where: and(...entryConditions),
        columns: { id: true },
      });

      const filteredEntryIds = filteredEntries.map(e => e.id);
      
      if (filteredEntryIds.length === 0) {
        return c.json({
          documents: [],
          pagination: { page: parseInt(page || '1'), limit: parseInt(limit || '20'), total: 0, totalPages: 0 },
          summary: { totalDocuments: 0, byType: {}, byExecutionEntry: {}, verifiedCount: 0, unverifiedCount: 0 },
        }, HttpStatusCodes.OK);
      }

      conditions.push(sql`${documents.executionEntryId} IN (${sql.join(filteredEntryIds.map(id => sql`${id}`), sql`, `)})`);
    }

    // Document-specific filters
    if (documentType) conditions.push(eq(documents.documentType, documentType as any));
    if (isVerified !== undefined) conditions.push(eq(documents.isVerified, isVerified === 'true'));
    if (uploadedBy) conditions.push(eq(documents.uploadedBy, parseInt(uploadedBy)));
    
    // Exclude soft-deleted documents by default
    conditions.push(eq(documents.isDeleted, false));

    const pageNum = parseInt(page || '1');
    const limitNum = parseInt(limit || '20');
    const offset = (pageNum - 1) * limitNum;

    const [documentsList, totalCount] = await Promise.all([
      db.query.documents.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(documents.uploadedAt)],
        limit: limitNum,
        offset,
        with: {
          executionEntry: {
            columns: {
              id: true,
              entityType: true,
              facilityId: true,
              projectId: true,
              reportingPeriodId: true,
            },
          },
          uploader: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          verifier: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      db.$count(documents, conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    // Generate summary statistics
    const [typeCounts, entryCounts, verificationCounts] = await Promise.all([
      db.select({
        documentType: documents.documentType,
        count: sql<number>`count(*)::int`,
      })
        .from(documents)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(documents.documentType),

      db.select({
        executionEntryId: documents.executionEntryId,
        count: sql<number>`count(*)::int`,
      })
        .from(documents)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(documents.executionEntryId),

      db.select({
        isVerified: documents.isVerified,
        count: sql<number>`count(*)::int`,
      })
        .from(documents)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(documents.isVerified),
    ]);

    const summary = {
      totalDocuments: totalCount,
      byType: Object.fromEntries(typeCounts.map(t => [t.documentType, t.count])),
      byExecutionEntry: Object.fromEntries(entryCounts.map(e => [e.executionEntryId.toString(), e.count])),
      verifiedCount: verificationCounts.find(v => v.isVerified === true)?.count || 0,
      unverifiedCount: verificationCounts.find(v => v.isVerified === false)?.count || 0,
    };

    return c.json({
      documents: documentsList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
      summary,
    });
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return c.json(
      { message: "Failed to fetch documents", error: error.message },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.param();
  const documentId = parseInt(id);

  try {
    const userContext = await getUserContext(c);
    const accessibleFacilityIds = userContext.accessibleFacilityIds;

    const document = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
      with: {
        executionEntry: {
          columns: {
            id: true,
            entityType: true,
            facilityId: true,
            projectId: true,
            reportingPeriodId: true,
          },
        },
        uploader: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        verifier: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!document) {
      return c.json({
        message: "Document not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    if (!document.executionEntry || !accessibleFacilityIds.includes(document.executionEntry.facilityId)) {
      return c.json(
        { message: "Access denied: facility not in your hierarchy" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    return c.json(document, HttpStatusCodes.OK);
  } catch (error: any) {
    console.error('Error fetching document:', error);
    return c.json(
      { message: "Failed to fetch document", error: error.message },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.param();
  const documentId = parseInt(id);

  try {
    const userContext = await getUserContext(c);
    const accessibleFacilityIds = userContext.accessibleFacilityIds;
    const user = c.get('user');
    
    if (!user) {
      return c.json(
        { message: "User not authenticated" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    const document = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
      with: {
        executionEntry: {
          columns: { facilityId: true },
        },
      },
    });

    if (!document) {
      return c.json({
        message: "Document not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    if (!document.executionEntry || !accessibleFacilityIds.includes(document.executionEntry.facilityId)) {
      return c.json(
        { message: "Access denied: facility not in your hierarchy" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    const body = await c.req.json();

    // Prevent updating certain fields directly
    const restrictedFields = ['id', 'uploadedBy', 'uploadedAt', 'isDeleted', 'deletedBy', 'deletedAt', 'executionEntryId'];
    restrictedFields.forEach(field => delete body[field]);

    const updatedDocuments = await db.update(documents)
      .set({
        ...body,
        updatedBy: parseInt(user.id),
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId))
      .returning();

    if (updatedDocuments.length === 0) {
      return c.json({
        message: "Document not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    const updatedDocument = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
      with: {
        executionEntry: { 
          columns: { 
            id: true, 
            entityType: true,
            facilityId: true,
            projectId: true,
            reportingPeriodId: true,
          } 
        },
        uploader: { columns: { id: true, name: true, email: true } },
        verifier: { columns: { id: true, name: true, email: true } },
      },
    });

    return c.json(updatedDocument, HttpStatusCodes.OK);
  } catch (error: any) {
    console.error('Error updating document:', error);
    return c.json(
      { message: "Failed to update document", error: error.message },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const verify: AppRouteHandler<VerifyRoute> = async (c) => {
  const { id } = c.req.param();
  const documentId = parseInt(id);

  try {
    const userContext = await getUserContext(c);
    const accessibleFacilityIds = userContext.accessibleFacilityIds;
    const user = c.get('user');
    
    if (!user) {
      return c.json(
        { message: "User not authenticated" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    const document = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
      with: {
        executionEntry: {
          columns: { facilityId: true },
        },
      },
    });

    if (!document) {
      return c.json({
        message: "Document not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    if (!document.executionEntry || !accessibleFacilityIds.includes(document.executionEntry.facilityId)) {
      return c.json(
        { message: "Access denied: facility not in your hierarchy" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    const body = await c.req.json();

    await db.update(documents)
      .set({
        isVerified: true,
        verifiedBy: parseInt(user.id),
        verifiedAt: new Date(),
        verificationNotes: body.verificationNotes || null,
      })
      .where(eq(documents.id, documentId));

    const verifiedDocument = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
      with: {
        executionEntry: { 
          columns: { 
            id: true, 
            entityType: true,
            facilityId: true,
            projectId: true,
            reportingPeriodId: true,
          } 
        },
        uploader: { columns: { id: true, name: true, email: true } },
        verifier: { columns: { id: true, name: true, email: true } },
      },
    });

    return c.json(verifiedDocument, HttpStatusCodes.OK);
  } catch (error: any) {
    console.error('Error verifying document:', error);
    return c.json(
      { message: "Failed to verify document", error: error.message },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const unverify: AppRouteHandler<UnverifyRoute> = async (c) => {
  const { id } = c.req.param();
  const documentId = parseInt(id);

  try {
    const userContext = await getUserContext(c);
    const accessibleFacilityIds = userContext.accessibleFacilityIds;

    const document = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
      with: {
        executionEntry: {
          columns: { facilityId: true },
        },
      },
    });

    if (!document) {
      return c.json({
        message: "Document not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    if (!document.executionEntry || !accessibleFacilityIds.includes(document.executionEntry.facilityId)) {
      return c.json(
        { message: "Access denied: facility not in your hierarchy" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    await db.update(documents)
      .set({
        isVerified: false,
        verifiedBy: null,
        verifiedAt: null,
        verificationNotes: null,
      })
      .where(eq(documents.id, documentId));

    const unverifiedDocument = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
      with: {
        executionEntry: { 
          columns: { 
            id: true, 
            entityType: true,
            facilityId: true,
            projectId: true,
            reportingPeriodId: true,
          } 
        },
        uploader: { columns: { id: true, name: true, email: true } },
        verifier: { columns: { id: true, name: true, email: true } },
      },
    });

    return c.json(unverifiedDocument, HttpStatusCodes.OK);
  } catch (error: any) {
    console.error('Error unverifying document:', error);
    return c.json(
      { message: "Failed to unverify document", error: error.message },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const softDelete: AppRouteHandler<SoftDeleteRoute> = async (c) => {
  const { id } = c.req.param();
  const documentId = parseInt(id);

  try {
    const userContext = await getUserContext(c);
    const accessibleFacilityIds = userContext.accessibleFacilityIds;
    const user = c.get('user');
    
    if (!user) {
      return c.json(
        { message: "User not authenticated" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    const document = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
      with: {
        executionEntry: {
          columns: { facilityId: true },
        },
      },
    });

    if (!document) {
      return c.json({
        message: "Document not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    if (!document.executionEntry || !accessibleFacilityIds.includes(document.executionEntry.facilityId)) {
      return c.json(
        { message: "Access denied: facility not in your hierarchy" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    const body = await c.req.json();

    if (!body.deletionReason || body.deletionReason.trim() === '') {
      return c.json(
        { message: "Deletion reason is required" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    await db.update(documents)
      .set({
        isDeleted: true,
        deletedBy: parseInt(user.id),
        deletedAt: new Date(),
        deletionReason: body.deletionReason,
      })
      .where(eq(documents.id, documentId));

    const deletedDocument = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
      with: {
        executionEntry: { 
          columns: { 
            id: true, 
            entityType: true,
            facilityId: true,
            projectId: true,
            reportingPeriodId: true,
          } 
        },
        uploader: { columns: { id: true, name: true, email: true } },
        verifier: { columns: { id: true, name: true, email: true } },
      },
    });

    return c.json({
      message: "Document deleted successfully",
      document: deletedDocument,
    }, HttpStatusCodes.OK);
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return c.json(
      { message: "Failed to delete document", error: error.message },
      HttpStatusCodes.BAD_REQUEST
    );
  }
};

export const restore: AppRouteHandler<RestoreRoute> = async (c) => {
  const { id } = c.req.param();
  const documentId = parseInt(id);

  try {
    const userContext = await getUserContext(c);
    const accessibleFacilityIds = userContext.accessibleFacilityIds;

    const document = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
      with: {
        executionEntry: {
          columns: { facilityId: true },
        },
      },
    });

    if (!document) {
      return c.json({
        message: "Document not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    if (!document.executionEntry || !accessibleFacilityIds.includes(document.executionEntry.facilityId)) {
      return c.json(
        { message: "Access denied: facility not in your hierarchy" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    if (!document.isDeleted) {
      return c.json(
        { message: "Document is not deleted" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    await db.update(documents)
      .set({
        isDeleted: false,
        deletedBy: null,
        deletedAt: null,
        deletionReason: null,
      })
      .where(eq(documents.id, documentId));

    const restoredDocument = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
      with: {
        executionEntry: { 
          columns: { 
            id: true, 
            entityType: true,
            facilityId: true,
            projectId: true,
            reportingPeriodId: true,
          } 
        },
        uploader: { columns: { id: true, name: true, email: true } },
        verifier: { columns: { id: true, name: true, email: true } },
      },
    });

    return c.json(restoredDocument, HttpStatusCodes.OK);
  } catch (error: any) {
    console.error('Error restoring document:', error);
    return c.json(
      { message: "Failed to restore document", error: error.message },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const download: AppRouteHandler<DownloadRoute> = async (c) => {
  const { id } = c.req.param();
  const documentId = parseInt(id);

  try {
    const userContext = await getUserContext(c);
    const accessibleFacilityIds = userContext.accessibleFacilityIds;

    const document = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
      with: {
        executionEntry: {
          columns: { facilityId: true },
        },
      },
    });

    if (!document) {
      return c.json({
        message: "Document not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    if (!document.executionEntry || !accessibleFacilityIds.includes(document.executionEntry.facilityId)) {
      return c.json(
        { message: "Access denied: facility not in your hierarchy" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Check if file exists
    if (!fileStorage.fileExists(document.fileUrl)) {
      return c.json(
        { message: "File not found on server" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    // Get file path and read file
    const filePath = fileStorage.getFilePath(document.fileUrl);
    const fs = await import('fs');
    const fileBuffer = await fs.promises.readFile(filePath);

    // Set headers for file download
    c.header('Content-Type', document.mimeType);
    c.header('Content-Disposition', `attachment; filename="${document.fileName}"`);
    c.header('Content-Length', document.fileSize.toString());

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `attachment; filename="${document.fileName}"`,
        'Content-Length': document.fileSize.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error downloading document:', error);
    return c.json(
      { message: "Failed to download document", error: error.message },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getByExecutionEntry: AppRouteHandler<GetByExecutionEntryRoute> = async (c) => {
  const { executionEntryId } = c.req.param();
  const entryId = parseInt(executionEntryId);

  try {
    const userContext = await getUserContext(c);
    const accessibleFacilityIds = userContext.accessibleFacilityIds;

    const executionEntry = await db.query.schemaFormDataEntries.findFirst({
      where: eq(schemaFormDataEntries.id, entryId),
    });

    if (!executionEntry) {
      return c.json({
        message: "Execution entry not found",
      }, HttpStatusCodes.NOT_FOUND);
    }

    if (!accessibleFacilityIds.includes(executionEntry.facilityId)) {
      return c.json(
        { message: "Access denied: facility not in your hierarchy" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    const documentsList = await db.query.documents.findMany({
      where: and(
        eq(documents.executionEntryId, entryId),
        eq(documents.isDeleted, false)
      ),
      orderBy: [desc(documents.uploadedAt)],
      with: {
        executionEntry: { 
          columns: { 
            id: true, 
            entityType: true,
            facilityId: true,
            projectId: true,
            reportingPeriodId: true,
          } 
        },
        uploader: { columns: { id: true, name: true, email: true } },
        verifier: { columns: { id: true, name: true, email: true } },
      },
    });

    return c.json({
      documents: documentsList,
      executionEntry: {
        id: executionEntry.id,
        entityType: executionEntry.entityType,
        facilityId: executionEntry.facilityId,
        projectId: executionEntry.projectId,
        reportingPeriodId: executionEntry.reportingPeriodId,
      },
    }, HttpStatusCodes.OK);
  } catch (error: any) {
    console.error('Error fetching documents by execution entry:', error);
    return c.json(
      { message: "Failed to fetch documents", error: error.message },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};
