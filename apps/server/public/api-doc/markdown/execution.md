# Execution API Documentation

## GET /api/execution/quarterly-summary
Retrieve quarterly execution summary with financial balances.

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | integer | No | Filter by project ID |
| `facilityId` | integer | No | Filter by facility ID |
| `year` | integer | No | Filter by year |

### Status Codes
- **200** - Success

### Response Object
```json
{
  "quarters": {
    "Q1": {
      "totalReceipts": 250000,
      "totalExpenditures": 180000,
      "surplus": 70000,
      "netFinancialAssets": 320000,
      "closingBalance": 390000,
      "isBalanced": true
    },
    "Q2": {
      "totalReceipts": 280000,
      "totalExpenditures": 210000,
      "surplus": 70000,
      "netFinancialAssets": 350000,
      "closingBalance": 420000,
      "isBalanced": true
    }
  },
  "yearToDate": {
    "totalReceipts": 1050000,
    "totalExpenditures": 780000,
    "cumulativeSurplus": 270000,
    "finalClosingBalance": 420000
  }
}
```

---

## GET /api/execution
Retrieve a paginated list of execution data entries with filtering.

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | integer | No | Filter by project ID |
| `facilityId` | integer | No | Filter by facility ID |
| `reportingPeriodId` | integer | No | Filter by reporting period ID |
| `quarter` | string | No | Filter by quarter (`Q1`, `Q2`, `Q3`, `Q4`) |
| `year` | integer | No | Filter by year |
| `page` | integer | No | Page number - Default: `1` |
| `limit` | integer | No | Items per page (1-100) - Default: `20` |

### Status Codes
- **200** - Success

### Response Object
```json
{
  "data": [
    {
      "id": 1,
      "schemaId": 5,
      "entityId": 10,
      "entityType": "FACILITY",
      "projectId": 3,
      "facilityId": 15,
      "reportingPeriodId": 2,
      "formData": {
        "receipts_q1": 50000,
        "expenditures_q1": 35000,
        "opening_balance": 25000
      },
      "computedValues": {
        "surplus_q1": 15000,
        "closing_balance_q1": 40000
      },
      "validationState": {
        "isValid": true,
        "errors": [],
        "warnings": []
      },
      "metadata": {
        "submittedBy": "John Doe",
        "approvalStatus": "pending"
      },
      "createdBy": 1,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedBy": 1,
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## POST /api/execution
Create a new execution data entry.

### Request Body
```json
{
  "schemaId": 5,
  "projectId": 3,
  "facilityId": 15,
  "reportingPeriodId": 2,
  "formData": {
    "receipts_q1": 50000,
    "expenditures_q1": 35000,
    "opening_balance": 25000
  },
  "metadata": {
    "submittedBy": "John Doe",
    "notes": "Initial quarterly submission"
  }
}
```

### Required Fields
- `schemaId` (integer)
- `projectId` (integer)
- `facilityId` (integer)
- `formData` (object)

### Status Codes
- **201** - Execution data created successfully
- **400** - Validation error

### Response Object
Returns the created execution data entry with computed values and validation state.

---

## GET /api/execution/{id}
Retrieve a specific execution data entry by ID.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Execution data ID |

### Status Codes
- **200** - Success
- **404** - Execution data not found

### Response Object
Returns a single execution data entry with the same structure as in the GET list response.

---

## PUT /api/execution/{id}
Update an existing execution data entry.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Execution data ID |

### Request Body
Same structure as POST request, but all fields are optional.

### Status Codes
- **200** - Execution data updated successfully
- **404** - Execution data not found

### Response Object
Returns the updated execution data entry.

---

## DELETE /api/execution/{id}
Delete an execution data entry by ID.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Execution data ID |

### Status Codes
- **204** - Execution data deleted successfully
- **404** - Execution data not found

### Response Object
No content on successful deletion.

---

## POST /api/execution/calculate-balances
Calculate quarterly balances and validate accounting equations.

### Request Body
```json
{
  "executionId": 1,
  "data": {
    "receipts_q1": 50000,
    "expenditures_q1": 35000,
    "opening_balance": 25000,
    "financial_assets_q1": 75000,
    "financial_liabilities_q1": 20000
  }
}
```

### Required Fields
- `executionId` (integer)
- `data` (object)

### Status Codes
- **200** - Calculation successful

### Response Object
```json
{
  "receipts": {
    "q1": 50000,
    "q2": 60000,
    "q3": 55000,
    "q4": 65000,
    "cumulativeBalance": 230000
  },
  "expenditures": {
    "q1": 35000,
    "q2": 42000,
    "q3": 38000,
    "q4": 45000,
    "cumulativeBalance": 160000
  },
  "surplus": {
    "q1": 15000,
    "q2": 18000,
    "q3": 17000,
    "q4": 20000,
    "cumulativeBalance": 70000
  },
  "financialAssets": {
    "q1": 75000,
    "q2": 85000,
    "q3": 90000,
    "q4": 95000,
    "cumulativeBalance": 95000
  },
  "financialLiabilities": {
    "q1": 20000,
    "q2": 25000,
    "q3": 22000,
    "q4": 28000,
    "cumulativeBalance": 28000
  },
  "netFinancialAssets": {
    "q1": 55000,
    "q2": 60000,
    "q3": 68000,
    "q4": 67000,
    "cumulativeBalance": 67000
  },
  "closingBalance": {
    "q1": 40000,
    "q2": 58000,
    "q3": 75000,
    "q4": 95000,
    "cumulativeBalance": 95000
  },
  "isBalanced": true,
  "validationErrors": []
}
```

---

## POST /api/execution/validate-accounting-equation
Validate accounting equation balance with tolerance.

### Request Body
```json
{
  "data": {
    "netFinancialAssets": 67000,
    "closingBalance": 67000,
    "surplus": 70000,
    "opening_balance": 25000
  },
  "tolerance": 0.01
}
```

### Required Fields
- `data` (object)

### Status Codes
- **200** - Validation completed

### Response Object
```json
{
  "isValid": true,
  "netFinancialAssets": 67000,
  "closingBalance": 67000,
  "difference": 0,
  "errors": []
}
```

## Error Response Format
```json
{
  "message": "Error description"
}
```