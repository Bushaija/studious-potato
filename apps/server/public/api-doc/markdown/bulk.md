# Bulk Operations API Documentation

## Overview

The Bulk Operations API provides comprehensive data export, migration, and template management capabilities for the Budget Management System. It supports various export formats, asynchronous processing, and configurable templates for large-scale data operations.

## Base URL
```
https://api.budget-system.com/api/bulk
```

## Authentication
All endpoints require authentication via Bearer token in the Authorization header.

---

## Endpoints

### 1. Export Single Report

**Endpoint:** `POST /api/bulk/export/report/{id}`

**Parameters:**
- `id` (path): Report ID (number, required)

**Request Body:**
```json
{
  "format": "pdf|excel|csv|json|xml",
  "templateType": "default|detailed|summary|comparative|custom",
  "includeMetadata": true,
  "includeValidation": false,
  "includeHistory": false,
  "includeComparatives": false,
  "customFields": ["field1", "field2"],
  "filters": {}
}
```

**Status Codes:**
- `200 OK`: Export initiated successfully
- `400 Bad Request`: Invalid export parameters
- `404 Not Found`: Report not found

**Response:**
```json
{
  "exportId": "exp_12345",
  "format": "pdf",
  "filename": "report_2025.pdf",
  "fileSize": 2048576,
  "downloadUrl": "https://api.budget-system.com/downloads/exp_12345",
  "expiresAt": "2025-01-16T10:00:00Z",
  "metadata": {
    "recordsCount": 150,
    "generatedAt": "2025-01-15T10:00:00Z",
    "generatedBy": 123,
    "processingTime": 2.5,
    "checksum": "abc123def456"
  }
}
```

---

### 2. Bulk Export

**Endpoint:** `POST /api/bulk/export`

**Request Body:**
```json
{
  "exportType": "financial_reports|statement_templates|form_schemas|activities|event_mappings|system_configurations|audit_logs",
  "format": "pdf|excel|csv|json|xml",
  "filters": {
    "dateRange": {
      "startDate": "2025-01-01",
      "endDate": "2025-12-31"
    },
    "facilityIds": [1, 2, 3],
    "projectIds": [1, 2],
    "status": ["active", "draft"],
    "reportingPeriodIds": [2025]
  },
  "includeRelations": true,
  "includeInactive": false,
  "compression": true,
  "splitFiles": false,
  "maxFileSize": 52428800
}
```

**Status Codes:**
- `202 Accepted`: Bulk export queued successfully
- `400 Bad Request`: Invalid export parameters

**Response:**
```json
{
  "exportId": "bulk_67890",
  "status": "queued",
  "progress": {
    "current": 0,
    "total": 1000,
    "percentage": 0,
    "stage": "initializing"
  },
  "files": [],
  "metadata": {
    "totalRecords": 1000,
    "totalFiles": 1,
    "startedAt": "2025-01-15T10:00:00Z"
  }
}
```

---

### 3. Export Status

**Endpoint:** `GET /api/bulk/export/{exportId}/status`

**Parameters:**
- `exportId` (path): Export job ID (string, required)

**Status Codes:**
- `200 OK`: Export status retrieved
- `404 Not Found`: Export job not found

**Response:**
```json
{
  "exportId": "bulk_67890",
  "status": "processing",
  "progress": {
    "current": 450,
    "total": 1000,
    "percentage": 45,
    "stage": "generating_files",
    "message": "Processing financial reports..."
  },
  "startedAt": "2025-01-15T10:00:00Z",
  "estimatedTimeRemaining": 300
}
```

---

### 4. Download Export

**Endpoint:** `GET /api/bulk/export/{exportId}/download`

**Parameters:**
- `exportId` (path): Export job ID (string, required)
- `fileIndex` (query): File index for multi-file exports (integer, optional)

**Status Codes:**
- `200 OK`: File download (binary content)
- `404 Not Found`: Export file not found

**Response:** Binary file content with appropriate MIME type

---

### 5. Cancel Export

**Endpoint:** `POST /api/bulk/export/{exportId}/cancel`

**Parameters:**
- `exportId` (path): Export job ID (string, required)

**Status Codes:**
- `200 OK`: Export cancelled successfully
- `400 Bad Request`: Cannot cancel export in current state
- `404 Not Found`: Export job not found

**Response:**
```json
{
  "message": "Export cancelled successfully"
}
```

---

### 6. Migration Export

