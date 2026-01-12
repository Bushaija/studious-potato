# Planning Configuration API Documentation

## Overview

The Planning Configuration API provides endpoints for managing activity structures, templates, and configurations for financial planning systems. This API supports versioned activity configurations with project-specific and facility-type-specific structures.

## Base URL

```
/api/planning-config
```

## Authentication

All endpoints require authentication. Include your authentication token in the request headers.

## Data Models

### Activity Template
```typescript
{
  id: number,
  name: string,
  description: string | null,
  categoryType: string,
  tags: string[],
  isActive: boolean,
  metadata: Record<string, any> | null,
  createdAt: string,
  updatedAt: string
}
```

### Planning Category Version
```typescript
{
  id: number,
  categoryId: number,
  version: number,
  projectId: number,
  facilityType: "hospital" | "health_center",
  code: string,
  name: string,
  displayOrder: number,
  isActive: boolean,
  validFrom: string,
  validTo: string | null,
  changeReason: string | null
}
```

### Planning Activity Version
```typescript
{
  id: number,
  activityId: number,
  version: number,
  templateId: number | null,
  categoryVersionId: number,
  facilityType: "hospital" | "health_center",
  name: string,
  displayOrder: number,
  isTotalRow: boolean,
  isActive: boolean,
  validFrom: string,
  validTo: string | null,
  config: Record<string, any> | null,
  defaultFrequency: number | null,
  defaultUnitCost: number | null,
  changeReason: string | null
}
```

## Endpoints

### 1. Get Activity Structure

Retrieves the activity structure for a specific project and facility type.

**Endpoint:** `GET /planning-config/activities`

**Query Parameters:**
- `projectId` (optional): Project ID (number)
- `projectCode` (optional): Project code (string)
- `facilityType` (optional): "hospital" or "health_center"
- `version` (optional): Specific version number
- `active` (optional): Filter for active configurations only (boolean)

