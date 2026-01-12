# Planning Module: Project Type Differences

## Overview

This document explains how planning creation differs across project types (HIV, Malaria, TB) in the system. While the **API endpoints and data structure remain the same**, each project type has **different activities, categories, and business rules**.

---

## Key Concept: Schema-Driven Architecture

The planning module uses a **schema-driven architecture** where:
- The **API is generic** - same endpoints for all project types
- The **data structure is consistent** - same form data format
- The **activities are dynamic** - loaded from database based on project type
- The **validation rules vary** - project-specific business logic

```
Same API + Same Structure + Different Activities = Project-Specific Planning
```

---

## 1. Project Type Comparison

### HIV Program

**Focus:** Comprehensive health service delivery with emphasis on human resources and travel costs

**Categories:**
- **HR** - Human Resources
- **TRC** - Travel Related Costs
- **HPE** - Health Products & Equipment
- **PA** - Program Administration Costs

**Hospital Activities (13 total):**
```
HR (9 activities):
├─ DH Medical Dr. Salary
├─ Senior Medical Dr. Salary
├─ Chief Medical Dr. Salary
├─ Junior Medical Dr. or Mentor Salary
├─ Pharmacist Salary
├─ Nurse Salary
├─ CHW supervisor Salary
├─ Accountant Salary
└─ All Staff Bonus

TRC (7 activities):
├─ Campaign for HIV testing
├─ Campaign (All)
├─ Training
├─ Supervision (All)
├─ Workshop (Transport & Perdiem)
├─ Meeting
└─ Transport

HPE (1 activity):
└─ Maintenance

PA (4 activities):
├─ Bank charges & commissions
├─ Fuel
├─ Communication (Airtime)
└─ Communication (Internet)
```

**Health Center Activities (11 total):**
```
HR (3 activities):
├─ HC Nurses (A1) Salary
├─ HC Lab Technician (A1) Salary
└─ Bonus (All staff paid on GF)

TRC (4 activities):
├─ Workshop
├─ Supervision (CHWs)
├─ Supervision (Home Visit)
└─ Transport

HPE (1 activity):
└─ Maintenance and Repair

PA (4 activities):
├─ Communication
├─ Office Supplies
├─ Transport (Mission & Reporting Fee)
└─ Bank charges
```

**Characteristics:**
- Most comprehensive activity list
- Clear distinction between hospital and health center activities
- Heavy focus on human resources (salaries and bonuses)
- Multiple supervision and training activities

---

### Malaria Program

**Focus:** Epidemiological activities and program management

**Categories:**
- **EPID** - Epidemiology
- **PM** - Program Management
- **HR** - Human Resources

**Hospital & Health Center Activities (10 total):**
```
EPID (5 activities):
├─ Participants at DHs staff
├─ Provide Perdiem to Health Centers staff
├─ Provide Mineral water to participants
├─ Transport fees for remote distance based HCs staff
└─ Bank Charges

PM (1 activity):
└─ Running costs

HR (4 activities):
├─ DH CHWs supervisors A0
├─ DH Lab technicians
├─ DH Nurses A1
└─ Provide Bonus
```

**Characteristics:**
- **Same activities for both hospital and health center** (no facility distinction)
- Focus on epidemiological training and meetings
- Emphasis on per diem and transport for participants
- Simpler structure compared to HIV
- Unique "Epidemiology" category not found in other programs

---

### TB Program

**Focus:** Contact tracing, mentorship, and community outreach

**Categories:**
- **HR** - Human Resources
- **TRC** - Travel Related Costs
- **PA** - Program Administration Costs

**Hospital & Health Center Activities (16 total):**
```
HR (2 activities):
├─ Provincial TB Coordinator Salary
└─ Provincial TB Coordinator Bonus

TRC (11 activities):
├─ Contact Tracing (Perdiem)
├─ Contact Tracing (Transport)
├─ Contact Tracing (General)
├─ TPT Guidelines Mentoring (Mission)
├─ TPT Guidelines Mentoring (Transport)
├─ HCW Mentorship HC Level (Mission)
├─ HCW Mentorship HC Level (Transport)
├─ HCW Mentorship Community (Mission)
├─ HCW Mentorship Community (Transport)
├─ Quarterly Evaluation Meetings (Transport)
└─ Quarterly Evaluation Meetings (Allowance)

PA (3 activities):
├─ Hospital Running Costs
├─ Bank charges
└─ Office Supplies
```

