# Migration API Documentation

## POST /api/migration/normalize-legacy-reports

Converts legacy financial report data to the new schema-driven format with field mappings and validations.

### Request Body

```json
{
  "legacyData": {
    "revenue": 1000000,
    "expenses": 800000,
    "profit": 200000
  },
  "targetSchemaId": 15,
  "projectId": 123,
  "facilityId": 456,
  "reportingPeriodId": 10,
  "mappingRules": {
    "revenue": "total_revenue",
    "expenses": "operating_expenses"
  },
  "validationMode": "strict",
  "preserveOriginal": true,
  "metadata": {
    "source": "legacy_system_v1",
    "migrationDate": "2024-04-01"
  }
}
```

### Response

**Status Code:** 200 OK

```json
{
  "migrationId": "mig_20240401_001",
  "status": "completed",
  "normalizedData": {
    "total_revenue": 1000000,
    "operating_expenses": 800000,
    "net_profit": 200000
  },
  "validationResults": {
    "isValid": true,
    "errors": [],
    "warnings": [
      "Some legacy fields could not be mapped automatically"
    ],
    "summary": {
      "totalFields": 15,
      "validFields": 14,
      "errorFields": 0,
      "warningFields": 1
    }
  },
  "mappingReport": {
    "appliedMappings": {
      "revenue": "total_revenue",
      "expenses": "operating_expenses"
    },
    "unmappedFields": [
      "legacy_field_x"
    ],
    "computedFields": [
      "net_profit"
    ],
    "transformations": [
      {
        "field": "revenue",
        "originalValue": 1000000,
        "transformedValue": 1000000,
        "rule": "direct_mapping"
      }
    ]
  },
  "createdAt": "2024-04-01T10:00:00Z",
  "estimatedCompletionTime": "2024-04-01T10:05:00Z"
}
```

**Status Code:** 400 Bad Request

```json
{
  "message": "Invalid request data",
  "validationErrors": [
    {
      "field": "targetSchemaId",
      "message": "Schema ID is required"
    }
  ]
}
```

**Status Code:** 422 Unprocessable Entity

```json
{
  "message": "Migration failed due to data inconsistencies",
  "migrationId": "mig_20240401_001",
  "errors": [
    "Data format incompatible with target schema",
    "Required fields missing in legacy data"
  ]
}
```

---

## POST /api/migration/validate-migration

Performs comprehensive validation of migration data including structure, references, and business rules.

### Request Body

```json
{
  "migrationId": "mig_20240401_001",
  "validationType": "structure",
  "includeWarnings": true,
  "customValidators": [
    "accounting_balance_check",
    "field_completeness"
  ]
}
```

### Response

**Status Code:** 200 OK

```json
{
  "migrationId": "mig_20240401_001",
  "isValid": false,
  "validationType": "structure",
  "results": {
    "structureValidation": {
      "isValid": false,
      "missingFields": [
        "required_field_1"
      ],
      "extraFields": [
        "unknown_field_x"
      ],
      "typeErrors": [
        {
          "field": "amount",
          "expectedType": "number",
          "actualType": "string"
        }
      ]
    },
    "dataValidation": {
      "isValid": true,
      "errors": [],
      "warnings": [
        "Some numeric values are outside expected range"
      ]
    },
    "referenceValidation": {
      "isValid": true,
      "brokenReferences": []
    },
    "businessRuleValidation": {
      "isValid": true,
      "violations": []
    }
  },
  "summary": {
    "totalChecks": 25,
    "passedChecks": 20,
    "failedChecks": 5,
    "warningCount": 3
  },
  "recommendations": [
    "Fix missing required fields before proceeding",
    "Review data types for numeric fields"
  ],
  "validatedAt": "2024-04-01T10:30:00Z"
}
```

**Status Code:** 400 Bad Request

```json
{
  "message": "Invalid validation request",
  "errors": [
    "Migration ID is required"
  ]
}
```

**Status Code:** 404 Not Found

```json
{
  "message": "Not Found"
}
```

---

## GET /api/migration/status/{id}

Retrieves current status, progress, and statistics for a specific migration.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Migration ID |

### Response

**Status Code:** 200 OK

```json
{
  "id": "mig_20240401_001",
  "type": "normalize_legacy_reports",
  "status": "in_progress",
  "progress": 65,
  "currentStep": "Validating transformed data",
  "totalSteps": 5,
  "startedAt": "2024-04-01T10:00:00Z",
  "completedAt": null,
  "estimatedTimeRemaining": 120,
  "statistics": {
    "recordsProcessed": 650,
    "recordsTotal": 1000,
    "recordsSuccessful": 640,
    "recordsFailed": 10,
    "recordsSkipped": 0
  },
  "errors": [
    {
      "timestamp": "2024-04-01T10:15:00Z",
      "error": "Invalid data format in record 45",
      "context": {
        "recordId": 45,
        "field": "amount"
      }
    }
  ],
  "warnings": [
    "Some records contain incomplete data"
  ],
  "metadata": {
    "batchSize": 100,
    "retryCount": 2
  },
  "createdBy": 101,
  "updatedAt": "2024-04-01T10:32:00Z"
}
```