**Response:**
```json
{
  "categories": [
    {
      "id": 1,
      "categoryId": 1,
      "version": 1,
      "projectId": 1,
      "facilityType": "hospital",
      "code": "REV001",
      "name": "Revenue Category 1",
      "displayOrder": 1,
      "isActive": true,
      "validFrom": "2024-01-01T00:00:00Z",
      "validTo": null,
      "changeReason": null
    }
  ],
  "activities": [
    {
      "id": 1,
      "activityId": 1,
      "version": 1,
      "templateId": 1,
      "categoryVersionId": 1,
      "facilityType": "hospital",
      "name": "Activity 1",
      "displayOrder": 1,
      "isTotalRow": false,
      "isActive": true,
      "validFrom": "2024-01-01T00:00:00Z",
      "validTo": null,
      "config": {},
      "defaultFrequency": 12,
      "defaultUnitCost": 100.00,
      "changeReason": null
    }
  ],
  "templates": [
    {
      "id": 1,
      "name": "Template 1",
      "description": "Description",
      "categoryType": "revenue",
      "tags": ["tag1", "tag2"],
      "isActive": true,
      "metadata": {},
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Status Codes:**
- `200 OK`: Activity structure retrieved successfully
- `400 Bad Request`: Invalid query parameters
- `404 Not Found`: No activity structure found for the specified criteria

### 2. Create Activity Configuration

Creates a new activity configuration for a project and facility type.

**Endpoint:** `POST /planning-config/activities`

**Request Body:**
```json
{
  "projectId": 1,
  "facilityType": "hospital",
  "categories": [
    {
      "code": "REV001",
      "name": "Revenue Category 1",
      "displayOrder": 1,
      "activities": [
        {
          "name": "Activity 1",
          "displayOrder": 1,
          "isTotalRow": false,
          "config": {},
          "defaultFrequency": 12,
          "defaultUnitCost": 100.00
        }
      ]
    }
  ],
  "changeReason": "Initial configuration"
}
```

**Response:**
```json
{
  "message": "Activity configuration created successfully",
  "version": 1,
  "categoriesCreated": 1,
  "activitiesCreated": 1
}
```

**Status Codes:**
- `201 Created`: Configuration created successfully
- `400 Bad Request`: Invalid input data
- `409 Conflict`: Configuration already exists for this project/facility combination

### 3. Get Activity Templates

Retrieves a list of activity templates with optional filtering.

**Endpoint:** `GET /planning-config/templates`

**Query Parameters:**
- `categoryType` (optional): Filter by category type
- `tags` (optional): Comma-separated list of tags to filter by
- `active` (optional): Filter for active templates only (boolean)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Template 1",
      "description": "Description",
      "categoryType": "revenue",
      "tags": ["tag1", "tag2"],
      "isActive": true,
      "metadata": {},
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 4. Create Activity Template

Creates a new activity template.

**Endpoint:** `POST /planning-config/templates`

**Request Body:**
```json
{
  "name": "New Template",
  "description": "Template description",
  "categoryType": "revenue",
  "tags": ["tag1", "tag2"],
  "metadata": {
    "customField": "value"
  }
}
```

**Response:**
```json
{
  "id": 1,
  "name": "New Template",
  "description": "Template description",
  "categoryType": "revenue",
  "tags": ["tag1", "tag2"],
  "isActive": true,
  "metadata": {
    "customField": "value"
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Status Codes:**
- `201 Created`: Template created successfully
- `400 Bad Request`: Invalid input data
- `409 Conflict`: Template with this name and category already exists

### 5. Update Activity Template

Updates an existing activity template.

**Endpoint:** `PUT /planning-config/templates/{templateId}`

**Path Parameters:**
- `templateId`: Template ID (number)

**Request Body:**
```json
{
  "name": "Updated Template",
  "description": "Updated description",
  "categoryType": "revenue",
  "tags": ["tag1", "tag2", "tag3"],
  "metadata": {
    "customField": "updatedValue"
  }
}
```

**Response:** Returns the updated template object

**Status Codes:**
- `200 OK`: Template updated successfully
- `400 Bad Request`: Invalid input data
- `404 Not Found`: Template not found

### 6. Deactivate Activity Template

Deactivates an activity template (soft delete).

**Endpoint:** `DELETE /planning-config/templates/{templateId}`

**Path Parameters:**
- `templateId`: Template ID (number)

**Response:**
```json
{
  "message": "Activity template deactivated successfully"
}
```

**Status Codes:**
- `200 OK`: Template deactivated successfully
- `404 Not Found`: Template not found
- `409 Conflict`: Cannot deactivate template that is currently in use

### 7. Get Activities by Template

Retrieves all activities that use a specific template.

**Endpoint:** `GET /planning-config/templates/{templateId}/activities`

**Path Parameters:**
- `templateId`: Template ID (number)

**Response:**
```json
{
  "template": {
    "id": 1,
    "name": "Template 1",
    "description": "Description",
    "categoryType": "revenue",
    "tags": ["tag1", "tag2"],
    "isActive": true,
    "metadata": {},
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "activities": [
    {
      "id": 1,
      "activityId": 1,
      "version": 1,
      "templateId": 1,
      "categoryVersionId": 1,
      "facilityType": "hospital",
      "name": "Activity 1",
      "displayOrder": 1,
      "isTotalRow": false,
      "isActive": true,
      "validFrom": "2024-01-01T00:00:00Z",
      "validTo": null,
      "config": {},
      "defaultFrequency": 12,
      "defaultUnitCost": 100.00,
      "changeReason": null
    }
  ],
  "projectsUsing": [
    {
      "projectId": 1,
      "projectName": "Project 1",
      "facilityType": "hospital"
    }
  ]
}
```

**Status Codes:**
- `200 OK`: Activities retrieved successfully
- `404 Not Found`: Template not found

### 8. Create Individual Activity

Creates a single activity within an existing category.

**Endpoint:** `POST /planning-config/activity`

**Request Body:**
```json
{
  "projectId": 1,
  "facilityType": "hospital",
  "activity": {
    "name": "New Activity",
    "description": "Activity description",
    "categoryCode": "REV001",
    "displayOrder": 1,
    "isTotalRow": false,
    "templateId": 1,
    "config": {},
    "defaultFrequency": 12,
    "defaultUnitCost": 100.00,
    "changeReason": "Adding new activity"
  }
}
```

**Response:**
```json
{
  "message": "Individual activity created successfully",
  "activity": {
    "id": 1,
    "name": "New Activity",
    "categoryCode": "REV001",
    "displayOrder": 1,
    "isTotalRow": false,
    "defaultFrequency": 12,
    "defaultUnitCost": 100.00
  }
}
```

**Status Codes:**
- `201 Created`: Activity created successfully
- `400 Bad Request`: Invalid input data
- `404 Not Found`: Project or category not found
- `409 Conflict`: Activity already exists in this category

## Admin Endpoints

### 9. Get Project Structure

Retrieves the complete structure for a project including all versions.

**Endpoint:** `GET /admin/planning/projects/{projectId}/structure`

**Path Parameters:**
- `projectId`: Project ID (number)

**Response:**
```json
{
  "project": {
    "id": 1,
    "name": "Project 1",
    "code": "PROJ001",
    "description": "Project description"
  },
  "hospital": {
    "categories": [...],
    "activities": [...],
    "templates": [...]
  },
  "healthCenter": {
    "categories": [...],
    "activities": [...],
    "templates": [...]
  },
  "versions": [
    {
      "version": 1,
      "facilityType": "hospital",
      "createdAt": "2024-01-01T00:00:00Z",
      "createdBy": "user@example.com",
      "changeReason": "Initial version",
      "isActive": true
    }
  ]
}
```

**Status Codes:**
- `200 OK`: Project structure retrieved successfully
- `404 Not Found`: Project not found

### 10. Import Activity Configuration

Imports activities from templates or other projects.

**Endpoint:** `POST /admin/planning/projects/{projectId}/import`

**Path Parameters:**
- `projectId`: Project ID (number)

**Request Body:**
```json
{
  "sourceType": "templates",
  "templateIds": [1, 2, 3],
  "facilityType": "hospital",
  "replaceExisting": false,
  "changeReason": "Importing from templates"
}
```

**Response:**
```json
{
  "message": "Activities imported successfully",
  "version": 2,
  "imported": {
    "categories": 3,
    "activities": 15
  }
}
```

**Status Codes:**
- `200 OK`: Activities imported successfully
- `400 Bad Request`: Invalid import configuration
- `404 Not Found`: Source project or templates not found

### 11. Publish Activity Configuration

Publishes draft changes to active version.

**Endpoint:** `POST /admin/planning/projects/{projectId}/publish`

**Path Parameters:**
- `projectId`: Project ID (number)

**Request Body:**
```json
{
  "facilityType": "hospital",
  "version": 2,
  "changeReason": "Publishing new version"
}
```

**Response:**
```json
{
  "message": "Configuration published successfully",
  "publishedVersion": 2,
  "activatedAt": "2024-01-01T00:00:00Z"
}
```

**Status Codes:**
- `200 OK`: Configuration published successfully
- `400 Bad Request`: Invalid publish request
- `404 Not Found`: Project or version not found
- `409 Conflict`: Cannot publish - version has validation errors

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "ERROR_TYPE",
  "message": "Human-readable error message"
}
```

Common error types:
- `VALIDATION_ERROR`: Input validation failed
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource conflict (e.g., duplicate entries)
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions

## Usage Examples

### Creating a New Project Configuration

```bash
curl -X POST /api/planning-config/activities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "projectId": 1,
    "facilityType": "hospital",
    "categories": [
      {
        "code": "REV001",
        "name": "Revenue",
        "displayOrder": 1,
        "activities": [
          {
            "name": "Patient Fees",
            "displayOrder": 1,
            "isTotalRow": false,
            "defaultFrequency": 12,
            "defaultUnitCost": 50.00
          }
        ]
      }
    ],
    "changeReason": "Initial project setup"
  }'
```

### Retrieving Activity Structure

```bash
curl -X GET "/api/planning-config/activities?projectId=1&facilityType=hospital&active=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Creating a Template

```bash
curl -X POST /api/planning-config/templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Standard Revenue Template",
    "description": "Template for standard revenue activities",
    "categoryType": "revenue",
    "tags": ["standard", "revenue"],
    "metadata": {
      "department": "finance"
    }
  }'
```

## Versioning

The API supports versioned configurations where:
- Each project can have multiple versions of activity configurations
- Only one version per facility type can be active at a time
- Version history is maintained with change reasons
- Draft versions can be created and published when ready

## Best Practices

1. **Change Reasons**: Always provide meaningful change reasons when creating or updating configurations
2. **Validation**: Validate configurations before publishing to production
3. **Templates**: Use templates for consistent activity structures across projects
4. **Versioning**: Use versioning to maintain configuration history and rollback capabilities
5. **Testing**: Test configurations in draft mode before publishing

## Rate Limiting

The API implements rate limiting to ensure fair usage. Limits are applied per user and endpoint.

## Support

For API support and questions, please contact the development team or refer to the internal documentation system. 