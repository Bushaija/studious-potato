# Reliance on Manual Client-Side Form Fields

## 1. Current Implementation

At present, all program activities and categories (HIV – Health Centers, HIV – Hospitals, TB – Hospitals, etc.) are **hard-coded** in TypeScript files on the client-side.  

### Example: HIV Health Center Activities
```ts
export const HEALTH_CENTER_ACTIVITIES: ActivityCategoryType = {
  "Human Resources (HR)": [
    {
      activity: "Provide salaries for health facilities staff (DHs, HCs)",
      typeOfActivity: "HC Nurses (A1) Salary"
    },
    {
      activity: "Provide salaries for health facilities staff (DHs, HCs)",
      typeOfActivity: "HC Lab Technician (A1) Salary"
    },
    {
      activity: "Provide salaries for health facilities staff (DHs, HCs)",
      typeOfActivity: "Bonus (All staff paid on GF)"
    }
  ],
  "Travel Related Costs (TRC)": [
    {
      activity: "Conduct support group meeting at Health Facilities especially for adolescents and children",
      typeOfActivity: "Workshop"
    },
    {
      activity: "Conduct supervision from Health centers to CHWs",
      typeOfActivity: "Supervision (CHWs)"
    }
  ]
};
```

---

### Example: HIV Hospital Activities

```ts
export const HOSPITAL_ACTIVITIES: ActivityCategoryType = {
  "Human Resources (HR)": [
    {
      activity: "Provide salaries for health facilities staff (DHs, HCs)",
      typeOfActivity: "DH Medical Dr. Salary"
    },
    {
      activity: "Provide salaries for health facilities staff (DHs, HCs)",
      typeOfActivity: "Senior Medical Dr. Salary"
    }
  ],
  "Travel Related Costs (TRC)": [
    {
      activity: "Conduct outreach to provide HIV testing service in communities",
      typeOfActivity: "Campaign for HIV testing"
    }
  ]
};
```

---

### Example: HIV Hospital Activities

```ts
export const HOSPITAL_ACTIVITIES: ActivityCategoryType = {
  "Human Resources (HR)": [
    {
      activity: "Provide salaries for health facilities staff (DHs, HCs)",
      typeOfActivity: "DH Medical Dr. Salary"
    },
    {
      activity: "Provide salaries for health facilities staff (DHs, HCs)",
      typeOfActivity: "Senior Medical Dr. Salary"
    }
  ],
  "Travel Related Costs (TRC)": [
    {
      activity: "Conduct outreach to provide HIV testing service in communities",
      typeOfActivity: "Campaign for HIV testing"
    }
  ]
};
```

### Example: TB Hospital Activities

```ts
export const TB_ACTIVITIES: ActivityCategoryType = {
  "Human Resources (HR)": [
    {
      typeOfActivity: "Provincial TB Coordinator Salary",
      activity: "Salaries for the Provincial TB coordinators"
    }
  ],
  "Travel Related Costs (TRC)": [
    {
      typeOfActivity: "Contact Tracing (Perdiem)",
      activity: "Conduct contacts tracing among TB cases contact by Health Care Providers at HCs (Refreshment or perdiem)"
    }
  ]
};
```

### 2. Challenges with Current Approach

#### Hard-Coded Forms
*   All activities and categories are manually coded into TypeScript files.
*   Adding a new activity requires editing code, rebuilding, and redeploying the frontend.

#### Duplication Across Programs
*   HIV Health Center, HIV Hospital, and TB Hospital maintain separate files, even when some activities overlap (e.g., salaries, bonuses).
*   This introduces redundancy and increases maintenance effort.

#### Limited Flexibility
*   Any update to activity names, types, or categories must go through developers.
*   Non-technical users (accountants, program managers) cannot introduce changes directly.

#### Scalability Issues
*   As new programs (e.g., Malaria) or new donor requirements are introduced, the system must expand with more hard-coded files.
*   This approach does not scale in the long term.

### 2. Challenges with Current Approach

1. **Hard-Coded Forms**
- All activities and categories are manually coded into TypeScript files.
- Adding a new activity requires editing code, rebuilding, and redeploying the frontend.

2. **Duplication Across Programs**
- HIV Health Center, HIV Hospital, and TB Hospital maintain separate files, even when some activities overlap (e.g., salaries, bonuses).
- This introduces redundancy and increases maintenance effort.

3. **Limited Flexibility**
- Any update to activity names, types, or categories must go through developers.
- Non-technical users (accountants, program managers) cannot introduce changes directly.

4. **Scalability Issues**
- As new programs (e.g., Malaria) or new donor requirements are introduced, the system must expand with more hard-coded files.
- This approach does not scale in the long term.

3. **Proposed Solution**

    3.1 Schema-Driven Form Definitions
- Replace hard-coded files with schema-driven definitions stored in a database or JSON configuration.

Each activity would be defined in metadata rather than TypeScript.

Example Schema (Database or JSON):
```json
{
  "program": "HIV",
  "facilityType": "Health Center",
  "category": "Human Resources (HR)",
  "activity": "Provide salaries for health facilities staff",
  "typeOfActivity": "HC Nurses (A1) Salary"
}
```

**3.2 Dynamic Form Rendering**

- The frontend should render forms dynamically based on schema data fetched from the backend.

- Developers define the form engine once; new fields/activities are handled via configuration.

**3.3 Centralized Activity Repository**

- Store all activities in a single activities table with attributes:
- Program (HIV, TB, etc.)
- Facility Type (Hospital, Health Center)
- Category (HR, TRC, etc.)
- Activity Name
- Type of Activity

