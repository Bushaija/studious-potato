# Statement Templates API Documentation

## Endpoints Overview

The Statement Templates API manages hierarchical financial statement templates with line items, calculations, and display rules for reporting purposes.

---

## POST /api/statement-templates

Create a new statement template.

### Request Body

```json
{
  "statementCode": "PL2024",
  "statementName": "Profit & Loss Statement 2024",
  "lineItem": "Total Revenue",
  "lineCode": "REV001",
  "parentLineId": null,
  "displayOrder": 1,
  "level": 1,
  "isTotalLine": false,
  "isSubtotalLine": false,
  "eventMappings": {
    "source": "revenue_events",
    "filters": ["active", "current_period"]
  },
  "calculationFormula": "SUM(line_items.amount)",
  "aggregationMethod": "SUM",
  "displayConditions": {
    "showWhen": "value > 0",
    "hideEmpty": true
  },
  "formatRules": {
    "currency": "USD",
    "decimals": 2,
    "style": "bold"
  },
  "metadata": {
    "description": "Primary revenue line",
    "category": "income"
  },
  "isActive": true
}
```

**Required fields:** `statementCode`, `statementName`, `lineItem`, `displayOrder`

**Field constraints:**
- `statementCode`: 1-50 characters
- `statementName`: 1-200 characters  
- `lineItem`: 1-300 characters
- `lineCode`: max 50 characters
- `displayOrder`: minimum 1
- `level`: 1-10, defaults to 1
- `aggregationMethod`: max 50 characters, defaults to "SUM"

### Response

**Status Code:** `201 Created`

Returns the created statement template object.

**Status Code:** `400 Bad Request`

```json
{
  "message": "Validation failed",
  "validationErrors": [
    {
      "field": "statementCode",
      "message": "Statement code is required"
    },
    {
      "field": "displayOrder",
      "message": "Display order must be greater than 0"
    }
  ]
}
```

---

## PUT /api/statement-templates/{id}

Update an entire statement template (full replacement).

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Statement template ID |

### Request Body

Same structure as POST request with same required fields.

### Response

**Status Code:** `200 OK`

Returns the updated statement template object.

**Status Code:** `400 Bad Request` / **Status Code:** `404 Not Found`

Same error structures as POST and GET endpoints.

---

## PATCH /api/statement-templates/{id}

Partially update a statement template.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Statement template ID |

### Request Body

```json
{
  "lineItem": "Updated Total Revenue",
  "isActive": false,
  "formatRules": {
    "currency": "EUR",
    "decimals": 2
  }
}
```

**All fields are optional** - same constraints as POST request.

### Response

**Status Code:** `200 OK`

Returns the updated statement template object.

**Status Code:** `404 Not Found`

```json
{
  "message": "Not Found"
}
```

---

## DELETE /api/statement-templates/{id}

Delete a statement template.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Statement template ID |

### Response

**Status Code:** `204 No Content`

**Status Code:** `404 Not Found`

```json
{
  "message": "Not Found"
}
```

**Status Code:** `409 Conflict`

```json
{
  "message": "Cannot delete template due to dependencies",
  "dependencies": ["child_templates", "active_statements"]
}
```

---

## POST /api/statement-templates/validate

Validate a statement template without creating it.

### Request Body

Same structure as POST create request.

### Response

**Status Code:** `200 OK`

```json
{
  "isValid": true,
  "errors": [
    {
      "field": "calculationFormula",
      "message": "Invalid formula syntax",
      "lineId": 5
    }
  ],
  "warnings": [
    {
      "field": "displayOrder",
      "message": "Display order conflicts with existing item",
      "lineId": 3
    }
  ]
}
```

---

## POST /api/statement-templates/bulk

Create multiple statement templates in batch.

### Request Body

```json
{
  "templates": [
    {
      "statementCode": "PL2024",
      "statementName": "Revenue Line",
      "lineItem": "Total Revenue",
      "displayOrder": 1
    },
    {
      "statementCode": "PL2024", 
      "statementName": "Expense Line",
      "lineItem": "Operating Expenses",
      "displayOrder": 2
    }
  ],
  "validateOnly": false
}
```

### Response

**Status Code:** `200 OK` (when validateOnly=true)

Returns validation results with same structure as validate endpoint.

**Status Code:** `201 Created`

```json
{
  "created": [
    {
      "id": 1,
      "statementCode": "PL2024",
      "statementName": "Revenue Line",
      "lineItem": "Total Revenue",
      "displayOrder": 1,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "errors": [
    {
      "index": 1,
      "error": "Validation failed: duplicate statement code"
    }
  ]
}
```

---

