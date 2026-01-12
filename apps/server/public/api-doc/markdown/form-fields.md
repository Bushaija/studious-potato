# Form Fields API Documentation

## GET /api/form-fields

Retrieves a paginated list of form fields with optional filtering.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaId` | string | No | Filter by schema ID |
| `categoryId` | string | No | Filter by category ID |
| `parentFieldId` | string | No | Filter by parent field ID |
| `fieldType` | string | No | Filter by field type (`text`, `number`, `currency`, `percentage`, `date`, `select`, `multiselect`, `checkbox`, `textarea`, `calculated`, `readonly`) |
| `isVisible` | string | No | Filter by visibility (`true`, `false`) |
| `isEditable` | string | No | Filter by editability (`true`, `false`) |
| `page` | string | No | Page number for pagination |
| `limit` | string | No | Items per page |

### Response

**Status Code:** 200 OK

```json
{
  "data": [
    {
      "id": 1,
      "schemaId": 10,
      "fieldKey": "total_revenue",
      "label": "Total Revenue",
      "fieldType": "currency",
      "isRequired": true,
      "displayOrder": 1,
      "parentFieldId": null,
      "categoryId": 5,
      "fieldConfig": {
        "currency": "RWF",
        "precision": 2
      },
      "validationRules": {
        "min": 0,
        "max": 999999999
      },
      "computationFormula": null,
      "defaultValue": 0,
      "helpText": "Enter the total revenue for the reporting period",
      "isVisible": true,
      "isEditable": true,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-20T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

## POST /api/form-fields

Creates a new form field.

### Request Body

```json
{
  "schemaId": 10,
  "fieldKey": "operating_expenses",
  "label": "Operating Expenses",
  "fieldType": "currency",
  "isRequired": true,
  "displayOrder": 2,
  "parentFieldId": null,
  "categoryId": 5,
  "fieldConfig": {
    "currency": "RWF",
    "precision": 2
  },
  "validationRules": {
    "min": 0
  },
  "computationFormula": null,
  "defaultValue": null,
  "helpText": "Enter total operating expenses",
  "isVisible": true,
  "isEditable": true
}
```

### Response

**Status Code:** 201 Created

```json
{
  "id": 46,
  "schemaId": 10,
  "fieldKey": "operating_expenses",
  "label": "Operating Expenses",
  "fieldType": "currency",
  "isRequired": true,
  "displayOrder": 2,
  "parentFieldId": null,
  "categoryId": 5,
  "fieldConfig": {
    "currency": "RWF",
    "precision": 2
  },
  "validationRules": {
    "min": 0
  },
  "computationFormula": null,
  "defaultValue": null,
  "helpText": "Enter total operating expenses",
  "isVisible": true,
  "isEditable": true,
  "createdAt": "2024-04-01T10:00:00Z",
  "updatedAt": "2024-04-01T10:00:00Z"
}
```

**Status Code:** 400 Bad Request

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid field data provided"
}
```

---

## POST /api/form-fields/bulk

Creates multiple form fields in a single request.

### Request Body

```json
{
  "fields": [
    {
      "schemaId": 10,
      "fieldKey": "field_1",
      "label": "Field One",
      "fieldType": "text",
      "isRequired": false,
      "displayOrder": 3,
      "parentFieldId": null,
      "categoryId": 5,
      "fieldConfig": {},
      "validationRules": {},
      "helpText": "First field",
      "isVisible": true,
      "isEditable": true
    },
    {
      "schemaId": 10,
      "fieldKey": "field_2",
      "label": "Field Two",
      "fieldType": "number",
      "isRequired": true,
      "displayOrder": 4,
      "parentFieldId": null,
      "categoryId": 5,
      "fieldConfig": {},
      "validationRules": {
        "min": 1
      },
      "helpText": "Second field",
      "isVisible": true,
      "isEditable": true
    }
  ]
}
```

### Response

**Status Code:** 201 Created

```json
{
  "created": [
    {
      "id": 47,
      "schemaId": 10,
      "fieldKey": "field_1",
      "label": "Field One",
      "fieldType": "text",
      "isRequired": false,
      "displayOrder": 3,
      "parentFieldId": null,
      "categoryId": 5,
      "fieldConfig": {},
      "validationRules": {},
      "computationFormula": null,
      "defaultValue": null,
      "helpText": "First field",
      "isVisible": true,
      "isEditable": true,
      "createdAt": "2024-04-01T11:00:00Z",
      "updatedAt": "2024-04-01T11:00:00Z"
    }
  ],
  "errors": [
    {
      "index": 1,
      "error": "Duplicate fieldKey 'field_2' already exists"
    }
  ]
}
```

**Status Code:** 400 Bad Request

```json
{
  "error": "INVALID_BULK_DATA",
  "message": "Invalid bulk field data"
}
```

---

## PATCH /api/form-fields/bulk

Updates multiple form fields in a single request.

### Request Body

```json
{
  "fields": [
    {
      "id": 47,
      "data": {
        "label": "Updated Field One",
        "helpText": "Updated help text",
        "isRequired": true
      }
    },
    {
      "id": 48,
      "data": {
        "displayOrder": 10,
        "isVisible": false
      }
    }
  ]
}
```

### Response

**Status Code:** 200 OK

```json
{
  "updated": [
    {
      "id": 47,
      "schemaId": 10,
      "fieldKey": "field_1",
      "label": "Updated Field One",
      "fieldType": "text",
      "isRequired": true,
      "displayOrder": 3,
      "parentFieldId": null,
      "categoryId": 5,
      "fieldConfig": {},
      "validationRules": {},
      "computationFormula": null,
      "defaultValue": null,
      "helpText": "Updated help text",
      "isVisible": true,
      "isEditable": true,
      "createdAt": "2024-04-01T11:00:00Z",
      "updatedAt": "2024-04-01T12:00:00Z"
    }
  ],
  "errors": [
    {
      "id": 48,
      "error": "Field not found"
    }
  ]
}
```

---

## GET /api/form-fields/{id}

Retrieves a specific form field by ID.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Form field ID |

### Response

**Status Code:** 200 OK

```json
{
  "id": 1,
  "schemaId": 10,
  "fieldKey": "total_revenue",
  "label": "Total Revenue",
  "fieldType": "currency",
  "isRequired": true,
  "displayOrder": 1,
  "parentFieldId": null,
  "categoryId": 5,
  "fieldConfig": {
    "currency": "RWF",
    "precision": 2
  },
  "validationRules": {
    "min": 0,
    "max": 999999999
  },
  "computationFormula": null,
  "defaultValue": 0,
  "helpText": "Enter the total revenue for the reporting period",
  "isVisible": true,
  "isEditable": true,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-20T14:30:00Z"
}
```

**Status Code:** 404 Not Found

```json
{
  "message": "Not Found"
}
```

---

## PATCH /api/form-fields/{id}

Updates a specific form field.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Form field ID |

### Request Body

```json
{
  "label": "Updated Total Revenue",
  "helpText": "Updated help text for revenue field",
  "isRequired": false,
  "fieldConfig": {
    "currency": "USD",
    "precision": 2
  }
}
```

### Response

**Status Code:** 200 OK

Returns the updated form field object with the same structure as the GET response.

**Status Code:** 400 Bad Request

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid field data provided"
}
```

**Status Code:** 404 Not Found

```json
{
  "message": "Not Found"
}
```

---

## DELETE /api/form-fields/{id}

Deletes a form field.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Form field ID |

### Response

**Status Code:** 204 No Content

**Status Code:** 404 Not Found

```json
{
  "message": "Not Found"
}
```

---

## PATCH /api/form-fields/reorder

Updates the display order of multiple form fields.

### Request Body

```json
{
  "fieldOrders": [
    {
      "id": 1,
      "displayOrder": 5
    },
    {
      "id": 2,
      "displayOrder": 1
    },
    {
      "id": 3,
      "displayOrder": 3
    }
  ]
}
```

### Response

**Status Code:** 200 OK

```json
{
  "updated": [
    {
      "id": 1,
      "schemaId": 10,
      "fieldKey": "total_revenue",
      "label": "Total Revenue",
      "fieldType": "currency",
      "isRequired": true,
      "displayOrder": 5,
      "parentFieldId": null,
      "categoryId": 5,
      "fieldConfig": {
        "currency": "RWF",
        "precision": 2
      },
      "validationRules": {
        "min": 0
      },
      "computationFormula": null,
      "defaultValue": 0,
      "helpText": "Enter the total revenue",
      "isVisible": true,
      "isEditable": true,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-04-01T13:00:00Z"
    }
  ],
  "message": "Field orders updated successfully"
}
```

**Status Code:** 400 Bad Request

```json
{
  "error": "INVALID_REORDER_DATA",
  "message": "Invalid reorder data provided"
}
```

---

## GET /api/form-fields/schema/{schemaId}

Retrieves all form fields for a specific schema.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaId` | string | Yes | Schema ID (numeric pattern) |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `includeHidden` | string | No | Include hidden fields (`true`, `false`, default: `false`) |
| `categoryId` | string | No | Filter by category ID |

### Response

**Status Code:** 200 OK

```json
[
  {
    "id": 1,
    "schemaId": 10,
    "fieldKey": "total_revenue",
    "label": "Total Revenue",
    "fieldType": "currency",
    "isRequired": true,
    "displayOrder": 1,
    "parentFieldId": null,
    "categoryId": 5,
    "fieldConfig": {
      "currency": "RWF",
      "precision": 2
    },
    "validationRules": {
      "min": 0
    },
    "computationFormula": null,
    "defaultValue": 0,
    "helpText": "Enter the total revenue",
    "isVisible": true,
    "isEditable": true,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-20T14:30:00Z"
  },
  {
    "id": 2,
    "schemaId": 10,
    "fieldKey": "net_profit",
    "label": "Net Profit",
    "fieldType": "calculated",
    "isRequired": false,
    "displayOrder": 2,
    "parentFieldId": null,
    "categoryId": 5,
    "fieldConfig": {},
    "validationRules": {},
    "computationFormula": "total_revenue - operating_expenses",
    "defaultValue": null,
    "helpText": "Automatically calculated net profit",
    "isVisible": true,
    "isEditable": false,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-20T14:30:00Z"
  }
]
```

## Field Types

The API supports the following field types:

- **text**: Single-line text input
- **number**: Numeric input
- **currency**: Currency amount with formatting
- **percentage**: Percentage value
- **date**: Date picker
- **select**: Single selection dropdown
- **multiselect**: Multiple selection dropdown
- **checkbox**: Boolean checkbox
- **textarea**: Multi-line text input
- **calculated**: Auto-calculated field based on formula
- **readonly**: Display-only field