Avoids duplication across multiple TypeScript files.

**3.4 Admin Interface for Non-Developers**

- Build an admin dashboard where authorized staff can:
- Add or update activities
- Define categories and subcategories
- Map activities to financial statements

Eliminates the dependency on developers for form updates.

**4. Expected Benefits**

- **Flexibility**: Activities and categories updated without code changes.
- **Reduced Maintenance**: One centralized schema instead of multiple TypeScript files.
- **Scalability**: Supports new programs, facility types, and donor requirements easily.
- **Empowerment**: Non-technical users can manage configurations via admin UI.

# Financial Reporting Implementation

## Challenges, Solutions, and Execution Evidence

### 1. **Data Standardization Across Projects**
- **Challenge:**  
  Different projects (HIV, Malaria, TB) had inconsistent formats for reporting receipts, expenditures, and balances, leading to errors in aggregation.
- **Solution:**  
  Introduced standardized constants (`PROJECTS`, `REPORTING_PERIODS`, `REPORT_SECTIONS`) and mapped them with display names and period end dates.  
  This ensures every project aligns with the same schema.
- **Execution Evidence:**  
  ```ts
  export const PROJECTS = [
    "HIV NSP BUDGET SUPPORT",
    "MALARIA CONTROL",
    "TB PROGRAM",
  ] as const


### **2. Validation of Financial Data**
**Challenge:**
- Users could input invalid or incomplete data (e.g., missing quarter amounts, incorrect totals).

**Solution:**
- Implemented Zod schemas (financialRowSchema, financialItemSchema, financialReportSchema) to enforce data structure and ensure fields are validated at runtime.

**Execution Evidence:**
```ts
export const financialReportSchema = z.object({
  version: z.string(),
  fiscalYear: z.string(),
  reportingPeriod: z.string(),
  status: z.enum(["draft", "submitted", "approved", "rejected"]).default("draft"),
  items: z.array(financialItemSchema),
  totals: z.object({
    receipts: z.object({
      q1: z.number(),
      q2: z.number(),
      q3: z.number(),
      q4: z.number(),
      cumulativeBalance: z.number()
    }),
    // ...other totals
  }),
})
```

### **3. Hierarchical Totals Calculation**

**Challenge:**
- Manually tracking nested financial rows (categories with multiple children) was prone to calculation errors.

**Solution:**
- Built a recursive function calculateHierarchicalTotals to auto-calculate child sums, cumulative balances, and special formulas like Surplus/Deficit (A - B), Net Assets (D - E), and Closing Balance.

**Execution Evidence:**
```ts
surplusRow.q1 = (receiptRow.q1 || 0) - (expenditureRow.q1 || 0)
surplusRow.q2 = (receiptRow.q2 || 0) - (expenditureRow.q2 || 0)
surplusRow.q3 = (receiptRow.q3 || 0) - (expenditureRow.q3 || 0)
surplusRow.q4 = (receiptRow.q4 || 0) - (expenditureRow.q4 || 0)
surplusRow.cumulativeBalance =
  (surplusRow.q1 || 0) +
  (surplusRow.q2 || 0) +
  (surplusRow.q3 || 0) +
  (surplusRow.q4 || 0)
```

### **4. Ensuring Compatibility Between Old and New Data Formats**

**Challenge:**
- Legacy financial reports had a different schema than the new system, making migration difficult.

**Solution:**
- Created normalizeFinancialData function to transform old data (tableData) into the new FinancialReport format with standardized categories, totals, and metadata.

**Execution Evidence:**
```ts
export function normalizeFinancialData(oldData: any): FinancialReport {
  const items: FinancialItem[] = []
  // Process legacy items recursively
  function processItem(item: any, level: number, parentId: string | null = null): void {
    const normalizedItem: FinancialItem = {
      id: item.id,
      code: item.id,
      title: item.title,
      type: item.isCategory ? "category" : "line_item",
      level,
      parentId,
      values: {
        q1: item.q1 ?? null,
        q2: item.q2 ?? null,
        q3: item.q3 ?? null,
        q4: item.q4 ?? null,
        cumulativeBalance: item.cumulativeBalance ?? null,
        comments: item.comments ?? null
      },
      metadata: { category: getCategoryFromId(item.id) }
    }
    items.push(normalizedItem)
    if (item.children) {
      item.children.forEach((child: any) => processItem(child, level + 1, item.id))
    }
  }
  oldData.tableData.forEach((item: any) => processItem(item, 1))
  return { ... }
}
```

**5. Execution Form Evidence for Reports**

**Challenge:**
- Reports lacked structured execution evidence to track who submitted, reviewed, or approved them.

**Solution:**
- Added metadata tracking for createdBy, createdAt, submittedAt, approvedBy, and validation results.

**Execution Evidence:**

```ts
metadata: z.object({
  facility: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    district: z.string(),
    code: z.string().optional()
  }),
  project: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string().optional()
  }).optional(),
  createdBy: z.string().optional(),
  createdAt: z.string().optional(),
  updatedBy: z.string().optional(),
  updatedAt: z.string().optional(),
  submittedAt: z.string().optional(),
  approvedAt: z.string().optional(),
  approvedBy: z.string().optional()
})
```

### **Summary**
- **Standardization**: Projects and periods are unified under constants.
- **Validation**: Zod schemas guarantee data quality.
- **Automation**: Recursive calculations remove manual errors.
- **Compatibility**: Legacy reports normalized to modern schema.
- **Execution Evidence**: Metadata ensures accountability in report submission and approval.