**Status Code:** 404 Not Found

```json
{
  "message": "Not Found"
}
```

---

## POST /api/migration/schema-migration

Migrates form data from one schema version to another with field mappings and transformations.

### Request Body

```json
{
  "sourceSchemaId": 10,
  "targetSchemaId": 15,
  "entityIds": [1, 2, 3],
  "fieldMappings": {
    "old_revenue_field": "new_revenue_field",
    "old_expense_field": "new_expense_field"
  },
  "transformationRules": [
    {
      "sourceField": "amount",
      "targetField": "currency_amount",
      "transformFunction": "currency_conversion",
      "parameters": {
        "fromCurrency": "USD",
        "toCurrency": "RWF"
      }
    }
  ],
  "options": {
    "preserveOriginal": true,
    "validateAfterMigration": true,
    "allowPartialMigration": false,
    "batchSize": 100
  }
}
```

### Response

**Status Code:** 202 Accepted

```json
{
  "migrationId": "mig_schema_20240401_002",
  "message": "Schema migration initiated successfully",
  "estimatedTime": 300
}
```

**Status Code:** 400 Bad Request

```json
{
  "message": "Invalid schema migration request",
  "errors": [
    "Source and target schemas cannot be the same",
    "Invalid transformation function specified"
  ]
}
```

**Status Code:** 409 Conflict

```json
{
  "message": "Another migration is already in progress",
  "conflictingMigrations": [
    "mig_20240401_001"
  ]
}
```

---

## POST /api/migration/bulk-import

Imports data in bulk from CSV, Excel, JSON, or XML formats into the schema-driven system.

### Request Body

```json
{
  "importType": "csv",
  "schemaId": 15,
  "data": "base64encodedcsvdata...",
  "options": {
    "hasHeaders": true,
    "delimiter": ",",
    "encoding": "utf-8",
    "skipValidation": false,
    "allowPartialImport": false,
    "updateExisting": false
  },
  "fieldMappings": {
    "Revenue": "total_revenue",
    "Expenses": "operating_expenses"
  },
  "defaultValues": {
    "status": "draft",
    "created_by": 101
  },
  "metadata": {
    "source": "quarterly_report_q1_2024"
  }
}
```

### Response

**Status Code:** 202 Accepted

```json
{
  "migrationId": "mig_bulk_20240401_003",
  "message": "Bulk import initiated successfully",
  "previewData": [
    {
      "total_revenue": 50000,
      "operating_expenses": 30000,
      "status": "draft"
    }
  ],
  "statistics": {
    "totalRecords": 500,
    "validRecords": 485,
    "invalidRecords": 15
  }
}
```

**Status Code:** 400 Bad Request

```json
{
  "message": "Invalid import data format",
  "formatErrors": [
    "CSV header row is malformed",
    "Unsupported encoding detected"
  ]
}
```

**Status Code:** 413 Payload Too Large

```json
{
  "message": "Import data exceeds maximum size limit",
  "maxSize": 10485760,
  "actualSize": 15728640
}
```

---

## GET /api/migration/history

Retrieves paginated list of all migrations with their status and statistics.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 20) |
| `status` | string | No | Filter by status (`pending`, `in_progress`, `completed`, `failed`, `cancelled`) |
| `type` | string | No | Filter by type (`normalize_legacy_reports`, `schema_migration`, `data_transformation`, `bulk_import`) |
| `createdBy` | string | No | Filter by creator user ID |
| `dateFrom` | string | No | Filter by date range (from) |
| `dateTo` | string | No | Filter by date range (to) |

### Response

**Status Code:** 200 OK