**Characteristics:**
- **Same activities for both hospital and health center** (no facility distinction)
- Heavy emphasis on contact tracing and mentorship
- Multiple mission and transport cost breakdowns
- Focus on community-level activities
- Quarterly evaluation meetings built into structure

---

## 2. Data Structure Comparison

### Common Data Structure (All Projects)

All project types use the **same form data structure**:

```typescript
{
  "activities": {
    "[activityId]": {
      // Input fields
      "unit_cost": number,
      "frequency": number,
      "q1_count": number,
      "q2_count": number,
      "q3_count": number,
      "q4_count": number,
      
      // Computed fields (auto-calculated)
      "q1_amount": number,
      "q2_amount": number,
      "q3_amount": number,
      "q4_amount": number,
      "total_budget": number
    }
  }
}
```

### Calculation Formula (Universal)

```
quarterly_amount = frequency × unit_cost × quarterly_count
total_budget = q1_amount + q2_amount + q3_amount + q4_amount
```

**This formula is the same for all project types!**

---

## 3. How Project Type Affects Planning Creation

### Step-by-Step: Creating HIV Planning

```json
POST /planning
{
  "schemaId": 1,              // HIV Planning Form - hospital
  "projectId": 5,             // HIV Project
  "facilityId": 12,
  "reportingPeriodId": 8,
  "formData": {
    "activities": {
      "101": {                // DH Medical Dr. Salary
        "unit_cost": 5000,
        "frequency": 12,
        "q1_count": 2,
        "q2_count": 2,
        "q3_count": 2,
        "q4_count": 2
      },
      "102": {                // Senior Medical Dr. Salary
        "unit_cost": 6000,
        "frequency": 12,
        "q1_count": 1,
        "q2_count": 1,
        "q3_count": 1,
        "q4_count": 1
      }
    }
  }
}
```

### Step-by-Step: Creating Malaria Planning

```json
POST /planning
{
  "schemaId": 2,              // Malaria Planning Form - hospital
  "projectId": 6,             // Malaria Project
  "facilityId": 12,
  "reportingPeriodId": 8,
  "formData": {
    "activities": {
      "201": {                // Participants at DHs staff
        "unit_cost": 50,
        "frequency": 4,       // 4 training sessions per year
        "q1_count": 20,       // 20 participants
        "q2_count": 20,
        "q3_count": 20,
        "q4_count": 20
      },
      "202": {                // Provide Perdiem to Health Centers staff
        "unit_cost": 30,
        "frequency": 1,
        "q1_count": 15,
        "q2_count": 15,
        "q3_count": 15,
        "q4_count": 15
      }
    }
  }
}
```

### Step-by-Step: Creating TB Planning

```json
POST /planning
{
  "schemaId": 3,              // TB Planning Form - hospital
  "projectId": 7,             // TB Project
  "facilityId": 12,
  "reportingPeriodId": 8,
  "formData": {
    "activities": {
      "301": {                // Provincial TB Coordinator Salary
        "unit_cost": 4000,
        "frequency": 12,
        "q1_count": 1,
        "q2_count": 1,
        "q3_count": 1,
        "q4_count": 1
      },
      "302": {                // Contact Tracing (Perdiem)
        "unit_cost": 25,
        "frequency": 1,
        "q1_count": 50,       // 50 contact tracing visits
        "q2_count": 50,
        "q3_count": 50,
        "q4_count": 50
      }
    }
  }
}
```

---

## 4. Key Differences Summary

| Aspect | HIV | Malaria | TB |
|--------|-----|---------|-----|
| **Total Activities** | 24 (13 hospital + 11 HC) | 10 (same for both) | 16 (same for both) |
| **Facility Distinction** | ✅ Yes - Different activities | ❌ No - Same activities | ❌ No - Same activities |
| **Primary Focus** | Salaries & Service Delivery | Training & Epidemiology | Contact Tracing & Mentorship |
| **Unique Categories** | HPE (Health Products) | EPID (Epidemiology), PM (Program Mgmt) | None (uses common categories) |
| **HR Activities** | 12 (9 hospital + 3 HC) | 4 (same for both) | 2 (same for both) |
| **Travel Activities** | 11 (7 hospital + 4 HC) | 0 | 11 (same for both) |
| **Complexity** | High | Low | Medium |

---

## 5. Database Schema Differences

### Dynamic Activities Table

Each activity is stored with project-specific metadata:

