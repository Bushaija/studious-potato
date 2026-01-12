# HIV Planning Validation Issue - Diagnosis & Solution

## Problem Summary

HIV planning validation fails with warnings about missing validation rules, while Malaria planning works fine. The issue is a **data structure mismatch** between how the form expects data and how it's being sent.

---

## Root Cause Analysis

### The Issue

The validation warnings show:
```
"No valid validation rules found for field: dh_medical_dr_frequency"
"No valid validation rules found for field: dh_medical_dr_unit_cost"
"No valid validation rules found for field: dh_medical_dr_q1_count"
...
```

This indicates that the validation service is looking for **flat field keys** but the data might be structured differently.

### Two Different Data Structures

#### Structure 1: Flat Fields (What HIV Form Expects)

```typescript
// HIV form fields are defined as FLAT keys
{
  schemaName: 'HIV Hospital Planning Form',
  fieldKey: 'dh_medical_dr_frequency',  // ← Flat key
  label: 'DH Medical Dr. - Frequency',
  fieldType: 'number',
  isRequired: true
}
```

**Expected Data Format:**
```json
{
  "dh_medical_dr_frequency": 12,
  "dh_medical_dr_unit_cost": 5000,
  "dh_medical_dr_q1_count": 2,
  "dh_medical_dr_q2_count": 2,
  "dh_medical_dr_q3_count": 2,
  "dh_medical_dr_q4_count": 2,
  "senior_medical_dr_frequency": 12,
  "senior_medical_dr_unit_cost": 6000,
  ...
}
```

#### Structure 2: Nested Activities (What API Actually Uses)

```typescript
// The planning API expects NESTED structure
{
  "activities": {
    "101": {  // Activity ID
      "unit_cost": 5000,
      "frequency": 12,
      "q1_count": 2,
      "q2_count": 2,
      "q3_count": 2,
      "q4_count": 2
    },
    "102": {  // Another activity
      "unit_cost": 6000,
      "frequency": 12,
      ...
    }
  }
}
```

---

## Why Malaria Works But HIV Doesn't

### Hypothesis 1: Different Form Schema Definitions

**Malaria** might have form fields defined with the nested structure:
```typescript
// Malaria form fields (hypothetical)
{
  fieldKey: 'activities',  // Parent field
  fieldType: 'object',
  children: [
    { fieldKey: 'unit_cost', fieldType: 'currency', isRequired: true },
    { fieldKey: 'frequency', fieldType: 'number', isRequired: true },
    { fieldKey: 'q1_count', fieldType: 'number', isRequired: true },
    ...
  ]
}
```

**HIV** has flat fields that don't match the nested data structure being sent.

### Hypothesis 2: Missing Form Fields for HIV

The HIV form fields in the seed data are **incomplete**. Looking at the seed file:

```typescript
const hivHospitalPlanningFields: FormFieldData[] = [
  // Only defines fields for specific activities
  { fieldKey: 'dh_medical_dr_frequency', ... },
  { fieldKey: 'senior_medical_dr_frequency', ... },
  { fieldKey: 'campaign_hiv_testing_frequency', ... },
  { fieldKey: 'bank_charges_frequency', ... },
  // Missing fields for many other HIV activities!
];
```

But HIV has **24 activities** (13 hospital + 11 health center), and the seed only defines fields for ~4 activities.

---

## The Validation Flow Problem

```
1. Client sends nested data:
   {
     "activities": {
       "101": { "unit_cost": 5000, "frequency": 12, ... }
     }
   }
   ↓
2. Validation service looks for flat fields:
   - Looking for: "dh_medical_dr_frequency"
   - Looking for: "dh_medical_dr_unit_cost"
   ↓
3. Form schema has flat field definitions:
   - fieldKey: "dh_medical_dr_frequency"
   - validationRules: []  ← Empty array!
   ↓
4. Validation service finds empty rules:
   - "No valid validation rules found"
   ↓
5. Validation passes (no rules to fail)
   BUT warnings are logged
```

