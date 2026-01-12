# Planning Schema Validation by Project Type

## Overview

This document explains how schema validation works in the planning module and how it differs (or doesn't differ) across project types (HIV, Malaria, TB).

---

## Key Finding: Validation is Mostly Universal

**Important:** The validation rules are **largely the same** across all project types. The system uses a **generic validation framework** that applies consistent rules regardless of project type.

```
Same Validation Logic + Same Data Structure = Consistent Validation Across Projects
```

---

## 1. Validation Architecture

### Three-Layer Validation System

```
┌─────────────────────────────────────────┐
│   Layer 1: Schema-Level Validation     │
│   (Form Schema Definition)              │
│   - Field types                         │
│   - Required fields                     │
│   - Field constraints                   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Layer 2: Activity-Level Validation   │
│   (Dynamic Activities)                  │
│   - Activity-specific rules             │
│   - Computation rules                   │
│   - Field mappings                      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Layer 3: Custom Validation Rules     │
│   (Formula-Based Validation)            │
│   - Cross-field validation              │
│   - Business logic validation           │
│   - Conditional rules                   │
└─────────────────────────────────────────┘
```

---

## 2. Universal Validation Rules

### Common Rules (All Project Types)

These validation rules apply to **ALL** project types (HIV, Malaria, TB):

```typescript
// Stored in dynamic_activities.validationRules
{
  unitCost: { 
    required: true, 
    min: 0 
  },
  counts: { 
    required: true, 
    min: 0 
  }
}
```

### Field-Level Validation

```typescript
// Applied to ALL activities regardless of project type
{
  // Unit Cost Validation
  unit_cost: {
    type: 'number',
    required: true,
    min: 0,
    errorMessage: 'Unit cost must be greater than or equal to 0'
  },
  
  // Frequency Validation
  frequency: {
    type: 'number',
    required: true,
    min: 0,
    errorMessage: 'Frequency must be greater than or equal to 0'
  },
  
  // Quarterly Count Validation
  q1_count: {
    type: 'number',
    required: true,
    min: 0,
    errorMessage: 'Q1 count must be greater than or equal to 0'
  },
  q2_count: {
    type: 'number',
    required: true,
    min: 0,
    errorMessage: 'Q2 count must be greater than or equal to 0'
  },
  q3_count: {
    type: 'number',
    required: true,
    min: 0,
    errorMessage: 'Q3 count must be greater than or equal to 0'
  },
  q4_count: {
    type: 'number',
    required: true,
    min: 0,
    errorMessage: 'Q4 count must be greater than or equal to 0'
  }
}
```

---

## 3. Validation Service Implementation

### How Validation Works

```typescript
// From validation.service.ts
async validateFormData(schemaId: number, data: Record<string, any>) {
  // 1. Fetch form schema
  const schema = await db.query.formSchemas.findFirst({
    where: eq(formSchemas.id, schemaId),
    with: { formFields: true }
  });

  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 2. Validate each field
  for (const field of schema.formFields) {
    const value = data[field.fieldKey];
    
    // 2a. Check required fields
    if (field.isRequired && !value) {
      errors.push({
        field: field.fieldKey,
        message: `${field.label} is required`,
        code: 'REQUIRED',
        severity: 'error'
      });
    }

    // 2b. Validate field type and constraints
    if (value !== undefined && value !== null) {
      const fieldErrors = this.validateFieldValue(field, value);
      errors.push(...fieldErrors);
    }

    // 2c. Apply custom validation rules
    if (field.validationRules) {
      const customErrors = await this.applyCustomValidations(
        field, 
        value, 
        data
      );
      errors.push(...customErrors.errors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
```

### Field Type Validation

```typescript
private validateFieldValue(field: any, value: any): ValidationError[] {
  const errors: ValidationError[] = [];
  
  switch (field.fieldType) {
    case 'number':
    case 'currency':
      // Validate it's a number
      if (!Number.isFinite(Number(value))) {
        errors.push({
          field: field.fieldKey,
          message: `${field.label} must be a valid number`,
          code: 'INVALID_NUMBER',
          severity: 'error'
        });
      }
      
      // Check min/max constraints
      const numValue = Number(value);
      const config = field.fieldConfig || {};
      
      if (config.min !== undefined && numValue < config.min) {
        errors.push({
          field: field.fieldKey,
          message: `${field.label} must be at least ${config.min}`,
          code: 'MIN_VALUE',
          severity: 'error'
        });
      }
      
      if (config.max !== undefined && numValue > config.max) {
        errors.push({
          field: field.fieldKey,
          message: `${field.label} must not exceed ${config.max}`,
          code: 'MAX_VALUE',
          severity: 'error'
        });
      }
      break;
      
    case 'text':
      // String length validation
      if (typeof value !== 'string') {
        errors.push({
          field: field.fieldKey,
          message: `${field.label} must be text`,
          code: 'INVALID_TYPE',
          severity: 'error'
        });
      }
      break;
      
    case 'date':
      // Date validation
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        errors.push({
          field: field.fieldKey,
          message: `${field.label} must be a valid date`,
          code: 'INVALID_DATE',
          severity: 'error'
        });
      }
      break;
  }
  
  return errors;
}
```

---

## 4. Project-Specific Validation Differences

### Where Differences Could Exist

While the **validation logic is universal**, project-specific differences can be configured through:

#### 4.1 Activity Metadata

```typescript
// HIV Activity Example
{
  id: 101,
  name: "DH Medical Dr. Salary",
  projectType: "HIV",
  validationRules: {
    unitCost: { required: true, min: 0 },
    counts: { required: true, min: 0 }
  },
  metadata: {
    categoryCode: "HR",
    frequencyNote: "12 months per year",
    // Could add project-specific validation hints
    expectedFrequency: 12,
    expectedRange: { min: 3000, max: 10000 }
  }
}

// Malaria Activity Example
{
  id: 201,
  name: "Participants at DHs staff",
  projectType: "Malaria",
  validationRules: {
    unitCost: { required: true, min: 0 },
    counts: { required: true, min: 0 }
  },
  metadata: {
    categoryCode: "EPID",
    frequencyNote: "4 quarterly sessions",
    // Different metadata but same validation rules
    expectedFrequency: 4,
    expectedRange: { min: 20, max: 100 }
  }
}
```

#### 4.2 Custom Validation Rules (Formula-Based)

Custom validation rules can be added per activity using formulas:

```typescript
// Example: HIV Salary Activity with custom validation
{
  validationRules: [
    {
      type: 'custom',
      formula: 'unit_cost >= 3000 && unit_cost <= 10000',
      message: 'Medical doctor salary should be between $3,000 and $10,000',
      severity: 'warning', // Warning, not error
      enabled: true
    },
    {
      type: 'custom',
      formula: 'frequency === 12',
      message: 'Salary frequency should be 12 (monthly)',
      severity: 'warning',
      enabled: true
    }
  ]
}

// Example: Malaria Training Activity with custom validation
{
  validationRules: [
    {
      type: 'custom',
      formula: 'frequency === 4',
      message: 'Training frequency should be 4 (quarterly)',
      severity: 'warning',
      enabled: true
    },
    {
      type: 'custom',
      formula: 'q1_count === q2_count && q2_count === q3_count && q3_count === q4_count',
      message: 'Training participants should be consistent across quarters',
      severity: 'warning',
      enabled: true
    }
  ]
}
```

---

## 5. Validation Error Types

### Hard Errors (Block Submission)

These prevent form submission:

```typescript
{
  field: 'unit_cost',
  message: 'Unit cost is required',
  code: 'REQUIRED',
  severity: 'error'
}

{
  field: 'q1_count',
  message: 'Q1 count must be greater than or equal to 0',
  code: 'MIN_VALUE',
  severity: 'error'
}

{
  field: 'unit_cost',
  message: 'Unit cost must be a valid number',
  code: 'INVALID_NUMBER',
  severity: 'error'
}
```

### Soft Warnings (Allow Submission)

These warn but don't block:

```typescript
{
  field: 'unit_cost',
  message: 'Medical doctor salary seems unusually low',
  code: 'CUSTOM_VALIDATION',
  severity: 'warning'
}

{
  field: 'frequency',
  message: 'Salary frequency should typically be 12 (monthly)',
  code: 'CUSTOM_VALIDATION',
  severity: 'warning'
}
```

---

## 6. Validation Response Format

### Success Response

```json
{
  "isValid": true,
  "errors": [],
  "warnings": [],
  "metadata": {
    "processedRules": 15,
    "skippedRules": 0,
    "processingTime": 45.2,
    "totalFields": 7,
    "validatedFields": 7
  }
}
```

### Error Response

```json
{
  "isValid": false,
  "errors": [
    {
      "field": "activities.101.unit_cost",
      "message": "Unit cost is required",
      "code": "REQUIRED",
      "severity": "error"
    },
    {
      "field": "activities.102.q1_count",
      "message": "Q1 count must be greater than or equal to 0",
      "code": "MIN_VALUE",
      "severity": "error"
    }
  ],
  "warnings": [
    {
      "field": "activities.101.frequency",
      "message": "Salary frequency should typically be 12 (monthly)",
      "code": "CUSTOM_VALIDATION"
    }
  ],
  "metadata": {
    "processedRules": 15,
    "skippedRules": 2,
    "processingTime": 52.8,
    "totalFields": 7,
    "validatedFields": 7
  }
}
```

---

## 7. Validation Flow by Project Type

### HIV Planning Validation

```
1. Validate Schema (schemaId for HIV)
   ↓
2. Validate Required Fields
   - unit_cost (required, min: 0)
   - frequency (required, min: 0)
   - q1_count, q2_count, q3_count, q4_count (required, min: 0)
   ↓
3. Validate Field Types
   - All numeric fields must be valid numbers
   ↓
4. Apply Custom Rules (if configured)
   - Salary range checks (warning)
   - Frequency consistency checks (warning)
   ↓
5. Return Validation Result
```

### Malaria Planning Validation

```
1. Validate Schema (schemaId for Malaria)
   ↓
2. Validate Required Fields
   - unit_cost (required, min: 0)
   - frequency (required, min: 0)
   - q1_count, q2_count, q3_count, q4_count (required, min: 0)
   ↓
3. Validate Field Types
   - All numeric fields must be valid numbers
   ↓
4. Apply Custom Rules (if configured)
   - Participant count consistency (warning)
   - Frequency checks (warning)
   ↓
5. Return Validation Result
```

### TB Planning Validation

```
1. Validate Schema (schemaId for TB)
   ↓
2. Validate Required Fields
   - unit_cost (required, min: 0)
   - frequency (required, min: 0)
   - q1_count, q2_count, q3_count, q4_count (required, min: 0)
   ↓
3. Validate Field Types
   - All numeric fields must be valid numbers
   ↓
4. Apply Custom Rules (if configured)
   - Contact tracing frequency (warning)
   - Mentorship session counts (warning)
   ↓
5. Return Validation Result
```

**Notice:** Steps 1-3 are **identical** across all project types!

---

## 8. Computation Rules (Universal)

All project types use the **same computation rules**:

```typescript
// Stored in dynamic_activities.computationRules
{
  q1Amount: "unit_cost * q1_count",
  q2Amount: "unit_cost * q2_count",
  q3Amount: "unit_cost * q3_count",
  q4Amount: "unit_cost * q4_count",
  totalBudget: "q1_amount + q2_amount + q3_amount + q4_amount"
}
```

These formulas are **evaluated during validation** to ensure computed values are correct.

---

## 9. Adding Project-Specific Validation

### How to Add Custom Validation for a Project

If you need project-specific validation rules:

#### Option 1: Add to Activity Metadata (Soft Validation)

```typescript
// In seed data
{
  facilityType: 'hospital',
  categoryCode: 'HR',
  name: 'DH Medical Dr. Salary',
  projectType: 'HIV',
  validationRules: {
    unitCost: { required: true, min: 0 },
    counts: { required: true, min: 0 }
  },
  metadata: {
    // Add validation hints
    validation: {
      unitCost: {
        expectedMin: 3000,
        expectedMax: 10000,
        warningMessage: 'Salary outside typical range'
      },
      frequency: {
        expected: 12,
        warningMessage: 'Salary should be monthly (12)'
      }
    }
  }
}
```

#### Option 2: Add Custom Formula Rules (Hard Validation)

```typescript
// In seed data
{
  facilityType: 'hospital',
  categoryCode: 'HR',
  name: 'DH Medical Dr. Salary',
  projectType: 'HIV',
  validationRules: [
    {
      type: 'custom',
      formula: 'unit_cost >= 3000',
      message: 'Medical doctor salary must be at least $3,000',
      severity: 'error', // Hard error
      enabled: true
    },
    {
      type: 'custom',
      formula: 'frequency === 12',
      message: 'Salary frequency must be 12 (monthly)',
      severity: 'warning', // Soft warning
      enabled: true
    }
  ]
}
```

#### Option 3: Add to Form Schema (Field-Level)

```typescript
// In form schema definition
{
  sections: [
    {
      id: "planning_data",
      fields: [
        {
          key: "unit_cost",
          type: "currency",
          label: "Unit Cost ($)",
          required: true,
          validation: { 
            min: 0,
            // Add project-specific max
            max: projectType === 'HIV' ? 15000 : 5000
          }
        }
      ]
    }
  ]
}
```

---

## 10. Validation Testing by Project Type

### Test Cases

```typescript
describe('Planning Validation', () => {
  describe('HIV Planning', () => {
    it('should validate required fields', async () => {
      const result = await validationService.validateFormData(
        hivSchemaId,
        {
          activities: {
            '101': {
              // Missing unit_cost - should fail
              frequency: 12,
              q1_count: 2
            }
          }
        }
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'activities.101.unit_cost',
        message: 'Unit cost is required',
        code: 'REQUIRED',
        severity: 'error'
      });
    });

    it('should validate minimum values', async () => {
      const result = await validationService.validateFormData(
        hivSchemaId,
        {
          activities: {
            '101': {
              unit_cost: -100, // Negative - should fail
              frequency: 12,
              q1_count: 2
            }
          }
        }
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'activities.101.unit_cost',
        message: 'Unit cost must be at least 0',
        code: 'MIN_VALUE',
        severity: 'error'
      });
    });
  });

  describe('Malaria Planning', () => {
    it('should use same validation rules as HIV', async () => {
      const result = await validationService.validateFormData(
        malariaSchemaId,
        {
          activities: {
            '201': {
              // Missing unit_cost - should fail
              frequency: 4,
              q1_count: 20
            }
          }
        }
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'activities.201.unit_cost',
        message: 'Unit cost is required',
        code: 'REQUIRED',
        severity: 'error'
      });
    });
  });

  describe('TB Planning', () => {
    it('should use same validation rules as HIV and Malaria', async () => {
      const result = await validationService.validateFormData(
        tbSchemaId,
        {
          activities: {
            '301': {
              unit_cost: 4000,
              frequency: 12,
              q1_count: -1 // Negative - should fail
            }
          }
        }
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'activities.301.q1_count',
        message: 'Q1 count must be at least 0',
        code: 'MIN_VALUE',
        severity: 'error'
      });
    });
  });
});
```

---

## 11. Validation Comparison Table

| Validation Aspect | HIV | Malaria | TB | Notes |
|-------------------|-----|---------|-----|-------|
| **Required Fields** | ✅ Same | ✅ Same | ✅ Same | unit_cost, frequency, counts |
| **Min Value (0)** | ✅ Same | ✅ Same | ✅ Same | All numeric fields |
| **Field Types** | ✅ Same | ✅ Same | ✅ Same | number, currency, text |
| **Computation Rules** | ✅ Same | ✅ Same | ✅ Same | Same formulas |
| **Custom Rules** | ⚙️ Configurable | ⚙️ Configurable | ⚙️ Configurable | Can be added per activity |
| **Validation Service** | ✅ Same | ✅ Same | ✅ Same | Generic service |
| **Error Codes** | ✅ Same | ✅ Same | ✅ Same | REQUIRED, MIN_VALUE, etc. |
| **Warning Support** | ✅ Same | ✅ Same | ✅ Same | Severity: 'warning' |

---

## 12. Key Takeaways

### What's the Same Across All Project Types

1. **Validation Logic** - Same validation service and rules engine
2. **Required Fields** - All activities require unit_cost, frequency, and counts
3. **Min/Max Constraints** - Same numeric validation (min: 0)
4. **Field Types** - Same field type validation (number, currency, text, date)
5. **Computation Rules** - Same calculation formulas
6. **Error Codes** - Same error code system
7. **API Endpoints** - Same validation endpoint (`/planning/validate`)

### What Can Differ (But Currently Doesn't)

1. **Custom Validation Rules** - Can be configured per activity but currently aren't
2. **Warning Messages** - Can be project-specific but use generic messages
3. **Expected Value Ranges** - Could add soft validation for typical ranges
4. **Business Logic Rules** - Could add project-specific business rules

### Why This Design is Good

1. **Consistency** - Users get the same validation experience across all programs
2. **Maintainability** - One validation service to maintain
3. **Scalability** - Easy to add new project types without changing validation logic
4. **Flexibility** - Can add project-specific rules when needed via configuration
5. **Testing** - One set of validation tests covers all project types

---

## Summary

**Schema validation in the planning module is project-agnostic.** All project types (HIV, Malaria, TB) use:
- The same validation service
- The same validation rules
- The same error codes
- The same computation formulas

The only differences are in the **activities themselves** (different names, categories, metadata), but the **validation logic is universal**.

This design provides consistency while maintaining flexibility to add project-specific validation rules through configuration when needed.