```typescript
{
  id: 101,
  categoryId: 5,
  projectType: "HIV",           // ← Project-specific
  facilityType: "hospital",     // ← Facility-specific
  moduleType: "planning",
  code: "HR_1",
  name: "DH Medical Dr. Salary",
  activityType: "HR_SALARY",
  displayOrder: 1,
  isAnnualOnly: false,
  fieldMappings: { /* ... */ },
  computationRules: { /* ... */ },
  validationRules: { /* ... */ },
  metadata: {
    facilityType: "hospital",
    categoryCode: "HR",
    frequencyNote: "12 months per year"
  }
}
```

### Form Schemas Table

Each project-facility combination has its own schema:

```typescript
// HIV Hospital Schema
{
  id: 1,
  name: "HIV Planning Form - hospital",
  version: "1.0",
  projectType: "HIV",
  facilityType: "hospital",
  moduleType: "planning",
  schema: { /* form definition */ }
}

// Malaria Hospital Schema
{
  id: 2,
  name: "Malaria Planning Form - hospital",
  version: "1.0",
  projectType: "Malaria",
  facilityType: "hospital",
  moduleType: "planning",
  schema: { /* form definition */ }
}
```

---

## 6. API Behavior by Project Type

### Getting Activities

```typescript
// HIV Hospital Activities
GET /planning/activities?projectType=HIV&facilityType=hospital
// Returns: 13 activities (HR, TRC, HPE, PA categories)

// Malaria Hospital Activities
GET /planning/activities?projectType=Malaria&facilityType=hospital
// Returns: 10 activities (EPID, PM, HR categories)

// TB Hospital Activities
GET /planning/activities?projectType=TB&facilityType=hospital
// Returns: 16 activities (HR, TRC, PA categories)
```

### Getting Form Schema

```typescript
// HIV Hospital Schema
GET /planning/schema?projectType=HIV&facilityType=hospital
// Returns: HIV-specific form schema

// Malaria Hospital Schema
GET /planning/schema?projectType=Malaria&facilityType=hospital
// Returns: Malaria-specific form schema
```

### Creating Planning

The CREATE endpoint is **project-agnostic**:
- Same validation logic
- Same calculation formulas
- Same authorization rules
- Different activities based on `schemaId` and `projectId`

---

## 7. Validation Differences

### Common Validations (All Projects)

```typescript
// These apply to ALL project types:
- unit_cost must be >= 0
- frequency must be >= 0
- quarterly counts must be >= 0
- All required fields must be present
- Activity IDs must exist in dynamic_activities table
- Activity must match project type and facility type
```

### Project-Specific Validations

```typescript
// HIV-specific
- Salary activities: frequency typically = 12 (monthly)
- Bonus activities: frequency typically = 1 (annual)

// Malaria-specific
- Training activities: frequency typically = 4 (quarterly)
- Per diem activities: frequency typically = 1 (per event)

// TB-specific
- Contact tracing: frequency typically = 1 (per visit)
- Mentorship: frequency typically = 4 (quarterly)
```

These are **soft validations** (warnings) not hard constraints.

---

## 8. Frontend Implications

### Dynamic Form Generation

The frontend must:

1. **Fetch activities based on project type**
   ```typescript
   const { data: activities } = useQuery({
     queryKey: ['planning-activities', projectType, facilityType],
     queryFn: () => api.getActivities(projectType, facilityType)
   });
   ```

2. **Group activities by category**
   ```typescript
   const grouped = activities.reduce((acc, activity) => {
     const category = activity.categoryCode;
     if (!acc[category]) acc[category] = [];
     acc[category].push(activity);
     return acc;
   }, {});
   ```

3. **Render project-specific forms**
   ```tsx
   {Object.entries(grouped).map(([category, activities]) => (
     <CategorySection key={category} title={category}>
       {activities.map(activity => (
         <ActivityInput key={activity.id} activity={activity} />
       ))}
     </CategorySection>
   ))}
   ```

### Example: HIV vs Malaria Form

**HIV Form:**
```
Human Resources (HR)
├─ DH Medical Dr. Salary
├─ Senior Medical Dr. Salary
├─ ...

Travel Related Costs (TRC)
├─ Campaign for HIV testing
├─ Training
├─ ...
```

**Malaria Form:**
```
Epidemiology (EPID)
├─ Participants at DHs staff
├─ Provide Perdiem to Health Centers staff
├─ ...

Program Management (PM)
└─ Running costs
```

---

## 9. Business Logic Differences

### Frequency Interpretation