---

## Why This is a Problem

### 1. Data Structure Inconsistency

The system has **two competing data structures**:

| Component | Structure Used |
|-----------|----------------|
| **Form Fields Seed** | Flat (activity-specific keys) |
| **Planning API** | Nested (activities object) |
| **Validation Service** | Expects flat keys from form schema |
| **Frontend** | Likely sends nested structure |

### 2. Missing Validation Rules

Even if the structure matched, the form fields have:
```typescript
validationRules: field.validationRules || [],  // ← Defaults to empty array!
```

No validation rules are defined in the seed data, so the validation service finds empty arrays.

### 3. Incomplete Field Definitions

HIV form fields only define ~4 activities out of 24 total activities.

---

## Solution Options

### Option 1: Use Nested Structure (Recommended)

**Change the form schema to match the API's nested structure.**

#### Step 1: Update Form Schema Definition

```typescript
// In planning-activities.ts seed
const PLANNING_FORM_SCHEMA = {
  version: "1.0",
  title: "Annual Budget Planning Form",
  sections: [
    {
      id: "activities",
      title: "Planning Activities",
      type: "nested_object",  // ← Indicate nested structure
      fields: [
        {
          key: "activities",
          type: "object",
          label: "Activities",
          required: true,
          // Define the structure of each activity
          itemSchema: {
            fields: [
              {
                key: "unit_cost",
                type: "currency",
                label: "Unit Cost",
                required: true,
                validation: { min: 0 }
              },
              {
                key: "frequency",
                type: "number",
                label: "Frequency",
                required: true,
                validation: { min: 0 }
              },
              {
                key: "q1_count",
                type: "number",
                label: "Q1 Count",
                required: true,
                validation: { min: 0 }
              },
              {
                key: "q2_count",
                type: "number",
                label: "Q2 Count",
                required: true,
                validation: { min: 0 }
              },
              {
                key: "q3_count",
                type: "number",
                label: "Q3 Count",
                required: true,
                validation: { min: 0 }
              },
              {
                key: "q4_count",
                type: "number",
                label: "Q4 Count",
                required: true,
                validation: { min: 0 }
              }
            ]
          }
        }
      ]
    }
  ]
};
```

#### Step 2: Update Validation Service

```typescript
// In validation.service.ts
async validateFormData(schemaId: number, data: Record<string, any>) {
  const schema = await db.query.formSchemas.findFirst({
    where: eq(formSchemas.id, schemaId)
  });

  // Check if this is a nested activities structure
  if (data.activities && typeof data.activities === 'object') {
    return this.validateNestedActivities(schema, data.activities);
  }

  // Otherwise use flat validation
  return this.validateFlatFields(schema, data);
}

private async validateNestedActivities(
  schema: any, 
  activities: Record<string, any>
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  
  // Get the activity schema definition
  const activitySchema = schema.schema?.sections
    ?.find((s: any) => s.id === 'activities')
    ?.fields?.find((f: any) => f.key === 'activities')
    ?.itemSchema;

  if (!activitySchema) {
    throw new Error('Activity schema not found');
  }

  // Validate each activity
  for (const [activityId, activityData] of Object.entries(activities)) {
    for (const field of activitySchema.fields) {
      const value = activityData[field.key];
      
      // Check required
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: `activities.${activityId}.${field.key}`,
          message: `${field.label} is required`,
          code: 'REQUIRED',
          severity: 'error'
        });
      }

      // Check validation rules
      if (value !== undefined && field.validation) {
        if (field.validation.min !== undefined && value < field.validation.min) {
          errors.push({
            field: `activities.${activityId}.${field.key}`,
            message: `${field.label} must be at least ${field.validation.min}`,
            code: 'MIN_VALUE',
            severity: 'error'
          });
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
    metadata: {
      processedRules: Object.keys(activities).length * activitySchema.fields.length,
      skippedRules: 0,
      processingTime: 0
    }
  };
}
```

### Option 2: Use Flat Structure

