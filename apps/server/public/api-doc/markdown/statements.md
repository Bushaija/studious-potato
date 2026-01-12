# Statements API Documentation

## Submit Statement

**POST** `/api/statements/{id}/submit`

Submit a statement for review.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Statement ID |

### Request Body

```json
{
  "comments": "string",
  "attachments": ["string"],
  "notifyUsers": [123, 456],
  "scheduledDate": "2024-01-15T10:00:00Z"
}
```

### Response

**200 OK**
```json
{
  "reportId": 42,
  "action": "submit",
  "previousStatus": "draft",
  "newStatus": "submitted",
  "actionBy": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "analyst"
  },
  "actionAt": "2024-01-15T10:30:00Z",
  "comments": "Ready for review",
  "validationResults": {
    "isValid": true,
    "errors": [],
    "warnings": ["Minor formatting issue"]
  }
}
```

**400 Bad Request**
```json
{
  "message": "Invalid submission request",
  "validationErrors": ["Missing required field"]
}
```

**404 Not Found**
```json
{
  "message": "Not Found"
}
```

---

## Approve Statement

**POST** `/api/statements/{id}/approve`

Approve a submitted statement.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Statement ID |

### Request Body

```json
{
  "comments": "string",
  "attachments": ["string"],
  "notifyUsers": [123, 456],
  "scheduledDate": "2024-01-15T10:00:00Z"
}
```

### Response

**200 OK** - Same structure as submit endpoint

**403 Forbidden**
```json
{
  "message": "Insufficient permissions to approve report"
}
```

**404 Not Found**
```json
{
  "message": "Not Found"
}
```

---

## Reject Statement

**POST** `/api/statements/{id}/reject`

Reject a submitted statement.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Statement ID |

### Request Body

```json
{
  "comments": "string",
  "attachments": ["string"],
  "notifyUsers": [123, 456],
  "scheduledDate": "2024-01-15T10:00:00Z"
}
```

### Response

**200 OK** - Same structure as submit endpoint

**404 Not Found**
```json
{
  "message": "Not Found"
}
```

---

## Request Changes

**POST** `/api/statements/{id}/request-changes`

Request changes to a submitted statement.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Statement ID |

### Request Body

```json
{
  "comments": "string",
  "attachments": ["string"],
  "notifyUsers": [123, 456],
  "scheduledDate": "2024-01-15T10:00:00Z"
}
```

### Response

**200 OK** - Same structure as submit endpoint

**404 Not Found**
```json
{
  "message": "Not Found"
}
```

---

## Recall Statement

**POST** `/api/statements/{id}/recall`

Recall a submitted statement.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Statement ID |

### Request Body

```json
{
  "comments": "string",
  "attachments": ["string"],
  "notifyUsers": [123, 456],
  "scheduledDate": "2024-01-15T10:00:00Z"
}
```

### Response

**200 OK** - Same structure as submit endpoint

**403 Forbidden**
```json
{
  "message": "Cannot recall report in current state"
}
```

**404 Not Found**
```json
{
  "message": "Not Found"
}
```

---

## Get Workflow History

**GET** `/api/statements/{id}/workflow-history`

Retrieve the workflow history for a statement.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Statement ID |

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page |

### Response

