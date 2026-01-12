# Computation API Documentation

## POST /api/computation/calculate-values
Execute formulas and calculate computed values with tracing.

### Request Body
```json
{
  "schemaId": 1,
  "data": {
    "field1": 100,
    "field2": 50
  },
  "calculations": [
    {
      "fieldId": "total",
      "formula": "field1 + field2",
      "dependencies": ["field1", "field2"]
    }
  ]
}
```

### Required Fields
- `schemaId` (integer)
- `data` (object)

### Status Codes
- **200** - Calculation successful
- **400** - Calculation error

### Response Object
```json
{
  "computedValues": {
    "total": 150
  },
  "calculationTrace": [
    {
      "fieldId": "total",
      "formula": "field1 + field2",
      "inputs": {"field1": 100, "field2": 50},
      "result": 150,
      "executionTime": 0.05,
      "error": null
    }
  ],
  "errors": [],
  "warnings": []
}
```

---

## POST /api/computation/aggregate-totals
Perform aggregation operations on data sets.

### Request Body
```json
{
  "data": [
    {"amount": 100, "category": "A"},
    {"amount": 200, "category": "B"}
  ],
  "aggregationRules": [
    {
      "fieldId": "totalAmount",
      "aggregationType": "SUM",
      "sourceFields": ["amount"],
      "filters": {}
    }
  ]
}
```

### Aggregation Types
- `SUM`, `AVERAGE`, `COUNT`, `MIN`, `MAX`, `MEDIAN`

### Status Codes
- **200** - Aggregation successful

### Response Object
```json
{
  "aggregatedValues": {
    "totalAmount": 300
  },
  "itemCount": 2,
  "processedFields": ["amount"]
}
```

---

## POST /api/computation/variance-analysis
Analyze variances between planned and actual values.

### Request Body
```json
{
  "plannedData": {
    "budget": 1000,
    "expenses": 800
  },
  "actualData": {
    "budget": 950,
    "expenses": 850
  },
  "analysisType": "budget_vs_actual",
  "toleranceThreshold": 0.05
}
```

### Analysis Types
- `budget_vs_actual`, `quarter_vs_quarter`, `year_over_year`

### Status Codes
- **200** - Analysis successful

### Response Object
```json
{
  "summary": {
    "totalVariance": -50,
    "averageVariance": -25,
    "significantVariances": 1,
    "overBudgetItems": 1,
    "underBudgetItems": 1
  },
  "fieldAnalysis": [
    {
      "fieldId": "budget",
      "planned": 1000,
      "actual": 950,
      "variance": -50,
      "percentageVariance": -5.0,
      "isSignificant": true,
      "status": "under_budget"
    }
  ],
  "recommendations": [
    {
      "fieldId": "budget",
      "priority": "medium",
      "message": "Budget underutilized by 5%",
      "suggestedAction": "Review allocation strategy"
    }
  ]
}
```

---

## POST /api/computation/validate-formula
Validate formula syntax and dependencies.

### Request Body
```json
{
  "formula": "field1 + field2 * 0.1",
  "context": {
    "availableFields": ["field1", "field2"],
    "functions": ["SUM", "AVERAGE"],
    "testData": {
      "field1": 100,
      "field2": 50
    }
  }
}
```

### Status Codes
- **200** - Validation complete

### Response Object
```json
{
  "isValid": true,
  "syntax": {
    "isValidSyntax": true,
    "syntaxErrors": []
  },
  "dependencies": {
    "requiredFields": ["field1", "field2"],
    "missingFields": [],
    "circularDependencies": []
  },
  "testResult": {
    "result": 105,
    "executionTime": 0.02,
    "error": null
  },
  "warnings": []
}
```

---

## POST /api/computation/financial-ratios
Calculate and analyze financial ratios.

### Request Body
```json
{
  "data": {
    "currentAssets": 10000,
    "currentLiabilities": 5000,
    "totalDebt": 3000,
    "totalEquity": 7000
  },
  "ratios": [
    "current_ratio",
    "debt_to_equity"
  ]
}
```

### Available Ratios
- `current_ratio`, `quick_ratio`, `debt_to_equity`
- `return_on_assets`, `budget_execution_rate`
- `expenditure_ratio`, `surplus_ratio`

### Status Codes
- **200** - Calculation successful

### Response Object
```json
{
  "ratios": [
    {
      "ratioName": "current_ratio",
      "value": 2.0,
      "formula": "currentAssets / currentLiabilities",
      "interpretation": "Good liquidity position",
      "benchmark": 1.5,
      "status": "good"
    }
  ],
  "summary": {
    "overallScore": 75,
    "riskLevel": "medium",
    "keyInsights": [
      "Strong liquidity position",
      "Moderate debt levels"
    ]
  }
}
```

---

## POST /api/computation/optimize-formulas
Optimize formulas for performance and maintainability.

### Request Body
```json
{
  "formulas": [
    {
      "fieldId": "calculation1",
      "formula": "SUM(field1, field2, field3) + field4 * 0.1",
      "priority": "high"
    }
  ],
  "optimizationGoals": [
    "performance",
    "accuracy"
  ]
}
```

### Optimization Goals
- `performance`, `accuracy`, `maintainability`

### Priority Levels
- `high`, `medium`, `low`

### Status Codes
- **200** - Optimization successful

### Response Object
```json
{
  "optimizedFormulas": [
    {
      "fieldId": "calculation1",
      "originalFormula": "SUM(field1, field2, field3) + field4 * 0.1",
      "optimizedFormula": "(field1 + field2 + field3) + field4 * 0.1",
      "improvementType": "function_simplification",
      "performanceGain": 15.2,
      "risks": []
    }
  ],
  "recommendations": [
    "Consider caching intermediate calculations",
    "Use batch operations for multiple formulas"
  ]
}
```

## Error Response Format
```json
{
  "message": "Error description",
  "errors": ["Detailed error messages"]
}
```