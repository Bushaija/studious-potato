# Planning Validation Fallback Implementation

## Overview

Added a fallback validation mechanism for nested activities when the form schema doesn't have the updated nested structure yet.

---

## Problem

After implementing nested validation, schemas that haven't been updated yet (like Malaria or TB) show a warning:

```
VALIDATION_WARNING: {
  "message": "No item schema found for nested activities, skipping detailed validation",
  "schemaId": 2
}
```

This happens because:
1. The validation service detects nested data structure
2. Tries to find `itemSchema` in the form schema
3. Schema in database doesn't have it yet (old structure)
4. Falls back to skipping validation with a warning

---

## Solution

Implemented **basic validation fallback** that applies universal rules when schema is not found.

### Changes Made

#### Before
```typescript
if (!itemSchema || !itemSchema.properties) {
  // Log warning and skip validation
  return {
    isValid: true,
    errors: [],
    warnings: [{ message: 'Activity schema not found, validation skipped' }]
  };
}
```

#### After
```typescript
if (!itemSchema || !itemSchema.properties) {
  // Use basic validation rules instead of skipping
  return this.validateNestedActivitiesBasic(activities, startTime);
}
```

### Basic Validation Rules

When schema is not found, apply these universal rules:

```typescript
const basicRules = {
  unit_cost: { type: 'number', required: true, min: 0, label: 'Unit Cost' },
  frequency: { type: 'number', required: true, min: 0, label: 'Frequency' },
  q1_count: { type: 'number', required: true, min: 0, label: 'Q1 Count' },
  q2_count: { type: 'number', required: true, min: 0, label: 'Q2 Count' },
  q3_count: { type: 'number', required: true, min: 0, label: 'Q3 Count' },
  q4_count: { type: 'number', required: true, min: 0, label: 'Q4 Count' }
};
```

These are the **core fields** that all planning activities must have, regardless of project type.

---

## How It Works

### Validation Flow

```
Nested Data Detected
    ↓
Try to Find itemSchema
    ↓
Schema Found?
    ├─ Yes → Use detailed validation (validateNestedActivities)
    └─ No → Use basic validation (validateNestedActivitiesBasic)
    ↓
Apply Validation Rules
    ├─ Check required fields
    ├─ Validate types
    └─ Check min constraints
    ↓
Return Result
```

### Basic Validation Logic

```typescript
for each activity:
  for each basic field (unit_cost, frequency, q1-q4_count):
    1. Check if required field is present
    2. Validate it's a number
    3. Check it's >= 0
    4. Add error if validation fails
```

---

## Benefits

### 1. No More Warnings
```
// Before
❌ VALIDATION_WARNING: No item schema found for nested activities

// After
✅ VALIDATION_INFO: Basic validation completed for 2 activities with 12 rules
```

### 2. Consistent Validation
- All project types get validated
- Even if schema not updated
- Universal rules always apply

### 3. Graceful Degradation
- Detailed validation when schema available
- Basic validation when schema missing
- Never skips validation entirely

### 4. Backward Compatible
- Works with old schemas
- Works with new schemas
- Smooth migration path

---

## Validation Comparison

### With Updated Schema (Detailed)
```typescript
// Uses itemSchema from form schema
{
  frequency: { type: 'number', required: true, validation: { min: 0, step: 1 } },
  unit_cost: { type: 'currency', required: true, validation: { min: 0 } },
  q1_count: { type: 'number', required: true, validation: { min: 0 } },
  // ... plus computed fields, help text, etc.
}

// Result
✅ Validates all fields including computed ones
✅ Uses custom validation rules
✅ Provides detailed help text
```

### Without Updated Schema (Basic)
```typescript
// Uses hardcoded basic rules
{
  unit_cost: { type: 'number', required: true, min: 0 },
  frequency: { type: 'number', required: true, min: 0 },
  q1_count: { type: 'number', required: true, min: 0 },
  // ... only core fields
}

// Result
✅ Validates core required fields
✅ Applies min value constraints
✅ No warnings logged
```

---

## Logging

### Detailed Validation (Schema Found)
```json
{
  "level": "info",
  "message": "Validated 2 activities with 12 rules",
  "details": {
    "fieldKey": "nested_activities_validation",
    "processedRules": 12,
    "skippedRules": 6
  }
}
```

### Basic Validation (Schema Not Found)
```json
{
  "level": "debug",
  "message": "No item schema found, using basic validation rules for nested activities",
  "details": {
    "fieldKey": "activities",
    "ruleType": "schema_fallback"
  }
}
```

```json
{
  "level": "info",
  "message": "Basic validation completed for 2 activities with 12 rules",
  "details": {
    "fieldKey": "nested_activities_basic_validation",
    "processedRules": 12
  }
}
```

---

## Migration Path

### Phase 1: Current State
- HIV: Uses detailed validation (schema updated)
- Malaria: Uses basic validation (schema not updated)
- TB: Uses basic validation (schema not updated)

### Phase 2: Update All Schemas
```bash
# Run seed to update all schemas
npm run db:seed
```

After seeding:
- HIV: Uses detailed validation ✅
- Malaria: Uses detailed validation ✅
- TB: Uses detailed validation ✅

### Phase 3: Future
- All schemas use detailed validation
- Basic validation remains as safety net
- New project types automatically supported

---

## Testing

### Test Case 1: Schema Not Found (Basic Validation)

```typescript
// Schema doesn't have itemSchema
const data = {
  activities: {
    "201": {
      unit_cost: 50,
      frequency: 4,
      q1_count: 20,
      q2_count: 20,
      q3_count: 20,
      q4_count: 20
    }
  }
};

const result = await validationService.validateFormData(2, data);

// Should pass with basic validation
expect(result.isValid).toBe(true);
expect(result.errors).toHaveLength(0);
expect(result.metadata.processedRules).toBe(6); // 6 basic fields
```

### Test Case 2: Missing Required Field (Basic Validation)

```typescript
const data = {
  activities: {
    "201": {
      // Missing unit_cost
      frequency: 4,
      q1_count: 20
    }
  }
};

const result = await validationService.validateFormData(2, data);

expect(result.isValid).toBe(false);
expect(result.errors).toContainEqual({
  field: 'activities.201.unit_cost',
  message: 'Unit Cost is required',
  code: 'REQUIRED',
  severity: 'error'
});
```

### Test Case 3: Invalid Value (Basic Validation)

```typescript
const data = {
  activities: {
    "201": {
      unit_cost: -50,  // Negative
      frequency: 4,
      q1_count: 20
    }
  }
};

const result = await validationService.validateFormData(2, data);

expect(result.isValid).toBe(false);
expect(result.errors).toContainEqual({
  field: 'activities.201.unit_cost',
  message: 'Unit Cost must be at least 0',
  code: 'MIN_VALUE',
  severity: 'error'
});
```

---

## Summary

### What Changed
- ✅ Added `validateNestedActivitiesBasic()` method
- ✅ Changed from skipping validation to applying basic rules
- ✅ Changed log level from 'warn' to 'debug' for schema fallback

### What's Fixed
- ✅ No more validation warnings for schemas without itemSchema
- ✅ All project types get validated (even without updated schema)
- ✅ Consistent validation across all planning data

### What's Better
- ✅ Graceful degradation when schema not found
- ✅ Universal validation rules always applied
- ✅ Smooth migration path for updating schemas
- ✅ Better logging (debug instead of warn)

The fallback validation ensures that **all planning data is validated** regardless of whether the schema has been updated, while providing a clear path to migrate to detailed validation.