## PATCH /api/statement-templates/bulk

Update multiple statement templates in batch.

### Request Body

```json
{
  "updates": [
    {
      "id": 1,
      "data": {
        "lineItem": "Updated Revenue",
        "isActive": false
      }
    },
    {
      "id": 2,
      "data": {
        "displayOrder": 5
      }
    }
  ]
}
```

### Response

**Status Code:** `200 OK`

```json
{
  "updated": [
    {
      "id": 1,
      "statementCode": "PL2024",
      "lineItem": "Updated Revenue",
      "isActive": false,
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "errors": [
    {
      "id": 2,
      "error": "Template not found"
    }
  ]
}
```

---

## PATCH /api/statement-templates/reorder

Reorder statement template line items.

### Request Body

```json
{
  "statementCode": "PL2024",
  "reorderedItems": [
    {
      "id": 1,
      "displayOrder": 3,
      "level": 1,
      "parentLineId": null
    },
    {
      "id": 2,
      "displayOrder": 1,
      "level": 2,
      "parentLineId": 1
    }
  ]
}
```

### Response

**Status Code:** `200 OK`

```json
{
  "updated": [
    {
      "id": 1,
      "displayOrder": 3,
      "level": 1,
      "parentLineId": null,
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "message": "Successfully reordered 2 items"
}
```

**Status Code:** `400 Bad Request`

```json
{
  "message": "Reorder validation failed",
  "errors": [
    "Invalid hierarchy: child cannot be parent of its ancestor",
    "Duplicate display order values detected"
  ]
}
```

---

## GET /api/statement-templates/codes

Get available statement codes.

### Response

**Status Code:** `200 OK`

```json
{
  "codes": [
    {
      "code": "PL2024",
      "name": "Profit & Loss Statement 2024",
      "description": "Annual profit and loss reporting template"
    },
    {
      "code": "BS2024",
      "name": "Balance Sheet 2024",
      "description": "Year-end balance sheet template"
    }
  ]
}
```

---

## POST /api/statement-templates/{id}/duplicate

Duplicate an existing statement template.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Template ID to duplicate |

### Request Body

```json
{
  "newStatementCode": "PL2025",
  "newStatementName": "Profit & Loss Statement 2025",
  "includeChildren": true
}
```

### Response

**Status Code:** `201 Created`

```json
{
  "original": {
    "id": 1,
    "statementCode": "PL2024",
    "statementName": "Profit & Loss Statement 2024",
    "lineItem": "Total Revenue"
  },
  "duplicated": [
    {
      "id": 5,
      "statementCode": "PL2025",
      "statementName": "Profit & Loss Statement 2025",
      "lineItem": "Total Revenue",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Status Code:** `404 Not Found`

```json
{
  "message": "Not Found"
}
```

---

## Data Models

### Statement Template Object

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | integer | No | Unique identifier |
| `statementCode` | string | No | Statement identifier (1-50 chars) |
| `statementName` | string | No | Statement name (1-200 chars) |
| `lineItem` | string | No | Line item description (1-300 chars) |
| `lineCode` | string | Yes | Line item code (max 50 chars) |
| `parentLineId` | integer | Yes | Parent line for hierarchy |
| `displayOrder` | integer | No | Display order (min 1) |
| `level` | integer | No | Hierarchy level (1-10) |
| `isTotalLine` | boolean | No | Whether this is a total line |
| `isSubtotalLine` | boolean | No | Whether this is a subtotal line |
| `eventMappings` | object | No | Data source mappings |
| `calculationFormula` | string | Yes | Calculation expression |
| `aggregationMethod` | string | No | Aggregation method (max 50 chars) |
| `displayConditions` | object | No | Display rules |
| `formatRules` | object | No | Formatting rules |
| `metadata` | object | No | Additional metadata |
| `isActive` | boolean | No | Whether template is active |
| `createdAt` | string | No | Creation timestamp |
| `updatedAt` | string | No | Last update timestamp |

### Example Complex Objects

**Event Mappings:**
```json
{
  "source": "revenue_events",
  "filters": ["active", "current_period"],
  "aggregation": "monthly",
  "conditions": {
    "status": "completed",
    "amount": "> 0"
  }
}
```

**Display Conditions:**
```json
{
  "showWhen": "value > 0 OR parent.showAlways = true",
  "hideEmpty": true,
  "conditionalFormatting": {
    "negative": {"color": "red"},
    "zero": {"style": "italic"}
  }
}
```

**Format Rules:**
```json
{
  "currency": "USD",
  "decimals": 2,
  "style": "bold",
  "alignment": "right",
  "showParentheses": true,
  "thousandsSeparator": ","
}
```