```json
{
  "migrations": [
    {
      "id": "mig_20240401_001",
      "type": "normalize_legacy_reports",
      "status": "completed",
      "description": "Legacy Q4 2023 reports normalization",
      "startedAt": "2024-04-01T10:00:00Z",
      "completedAt": "2024-04-01T10:15:00Z",
      "createdBy": {
        "id": 101,
        "name": "John Doe",
        "email": "john.doe@company.com"
      },
      "statistics": {
        "recordsProcessed": 1000,
        "recordsSuccessful": 985,
        "recordsFailed": 15
      },
      "canRollback": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

## POST /api/migration/{id}/cancel

Cancels a currently running migration and performs cleanup.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Migration ID |

### Request Body

```json
{
  "reason": "User requested cancellation due to incorrect data"
}
```

### Response

**Status Code:** 200 OK

```json
{
  "message": "Migration cancelled successfully",
  "migrationId": "mig_20240401_001",
  "cancelledAt": "2024-04-01T10:45:00Z"
}
```

**Status Code:** 404 Not Found

```json
{
  "message": "Not Found"
}
```

**Status Code:** 409 Conflict

```json
{
  "message": "Migration cannot be cancelled in current state",
  "currentStatus": "completed"
}
```

---

## POST /api/migration/{id}/rollback

Reverts changes made by a completed migration, restoring original data.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Migration ID |

### Request Body

```json
{
  "migrationId": "mig_20240401_001",
  "rollbackReason": "Data inconsistencies found after migration",
  "preserveChanges": false
}
```

### Response

**Status Code:** 202 Accepted

```json
{
  "rollbackId": "rollback_20240401_001",
  "message": "Rollback initiated successfully",
  "originalMigrationId": "mig_20240401_001"
}
```

**Status Code:** 400 Bad Request

```json
{
  "message": "Migration cannot be rolled back",
  "reason": "Original data was not preserved during migration"
}
```

**Status Code:** 404 Not Found

```json
{
  "message": "Not Found"
}
```

---

## POST /api/migration/transform-data

Applies custom transformation rules to data without full migration.

### Request Body

```json
{
  "sourceData": [
    {
      "revenue": "1000000",
      "expense": "800000"
    }
  ],
  "transformationRules": [
    {
      "type": "value_transform",
      "config": {
        "field": "revenue",
        "function": "string_to_number"
      }
    },
    {
      "type": "field_rename",
      "config": {
        "from": "expense",
        "to": "expenses"
      }
    }
  ],
  "targetSchema": {
    "fields": [
      {
        "name": "revenue",
        "type": "number",
        "required": true
      },
      {
        "name": "expenses",
        "type": "number",
        "required": true
      }
    ]
  },
  "options": {
    "validateOutput": true,
    "preserveMetadata": true,
    "generateReport": true
  }
}
```

### Response

**Status Code:** 200 OK

```json
{
  "transformedData": [
    {
      "revenue": 1000000,
      "expenses": 800000
    }
  ],
  "transformationReport": {
    "totalRecords": 1,
    "successfulTransformations": 1,
    "failedTransformations": 0,
    "warnings": [],
    "appliedRules": [
      "string_to_number conversion",
      "field_rename: expense -> expenses"
    ]
  },
  "validationResults": {
    "migrationId": "transform_20240401_001",
    "isValid": true,
    "validationType": "structure",
    "results": {
      "structureValidation": {
        "isValid": true,
        "missingFields": [],
        "extraFields": [],
        "typeErrors": []
      },
      "dataValidation": {
        "isValid": true,
        "errors": [],
        "warnings": []
      },
      "referenceValidation": {
        "isValid": true,
        "brokenReferences": []
      },
      "businessRuleValidation": {
        "isValid": true,
        "violations": []
      }
    },
    "summary": {
      "totalChecks": 10,
      "passedChecks": 10,
      "failedChecks": 0,
      "warningCount": 0
    },
    "recommendations": [],
    "validatedAt": "2024-04-01T11:00:00Z"
  }
}
```

**Status Code:** 400 Bad Request

```json
{
  "message": "Transformation failed",
  "transformationErrors": [
    {
      "rule": "string_to_number",
      "error": "Invalid numeric value",
      "affectedRecords": 5
    }
  ]
}
```

---

## POST /api/migration/dry-run

Simulates migration process to identify potential issues without modifying data.

### Request Body

Accepts the same structure as any migration endpoint (normalize-legacy-reports, schema-migration, or bulk-import).

### Response

**Status Code:** 200 OK

```json
{
  "dryRunId": "dry_run_20240401_001",
  "simulationResults": {
    "wouldSucceed": true,
    "affectedRecords": 1000,
    "estimatedTime": 300,
    "potentialIssues": [
      {
        "severity": "warning",
        "message": "Some fields will be auto-generated",
        "affectedFields": ["created_at", "updated_at"]
      }
    ],
    "resourceRequirements": {
      "estimatedMemory": "50MB",
      "estimatedDiskSpace": "10MB",
      "estimatedDuration": "5 minutes"
    }
  },
  "validationResults": {
    "migrationId": "dry_run_20240401_001",
    "isValid": true,
    "validationType": "all",
    "results": {
      "structureValidation": {
        "isValid": true,
        "missingFields": [],
        "extraFields": [],
        "typeErrors": []
      },
      "dataValidation": {
        "isValid": true,
        "errors": [],
        "warnings": []
      },
      "referenceValidation": {
        "isValid": true,
        "brokenReferences": []
      },
      "businessRuleValidation": {
        "isValid": true,
        "violations": []
      }
    },
    "summary": {
      "totalChecks": 50,
      "passedChecks": 50,
      "failedChecks": 0,
      "warningCount": 1
    },
    "recommendations": [
      "Migration can proceed safely",
      "Consider running during low-traffic hours"
    ],
    "validatedAt": "2024-04-01T11:30:00Z"
  },
  "recommendations": [
    "Backup data before proceeding with actual migration",
    "Schedule migration during maintenance window"
  ]
}
```

**Status Code:** 400 Bad Request

```json
{
  "message": "Invalid dry run configuration",
  "configurationErrors": [
    "Source schema not found",
    "Invalid transformation rules"
  ]
}
```

## Migration Types

The API supports the following migration types:

- **normalize_legacy_reports**: Convert legacy data to new schema format
- **schema_migration**: Migrate between different schema versions
- **data_transformation**: Apply transformations without full migration
- **bulk_import**: Import data from external files

## Migration Status Values

- **pending**: Migration queued but not started
- **in_progress**: Currently executing
- **completed**: Successfully finished
- **failed**: Encountered errors and stopped
- **cancelled**: Manually cancelled by user