| Project | Activity Type | Typical Frequency | Meaning |
|---------|--------------|-------------------|---------|
| **HIV** | Salary | 12 | Months per year |
| **HIV** | Training | 4 | Quarterly sessions |
| **Malaria** | Training | 4 | Quarterly sessions |
| **Malaria** | Per Diem | 1 | Per event |
| **TB** | Contact Tracing | 1 | Per visit |
| **TB** | Mentorship | 4 | Quarterly visits |

### Count Interpretation

| Project | Activity Type | Count Meaning |
|---------|--------------|---------------|
| **HIV** | Salary | Number of staff |
| **HIV** | Training | Number of participants |
| **Malaria** | Training | Number of participants |
| **Malaria** | Transport | Number of trips |
| **TB** | Contact Tracing | Number of visits |
| **TB** | Mentorship | Number of sessions |

---

## 10. Migration & Scalability

### Adding a New Project Type

To add a new project type (e.g., "Nutrition"):

1. **Define activities in seed data**
   ```typescript
   const programActivities = {
     // ... existing programs
     NUTRITION: [
       { facilityType: 'hospital', categoryCode: 'HR', name: 'Nutritionist Salary', displayOrder: 1 },
       { facilityType: 'hospital', categoryCode: 'PA', name: 'Nutrition Supplies', displayOrder: 1 },
       // ... more activities
     ]
   };
   ```

2. **Add category display names**
   ```typescript
   const categoryDisplayNames = {
     // ... existing programs
     NUTRITION: {
       'HR': 'Human Resources',
       'PA': 'Program Administration',
       'NS': 'Nutrition Supplies'
     }
   };
   ```

3. **Run seed script**
   ```bash
   npm run seed
   ```

4. **No API changes needed!** The generic endpoints automatically support the new project type.

---

## 11. Common Pitfalls

### ❌ Wrong: Hardcoding Project Logic in API

```typescript
// DON'T DO THIS
if (projectType === 'HIV') {
  // HIV-specific logic
} else if (projectType === 'Malaria') {
  // Malaria-specific logic
}
```

### ✅ Right: Using Schema-Driven Approach

```typescript
// DO THIS
const activities = await getActivitiesByProjectType(projectType, facilityType);
const schema = await getSchemaByProjectType(projectType, facilityType);
// Generic validation and processing
```

### ❌ Wrong: Assuming Activity IDs

```typescript
// DON'T DO THIS
const doctorSalaryId = 101; // Assumes HIV doctor is always ID 101
```

### ✅ Right: Looking Up Activities

```typescript
// DO THIS
const doctorActivity = activities.find(a => 
  a.name === 'DH Medical Dr. Salary' && 
  a.projectType === 'HIV'
);
```

---

## 12. Testing Considerations

### Test Each Project Type

```typescript
describe('Planning Creation', () => {
  it('should create HIV planning with salary activities', async () => {
    const response = await createPlanning({
      projectId: hivProjectId,
      schemaId: hivSchemaId,
      formData: { /* HIV activities */ }
    });
    expect(response.status).toBe(201);
  });

  it('should create Malaria planning with epidemiology activities', async () => {
    const response = await createPlanning({
      projectId: malariaProjectId,
      schemaId: malariaSchemaId,
      formData: { /* Malaria activities */ }
    });
    expect(response.status).toBe(201);
  });

  it('should create TB planning with contact tracing activities', async () => {
    const response = await createPlanning({
      projectId: tbProjectId,
      schemaId: tbSchemaId,
      formData: { /* TB activities */ }
    });
    expect(response.status).toBe(201);
  });
});
```

---

## Summary

### Key Takeaways

1. **Same API, Different Data**: All project types use the same endpoints and data structure
2. **Schema-Driven**: Activities are loaded dynamically from the database
3. **Project-Specific Activities**: Each project has unique activities and categories
4. **Facility Distinction**: HIV distinguishes between hospital and health center; Malaria and TB don't
5. **Universal Calculations**: The same formula applies to all project types
6. **Scalable Design**: Adding new project types requires only seed data changes

### Comparison Table

| Feature | HIV | Malaria | TB |
|---------|-----|---------|-----|
| API Endpoints | ✅ Same | ✅ Same | ✅ Same |
| Data Structure | ✅ Same | ✅ Same | ✅ Same |
| Calculation Formula | ✅ Same | ✅ Same | ✅ Same |
| Activities | ❌ Different | ❌ Different | ❌ Different |
| Categories | ❌ Different | ❌ Different | ❌ Different |
| Facility Distinction | ✅ Yes | ❌ No | ❌ No |
| Total Activities | 24 | 10 | 16 |

The beauty of this design is that **adding new project types is just a data configuration change**, not a code change!