**Endpoint:** `POST /api/bulk/migration-export`

**Request Body:**
```json
{
  "sourceSystem": "legacy_system_v1",
  "targetFormat": "json",
  "migrationScope": "full_system|selective_data|configuration_only",
  "dataMapping": {},
  "transformationRules": [
    {
      "sourceField": "old_field",
      "targetField": "new_field",
      "transformation": "uppercase"
    }
  ],
  "validateData": true,
  "createBackup": true
}
```

**Status Codes:**
- `202 Accepted`: Migration export queued
- `400 Bad Request`: Invalid migration parameters

**Response:**
```json
{
  "exportId": "mig_54321",
  "status": "queued",
  "progress": {
    "current": 0,
    "total": 5000,
    "percentage": 0,
    "stage": "validation"
  },
  "files": [],
  "metadata": {
    "totalRecords": 5000,
    "totalFiles": 3,
    "startedAt": "2025-01-15T10:00:00Z"
  }
}
```

---

### 7. List Export Templates

**Endpoint:** `GET /api/bulk/export-templates`

**Query Parameters:**
- `templateType`: Template type filter (string, optional)
- `format`: Format filter (string, optional)
- `isPublic`: Public templates only (boolean, optional)
- `createdBy`: Creator filter (integer, optional)
- `page`: Page number (integer, default: 1)
- `limit`: Items per page (integer, default: 20)

**Status Codes:**
- `200 OK`: Templates retrieved successfully

**Response:**
```json
{
  "templates": [
    {
      "id": 1,
      "name": "Standard Financial Report",
      "description": "Default template for financial reports",
      "templateType": "default",
      "format": "pdf",
      "scope": "single_report",
      "configuration": {},
      "isActive": true,
      "isPublic": false,
      "createdBy": 123,
      "createdAt": "2025-01-01T10:00:00Z",
      "updatedAt": "2025-01-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

### 8. Create Export Template

**Endpoint:** `POST /api/bulk/export-templates`

**Request Body:**
```json
{
  "name": "Custom Report Template",
  "description": "Template for custom reports",
  "templateType": "custom",
  "format": "excel",
  "scope": "multiple_reports",
  "configuration": {
    "columns": ["id", "name", "amount"],
    "formatting": "standard"
  },
  "isActive": true,
  "isPublic": false,
  "createdBy": 123
}
```

**Status Codes:**
- `201 Created`: Template created successfully
- `400 Bad Request`: Invalid template data

**Response:** Returns created template object with generated ID

---

### 9. Get Export Template

**Endpoint:** `GET /api/bulk/export-templates/{id}`

**Parameters:**
- `id` (path): Template ID (number, required)

**Status Codes:**
- `200 OK`: Template retrieved successfully
- `404 Not Found`: Template not found

**Response:** Returns complete template object

---

### 10. Update Export Template

**Endpoint:** `PUT /api/bulk/export-templates/{id}`

**Parameters:**
- `id` (path): Template ID (number, required)

**Request Body:** Partial or complete template object

**Status Codes:**
- `200 OK`: Template updated successfully
- `400 Bad Request`: Invalid template data
- `404 Not Found`: Template not found

**Response:** Returns updated template object

---

### 11. Delete Export Template

**Endpoint:** `DELETE /api/bulk/export-templates/{id}`

**Parameters:**
- `id` (path): Template ID (number, required)

**Status Codes:**
- `204 No Content`: Template deleted successfully
- `404 Not Found`: Template not found

**Response:** No content

---

## Key Data Models

### Export Status Values
- `queued`: Export job queued for processing
- `processing`: Export job currently running
- `completed`: Export job finished successfully
- `failed`: Export job encountered an error
- `cancelled`: Export job was cancelled by user

### Export Types
- `financial_reports`: Budget and execution reports
- `statement_templates`: Financial statement templates
- `form_schemas`: Dynamic form configurations
- `activities`: Budget activity definitions
- `event_mappings`: Event-to-statement mappings
- `system_configurations`: System settings
- `audit_logs`: System audit trail

### Template Types
- `default`: Standard system template
- `detailed`: Comprehensive report template
- `summary`: High-level overview template
- `comparative`: Period comparison template
- `custom`: User-defined template

### Supported Formats
- `pdf`: Portable Document Format
- `excel`: Microsoft Excel format
- `csv`: Comma-Separated Values
- `json`: JavaScript Object Notation
- `xml`: Extensible Markup Language