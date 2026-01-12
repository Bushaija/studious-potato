# Categories API Documentation

## GET /api/categories
Retrieve a paginated list of categories with optional filtering.

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectType` | string | No | Filter by project type (`HIV`, `Malaria`, `TB`) |
| `facilityType` | string | No | Filter by facility type (`hospital`, `health_center`) |
| `parentCategoryId` | string | No | Filter by parent category ID |
| `isActive` | string | No | Filter by active status |
| `includeHierarchy` | string | No | Include hierarchy data (`true`, `false`) - Default: `false` |
| `page` | string | No | Page number - Default: `1` |
| `limit` | string | No | Items per page - Default: `20` |

### Status Codes
- **200** - Success

### Response Object
```json
{
  "data": [
    {
      "id": 1,
      "projectType": "HIV",
      "facilityType": "hospital",
      "code": "CAT001",
      "name": "Category Name",
      "description": "Category description",
      "displayOrder": 1,
      "parentCategoryId": null,
      "isComputed": false,
      "computationFormula": null,
      "metadata": {},
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

## POST /api/categories
Create a new category.

### Request Body
```json
{
  "projectType": "HIV",
  "facilityType": "hospital",
  "code": "CAT001",
  "name": "Category Name",
  "description": "Optional description",
  "displayOrder": 1,
  "parentCategoryId": 1,
  "isComputed": false,
  "computationFormula": "Optional formula",
  "metadata": {},
  "isActive": true
}
```

### Required Fields
- `code` (string, 1-50 characters)
- `name` (string, 1-200 characters)
- `displayOrder` (integer)

### Status Codes
- **201** - Category created successfully
- **400** - Invalid category data

### Response Object
Returns the created category object with the same structure as GET response.

---

## GET /api/categories/{id}
Retrieve a specific category by ID.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Category ID |

### Status Codes
- **200** - Success
- **404** - Category not found

### Response Object
Returns a single category object with the same structure as in the GET list response.

---

## PATCH /api/categories/{id}
Update an existing category.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Category ID |

### Request Body
Same structure as POST request, but all fields are optional.

### Status Codes
- **200** - Category updated successfully
- **404** - Category not found

### Response Object
Returns the updated category object.

---

## DELETE /api/categories/{id}
Delete a category by ID.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Category ID |

### Status Codes
- **204** - Category deleted successfully
- **404** - Category not found

### Response Object
No content on successful deletion.

---

## GET /api/categories/hierarchy
Retrieve categories in hierarchical structure.

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectType` | string | No | Filter by project type (`HIV`, `Malaria`, `TB`) |
| `facilityType` | string | No | Filter by facility type (`hospital`, `health_center`) |
| `rootOnly` | string | No | Return only root categories (`true`, `false`) - Default: `false` |

### Status Codes
- **200** - Success

### Response Object
```json
[
  {
    "id": 1,
    "code": "CAT001",
    "name": "Parent Category",
    "displayOrder": 1,
    "children": [
      {
        "id": 2,
        "code": "CAT002",
        "name": "Child Category",
        "displayOrder": 1,
        "children": []
      }
    ]
  }
]
```

## Error Response Format
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```