**200 OK**
```json
{
  "history": [
    {
      "id": 1,
      "reportId": 42,
      "action": "submit",
      "fromStatus": "draft",
      "toStatus": "submitted",
      "actionBy": 123,
      "actionByUser": {
        "id": 123,
        "name": "John Doe",
        "email": "john@example.com",
        "role": "analyst"
      },
      "comments": "Initial submission",
      "attachments": ["file1.pdf"],
      "metadata": {},
      "actionAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

**404 Not Found**
```json
{
  "message": "Not Found"
}
```

---

## Bulk Approval

**POST** `/api/statements/bulk-approval`

Perform bulk approval actions on multiple statements.

### Request Body

```json
{
  "reportIds": [1, 2, 3],
  "action": "approve",
  "comments": "Bulk approval",
  "skipValidation": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reportIds` | array | Yes | Array of statement IDs |
| `action` | string | Yes | Action: `submit`, `approve`, `reject`, `request_changes`, `recall` |
| `comments` | string | No | Comments for the action |
| `skipValidation` | boolean | No | Skip validation (default: false) |

### Response

**200 OK**
```json
{
  "successful": [
    {
      "reportId": 1,
      "action": "approve",
      "newStatus": "approved"
    }
  ],
  "failed": [
    {
      "reportId": 2,
      "error": "Validation failed",
      "validationErrors": ["Missing required field"]
    }
  ],
  "summary": {
    "totalProcessed": 3,
    "successCount": 2,
    "failureCount": 1
  }
}
```

**400 Bad Request**
```json
{
  "message": "Invalid bulk approval request"
}
```

---

## Get Approval Queue

**GET** `/api/statements/approval-queue`

Retrieve statements pending approval.

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | integer | Filter by user ID |
| `facilityId` | integer | Filter by facility ID |
| `projectType` | string | Filter by project type |
| `priority` | string | Filter by priority (`high`, `medium`, `low`) |
| `dueBefore` | string | Filter by due date |
| `status` | array | Filter by status |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 20) |

### Response

**200 OK**
```json
{
  "queue": [
    {
      "reportId": 42,
      "report": {
        "title": "Q1 Financial Statement",
        "reportCode": "FS-2024-Q1",
        "fiscalYear": "2024",
        "status": "submitted",
        "createdAt": "2024-01-01T00:00:00Z",
        "submittedAt": "2024-01-15T10:00:00Z"
      },
      "facility": {
        "id": 1,
        "name": "Main Office",
        "facilityType": "headquarters"
      },
      "project": {
        "id": 1,
        "name": "Financial Reporting",
        "projectType": "compliance"
      },
      "submitter": {
        "id": 123,
        "name": "John Doe",
        "email": "john@example.com"
      },
      "daysInQueue": 5,
      "priority": "high",
      "validationStatus": {
        "isValid": true,
        "errorCount": 0,
        "warningCount": 1
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  },
  "summary": {
    "totalPending": 15,
    "byPriority": {
      "high": 3,
      "medium": 8,
      "low": 4
    },
    "averageDaysInQueue": 3.2,
    "oldestSubmission": "2024-01-10T09:00:00Z"
  }
}
```

---

## Notification Preferences

### Get Preferences

**GET** `/api/statements/notification-preferences`

Retrieve user notification preferences.

### Response

**200 OK**
```json
{
  "userId": 123,
  "emailNotifications": true,
  "reportSubmitted": true,
  "reportApproved": true,
  "reportRejected": true,
  "changesRequested": true,
  "reminderNotifications": true,
  "reminderDays": 7
}
```

### Update Preferences

**PUT** `/api/statements/notification-preferences`

Update user notification preferences.

### Request Body

```json
{
  "emailNotifications": true,
  "reportSubmitted": true,
  "reportApproved": false,
  "reportRejected": true,
  "changesRequested": true,
  "reminderNotifications": false,
  "reminderDays": 3
}
```

### Response

**200 OK** - Same structure as GET response

---

## Common Response Fields

### Action Response Object

All workflow action endpoints return a consistent response structure:

| Field | Type | Description |
|-------|------|-------------|
| `reportId` | integer | Statement ID |
| `action` | string | Action performed |
| `previousStatus` | string | Status before action |
| `newStatus` | string | Status after action |
| `actionBy` | object | User who performed the action |
| `actionAt` | string | ISO timestamp of action |
| `comments` | string | Comments provided |
| `validationResults` | object | Validation results |

### Validation Results Object

| Field | Type | Description |
|-------|------|-------------|
| `isValid` | boolean | Whether the statement is valid |
| `errors` | array | Array of error messages |
| `warnings` | array | Array of warning messages |