**Change the API to use flat structure (NOT recommended - breaks existing Malaria).**

This would require:
1. Changing the planning API to accept flat data
2. Updating all frontend code
3. Migrating existing Malaria data
4. More complex to maintain

---

## Recommended Implementation

### Phase 1: Fix Form Schema (Immediate)

Update the form schema seed to use nested structure:

```typescript
// In planning-activities.ts
const PLANNING_FORM_SCHEMA = {
  version: "1.0",
  title: "Annual Budget Planning Form",
  sections: [
    {
      id: "activities",
      title: "Planning Activities",
      fields: [
        {
          key: "activities",
          type: "nested_object",
          label: "Activities",
          required: true,
          validation: {
            type: "object",
            properties: {
              unit_cost: { type: "number", minimum: 0, required: true },
              frequency: { type: "number", minimum: 0, required: true },
              q1_count: { type: "number", minimum: 0, required: true },
              q2_count: { type: "number", minimum: 0, required: true },
              q3_count: { type: "number", minimum: 0, required: true },
              q4_count: { type: "number", minimum: 0, required: true }
            }
          }
        }
      ]
    }
  ]
};
```

### Phase 2: Update Validation Service (Immediate)

Add support for nested validation:

```typescript
// Check if data has nested activities structure
if (data.activities && typeof data.activities === 'object') {
  // Use nested validation
  return this.validateNestedActivities(schema, data);
}
```

### Phase 3: Remove Flat Form Fields (Cleanup)

Remove the flat form field definitions from the seed since they're not being used:

```typescript
// DELETE these from form-fields.ts
const hivHospitalPlanningFields: FormFieldData[] = [
  { fieldKey: 'dh_medical_dr_frequency', ... },  // ← Remove
  { fieldKey: 'dh_medical_dr_unit_cost', ... },  // ← Remove
  ...
];
```

---

## Testing the Fix

### Test Case 1: HIV Hospital Planning

```typescript
const hivData = {
  schemaId: 1,  // HIV Hospital Planning Form
  projectId: 5,
  facilityId: 12,
  reportingPeriodId: 8,
  formData: {
    activities: {
      "101": {  // DH Medical Dr
        unit_cost: 5000,
        frequency: 12,
        q1_count: 2,
        q2_count: 2,
        q3_count: 2,
        q4_count: 2
      },
      "102": {  // Senior Medical Dr
        unit_cost: 6000,
        frequency: 12,
        q1_count: 1,
        q2_count: 1,
        q3_count: 1,
        q4_count: 1
      }
    }
  }
};

const result = await validationService.validateFormData(
  hivData.schemaId,
  hivData.formData
);

// Should pass without warnings
expect(result.isValid).toBe(true);
expect(result.warnings).toHaveLength(0);
```

### Test Case 2: Missing Required Field

```typescript
const invalidData = {
  activities: {
    "101": {
      // Missing unit_cost
      frequency: 12,
      q1_count: 2
    }
  }
};

const result = await validationService.validateFormData(1, invalidData);

expect(result.isValid).toBe(false);
expect(result.errors).toContainEqual({
  field: 'activities.101.unit_cost',
  message: 'Unit cost is required',
  code: 'REQUIRED',
  severity: 'error'
});
```

---

## Summary

### The Problem
- HIV form schema uses **flat field structure**
- Planning API uses **nested activities structure**
- Validation service can't find validation rules because structure doesn't match
- Form fields have empty `validationRules` arrays

### The Solution
1. **Update form schema** to use nested structure matching the API
2. **Update validation service** to handle nested activities validation
3. **Remove flat form fields** that aren't being used
4. **Test thoroughly** with both HIV and Malaria

### Why Malaria Works
- Malaria likely doesn't have flat form fields defined
- Validation service skips validation when no form fields exist
- Or Malaria uses a different validation path

### Next Steps
1. Implement nested validation support in validation service
2. Update form schema definition for HIV
3. Test with real HIV planning data
4. Verify Malaria still works
5. Clean up unused flat form field definitions
