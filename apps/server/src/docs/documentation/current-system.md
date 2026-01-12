# Budget Management System Documentation

## 1. Overview
The Budget Management System is designed to support financial planning, execution, and reporting for health programs (e.g., TB, HIV, Malaria).  
It enables accountants to enter budget data, track actual execution, and generate financial statements required by donors and government.

The system is primarily **form-driven**, where data is manually entered into client-side forms.  
Reports and financial statements are generated based on these entries and manually defined mappings.

---

## 2. Core Modules

### 2.1 Planning Module
**Purpose:** Capture planned (budgeted) financial activities on an **annual basis**, broken down into quarterly allocations.

**Users:** Accountants at hospitals and health centers.

**Features:**
- Data entry form includes:
  - **Entered by accountant:**
    - Frequency  
    - Unit cost  
    - Count (Q1–Q4)  
    - Comment
  - **Auto-calculated by system:**
    - Amount Q1–Q4 = (Unit cost × Count × Frequency)  
    - Total = Sum of all quarterly amounts
- Supports **programs** (TB, HIV, Malaria).
- Supports **facility types** (Hospital, Health Center).
- Activities are grouped into **categories**:
  1. Human Resources (HR)  
  2. Travel Related Costs (TRC)  
  3. Health Products & Equipment (HPE)  
  4. Program Administration Costs (PAC)
- Each category has **sub-categories** defined per program and facility.
- Some activities are annual-only (e.g., Bonus in HR).

---

### 2.2 Execution Module
**Purpose:** Record actual financial execution and balances on a **quarterly basis**.

**Users:** Accountants at hospitals and health centers.

**Features:**
- Data entry form includes:
  - **Entered by accountant:**
    - Q1–Q4 values  
    - Comment
  - **Auto-calculated by system:**
    - Cumulative balance
- Categories and subcategories:
  - **A. Receipts**  
    - Other incomes  
    - Transfers from SPIU/RBC
  - **B. Expenditures**  
    - Compensation of employees  
    - Monitoring & Evaluation  
    - Client support  
    - Other program activities  
    - Overheads  
    - Transfers  
  - **C. Surplus/Deficit**  
    - Auto-calculated: Receipts – Expenditures
  - **D. Financial Assets**  
    - Cash  
    - Petty cash  
    - Accounts receivable  
  - **E. Financial Liabilities**  
    - Accounts payable  
    - VAT refunds  
  - **F. Net Financial Assets**  
    - Auto-calculated: Assets – Liabilities
  - **G. Closing Balance**  
    - Auto-calculated and validated: F = G

---

### 2.3 Financial Statements
**Purpose:** Generate standardized reports required by donors, management, and government.  
Statements are derived from the **Planning** (budgeted data) and **Execution** (actual data).

**Reports generated:**
1. **Statement of Revenue and Expenditures**  
   Income vs. expenditure over a period → Net Surplus/Deficit.

2. **Statement of Assets and Liabilities (Balance Sheet)**  
   Snapshot of financial position at period end.

3. **Statement of Cash Flow**  
   Movement of cash through operating, investing, financing activities.

4. **Statement of Changes in Assets / Net Assets**  
   Opening balance → Changes → Closing balance.

5. **Statement of Budget vs. Actual**  
   Planned (budget) vs. Actual execution → Variance ($, %).

---

### 2.4 Event–Activity Mapping
**Purpose:** Link financial activities to reporting lines in statements.

**Implementation:**
- Mapping is **manually defined** in configuration (hard-coded).
- Each event has attributes:
  - `code` (e.g., `COMPENSATION_EMPLOYEES`)
  - `description`
  - `statementCodes` (e.g., `["REV_EXP", "CASH_FLOW", "BUDGET_VS_ACTUAL"]`)
  - `eventType` (`REVENUE`, `EXPENSE`, `ASSET`, `LIABILITY`, `EQUITY`)

**Example:**
```ts
{
  code: "COMPENSATION_EMPLOYEES",
  description: "Compensation of employees",
  statementCodes: ["REV_EXP", "CASH_FLOW", "BUDGET_VS_ACTUAL"],
  eventType: "EXPENSE"
}
```
---

## 3. System Workflow

#### Planning Phase
*   Accountant enters planned activities (annual, with quarterly breakdown).
*   System auto-calculates amounts and totals.

#### Execution Phase
*   Accountant records actual receipts, expenditures, and balances per quarter.
*   System calculates cumulative balances and checks accounting equation (F = G).

#### Statement Generation
*   Events and activities are mapped manually to reporting lines.
*   System aggregates and produces financial statements.

---

## 4. Technical Notes

**Data Entry:**
*   All planning and execution data is entered manually through forms.

**Validation:**
*   Validation rules (e.g., required fields, numeric ranges) are manually defined in code.

**Mapping:**
*   Event-to-statement mappings are hard-coded in configuration files.

**Extensibility:**
*   Adding new categories, fields, or rules requires code modification and redeployment.

---

## 5. Known Limitations (As-Is)
*(To be detailed later, after documenting upgrade strategy. For now, only listed for awareness.)*
*   Manual field definitions.
*   Manual event–activity mappings.
*   Rigid form structures.
*   Limited scalability for new programs or reporting needs.
