## Financial Statement Generator — Blueprint & Development Tracker

### Cross-reference
- Main blueprint: [statements-engine.md](./statements-engine.md)

---

## Current Financial Statements Structures

### 1) Statement of Revenue and Expenditure

#### Schema (columns)
- DESCRIPTION: string — categories and activities
- NOTE: number — ties to `events.noteNumber`
- FY Current (FRW): currency — dynamic label per reporting period
- FY Previous (FRW): currency — dynamic label per prior period

#### Categories (from `schemaActivityCategories`)
1. REVENUES
2. EXPENSES
3. SURPLUS / DEFICIT

#### Sub-categories (from `schemaActivityCategories`)
1. REVENUES
   - 1.1 Revenue from non-exchange
   - 1.2 Revenue from exchange transactions
   - 1.3 Borrowings
2. EXPENSES — no sub-categories
3. SURPLUS / (DEFICIT) FOR THE PERIOD

#### Activities (mapped via `configurableEventMappings` → `events`)
- Revenue non-exchange: Tax revenue, Grants, Transfers (central treasury, public entities), Fines/penalties/licenses
- Revenue exchange: Property income, Sales of goods/services, Proceeds from sale of capital items, Other revenue
- Borrowings: Domestic borrowings, External borrowings, TOTAL REVENUE
- Expenses: Compensation of employees, Goods and services, Grants and other transfers, Subsidies, Social assistance, Finance costs, Acquisition of fixed assets, Repayment of borrowings, Other expenses, TOTAL EXPENSES
- SURPLUS/(DEFICIT) — computed: Revenue total − Expense total

#### Example (layout)
```markdown
# Statement of Revenue and Expenditure

| DESCRIPTION | NOTE | FY 2025/2026 (FRW) | FY 2024/2025 (FRW) |
|-------------|------|-------------------|-------------------|
| **1. REVENUES** |  |  |  |
| **1.1 Revenue from non-exchange** |  |  |  |
| Tax revenue | 1 | - | - |
| Grants | 2 | - | - |
| Transfers from central treasury | 3 | - | - |
| Transfers from public entities | 4 | 4 | - |
| Fines, penalties and licences | 5 | - | - |
| **1.2 Revenue from exchange transactions** |  |  |  |
| Property income | 6 | - | - |
| Sales of goods and services | 7 | - | - |
| Proceeds from sale of capital items | 8 | - | - |
| Other revenue | 9 | 4 | - |
| **1.3 Borrowings** |  |  |  |
| Domestic borrowings | 10 | - | - |
| External borrowings | 11 | - | - |
| **TOTAL REVENUE** |  | **8** | **-** |
| **2. EXPENSES** |  |  |  |
| Compensation of employees | 12 | - | - |
| Goods and services | 13 | 44 | - |
| Grants and other transfers | 14 | 4 | - |
| Subsidies | 15 | - | - |
| Social assistance | 16 | - | - |
| Finance costs | 17 | - | - |
| Acquisition of fixed assets | 18 | - | - |
| Repayment of borrowings | 19 | - | - |
| Other expenses | 20 | - | - |
| **TOTAL EXPENSES** |  | **48** | **-** |
| **3. SURPLUS / (DEFICIT) FOR THE PERIOD** |  | **-40** | **-** |
```

---

### 2) Statement of Financial Assets and Liabilities (Balance Sheet)

#### Schema (columns)
- DESCRIPTION, NOTE, FY Current (FRW), FY Previous (FRW)

#### Categories
1. ASSETS
2. LIABILITIES
3. REPRESENTED BY

#### Sub-categories
- Assets: 1.1 Current assets, 1.2 Non-current assets
- Liabilities: 2.1 Current liabilities, 2.2 Non-current liabilities
- Represented by: none

#### Activities
- Assets (current): Cash and cash equivalents, Receivables (exchange), Advance payments, Total current assets
- Assets (non-current): Direct investments, Total non-current assets, Total assets (A)
- Liabilities (current): Payables, Payments received in advance, Retained performance securities, Total current liabilities
- Liabilities (non-current): Direct borrowings, Total non-current liabilities, Total liabilities (B)
- Net assets: C = A − B
- Represented by: Accumulated surplus/(deficits), Prior year adjustments, Surplus/deficits of the period, Total Net Assets

#### Example (layout)
```markdown
# Statement of Financial Position (Balance Sheet)

| DESCRIPTION | NOTE | FY 2025/2026 (FRW) | FY 2024/2025 (FRW) |
|-------------|------|-------------------|-------------------|
| **1. ASSETS** |  |  |  |
| **1.1 Current assets** |  |  |  |
| Cash and cash equivalents | 21 | 8 | - |
| Receivables from exchange transactions | 22 | - | - |
| Advance payments | 23 | 8 | - |
| **Total current assets** |  | **16** | **-** |
| **1.2 Non-current assets** |  |  |  |
| Direct investments | 24 | - | - |
| **Total non-current assets** |  | **-** | **-** |
| **Total assets (A)** |  | **16** | **-** |
| **2. LIABILITIES** |  |  |  |
| **2.1 Current liabilities** |  |  |  |
| Payables | 25 | 20 | - |
| Payments received in advance | 26 | - | - |
| Retained performance securities | 27 | - | - |
| **Total current liabilities** |  | **20** | **-** |
| **2.2 Non-current liabilities** |  |  |  |
| Direct borrowings | 28 | - | - |
| **Total non-current liabilities** |  | **-** | **-** |
| **Total liabilities (B)** |  | **20** | **-** |
| **Net assets C = A - B** |  | **-4** | **-** |
| **3. REPRESENTED BY** |  |  |  |
| Accumulated surplus/(deficits) | 29 | 32 | - |
| Prior year adjustments | 30 | 4 | - |
| Surplus/deficits of the period | 31 | -40 | - |
| **Total Net Assets** |  | **-4** | **-** |
```

---

### 3) Statement of Cash Flows

#### Schema (columns)
- DESCRIPTION, NOTE, FY Current (FRW), FY Previous (FRW)

#### Categories
1. CASH FLOW FROM OPERATING ACTIVITIES
2. CASH FLOW FROM INVESTING ACTIVITIES
3. CASH FLOW FROM FINANCING ACTIVITIES

#### Sub-categories & sub-sub-categories (headings)
- Operating: Revenue → (non-exchange, exchange), Expenses, Adjusted for
- Investing: standard
- Financing: standard

#### Activities
- Operating revenue (non-exchange): Tax, Grants, Transfers (central treasury, public entities), Fines/penalties/licenses
- Operating revenue (exchange): Property income, Sales of goods/services, Other revenue
- Operating expenses: Compensation of employees, Goods & services, Grants & transfers, Subsidies, Social assistance, Finance costs, Other expenses
- Adjustments: Changes in receivables, Changes in payables, Prior year adjustments
- Investing: Acquisition of fixed assets, Proceeds from sale of capital items, Purchase shares, Net cash flows from investing (computed)
- Financing: Proceeds from borrowings, Repayment of borrowings, Net cash flows from financing (computed), Net increase/decrease in cash (computed), Cash at beginning, Cash at end

#### Example (layout)
```markdown
# Statement of Cash Flows

| DESCRIPTION | NOTE | FY 2025/2026 (FRW) | FY 2024/2025 (FRW) |
|-------------|------|-------------------|-------------------|
| **CASH FLOW FROM OPERATING ACTIVITIES** |  |  |  |
| **1. REVENUE** |  |  |  |
| **1.1 Revenue from non-exchange transactions** |  |  |  |
| Tax revenue | 1 | - | - |
| Grants | 2 | - | - |
| Transfers from central treasury | 3 | - | - |
| Transfers from public entities | 4 | - | - |
| Fines, penalties, and licenses | 5 | - | - |
| **1.2 Revenue from exchange transactions** |  |  |  |
| Property income | 6 | - | - |
| Sales of goods and services | 7 | - | - |
| Other revenue | 9 | - | - |
| **2. EXPENSES** |  |  |  |
| Compensation of employees | 12 | - | - |
| Goods and services | 13 | - | - |
| Grants and transfers | 14 | - | - |
| Subsidies | 15 | - | - |
| Social assistance | 16 | - | - |
| Finance costs | 17 | - | - |
| Other expenses | 20 | - | - |
| **Adjusted for:** |  |  |  |
| Changes in receivables |  | - | - |
| Changes in payables |  | - | - |
| Prior year adjustments | 31 | - | - |
| **Net cash flows from operating activities** |  | **-** | **-** |
| **CASH FLOW FROM INVESTING ACTIVITIES** |  |  |  |
| Acquisition of fixed assets | 18 | - | - |
| Proceeds from sale of capital items | 8 | - | - |
| Purchase shares |  | - | - |
| **Net cash flows from investing activities** |  | **-** | **-** |
| **CASH FLOW FROM FINANCING ACTIVITIES** |  |  |  |
| Proceeds from borrowings | 10 | - | - |
| Repayment of borrowings | 19 | - | - |
| **Net cash flows from financing activities** |  | **-** | **-** |
| **Net increase/decrease in cash and cash equivalents** |  | **-** | **-** |
| Cash and cash equivalents at beginning of period | 21 | 40 | - |
| **Cash and cash equivalents at end of period** | 22 | **-36** | **-** |
```

---

### 4) Statement of Changes in Net Assets

#### Schema (columns)
- DESCRIPTION, NOTE, FY Current (FRW), FY Previous (FRW)

#### Categories
- OPENING BALANCES; PRIOR YEAR ADJUSTMENTS; MOVEMENTS IN ASSETS; MOVEMENTS IN LIABILITIES; SURPLUS/DEFICIT FOR THE YEAR; CLOSING BALANCES

#### Activities
- Opening balances (as at 30th June)
- Prior year adjustments
- Movements in assets: cash/cash equivalents, receivables & financial assets, investments
- Movements in liabilities: payables & other liabilities, borrowing
- Net surplus/(deficit) for the year
- Closing balances (as at 30th June)

#### Example (layout)
```markdown
# Statement of Changes in Net Assets

| DESCRIPTION | NOTE | FY 2025/2026 (FRW) | FY 2024/2025 (FRW) |
|-------------|------|-------------------|-------------------|
| **Balances as at 30th June 2023** |  | **-** | **-** |
| **Prior year adjustments (2023-2024):** |  |  |  |
| Cash and cash equivalent (2023-2024) | 21 | - | - |
| Receivables and other financial assets (2023-2024) | 43 | - | - |
| Investments (2023-2024) | 25 | - | - |
| Payables and other liabilities (2023-2024) | 26 | 20 | - |
| Borrowing (2023-2024) | 29 | - | - |
| Net surplus/(Deficit) for the financial year (2023-2024) |  | -40 | - |
| **Balance as at 30th June 2024** |  | **-** | **-** |
| **Balance as at 01st July 2024** |  | **-** | **-** |
| **Prior year adjustments (2024-2025):** |  |  |  |
| Cash and cash equivalent (2024-2025) | 21 | - | - |
| Receivables and other financial assets (2024-2025) | 43 | - | - |
| Investments (2024-2025) | 25 | - | - |
| Payables and other liabilities (2024-2025) | 26 | 20 | - |
| Borrowing (2024-2025) | 29 | - | - |
| Net surplus/(Deficit) for the financial year (2024-2025) |  | - | - |
| **Balance as at 30th March 2025** |  | **-** | **-** |
```

---

### 5) Statement of Budget vs Actual

#### Schema (columns)
- DESCRIPTION, NOTE, REVISED BUDGET (A), ACTUAL (B), VARIANCE (A−B), PERFORMANCE %

#### Categories
1. RECEIPTS
2. EXPENDITURES

#### Activities
- Receipts: Tax revenue, Grants and transfers, Other revenue, Transfers from public entities, Total Receipts
- Expenditures: Compensation of employees, Goods and services, Finance cost, Subsidies, Grants and other transfers, Social assistance, Other expenses, Total Expenditures, Total non-financial assets
- Computed: Net lending/borrowing; Total net incurrence of liabilities

#### Example (layout)
```markdown
# Statement of Budget vs Actual Performance

| DESCRIPTION | NOTE | REVISED BUDGET (A) | ACTUAL (B) | VARIANCE (A - B) | PERFORMANCE % |
|-------------|------|-------------------|------------|------------------|---------------|
| **1. RECEIPTS** |  |  |  |  |  |
| Tax revenue | 1 | - | - | - | - |
| Grants and transfers | 2 | - | - | - | - |
| Other revenue | 9 | - | - | - | - |
| Transfers from public entities | 4 | 10,125 | 4 | 10,121 | 0.04% |
| **Total Receipts** | 33 | 10,125 | 8 | 10,117 | 0.08% |
| **2. EXPENDITURES** |  |  |  |  |  |
| Compensation of employees | 12 | - | - | - | - |
| Goods and services | 23 | 10,125 | - | 10,125 | 0.00% |
| Finance cost | 17 | - | - | - | - |
| Subsidies | 15 | - | - | - | - |
| Grants and other transfers | 14 | - | - | - | - |
| Social assistance | 16 | - | - | - | - |
| Other expenses | 20 | - | - | - | - |
| **Total Expenditures** | 34 | 10,125 | 4 | 10,121 | 0.04% |
| Total non-financial assets | 35 | - | - | - | - |
| **Net lending / borrowing** |  | **-** | **-** | **-** | **-** |
| Total net incurrence of liabilities | 36 | - | - | - | - |
```

---

## Engine Implementation Tasks (Phased)

### Phase 1 — Foundation (Schema & Seeds)
- [ ] Align events taxonomy and coverage (`events`): ensure `eventType`, `statementCodes`, `displayOrder`, `metadata` are set
- [ ] Finalize planning mapping convention: all planning activities → `GOODS_SERVICES` event
- [ ] Harden statement templates: ensure `lineCode`, `parentLineId`, `eventMappings`, `calculationFormula`, `aggregationMethod`, `isTotalLine`, `isSubtotalLine`, `formatRules`
- [ ] Add templates for Statement of Changes in Net Assets
- [ ] Validate `configurableEventMappings` uniqueness and effective date windows

### Phase 2 — Data Collection Layer
- [ ] Implement `DataCollector` for planning/execution/balances with filters
- [ ] Aggregate quarterly planning to annual; compute execution cumulative balances
- [ ] Strong TypeScript contracts for inputs/outputs

### Phase 3 — Mapping & Event Aggregation
- [ ] Mapping resolution by context (projectType, facilityType, effective dates)
- [ ] Precedence: activity-level > category-level; ratios for multi-mapping
- [ ] Aggregate contributions to `EventSummary` with provenance metadata

### Phase 4 — Formula & Computation Engine
- [ ] Parse arithmetic, range sums, conditionals, event aggregations, cross-period refs
- [ ] Evaluate formulas deterministically; detect circulars and invalid refs
- [ ] Integrity validations (Assets = Liabilities + Equity; cash reconciliation)

### Phase 5 — Statement Generation
- [ ] Load template, resolve event codes → IDs, build hierarchy
- [ ] Compute event-mapped lines, formula lines, totals/subtotals, formatting
- [ ] Produce `StatementOutput` (lines, totals, metadata, validation results)

### Phase 6 — API & Integration
- [ ] POST `/api/statements/generate` (statementCode, filters, output format)
- [ ] CRUD for templates and mappings; validation endpoints
- [ ] Authorization to project/facility scope

### Phase 7 — Performance & Ops
- [ ] Cache templates and mapping resolution; optional result cache
- [ ] DB indexing for hot paths; optimize queries
- [ ] Structured logs and metrics for mapping/compute steps

---

## Conventions & Acceptance Criteria

### Mapping conventions
- Planning: all planning activities map to event `GOODS_SERVICES` (single, universal mapping)
- Aggregated vs Direct mapping: category-level for simplification; activity-level for precision
- Same event may feed multiple statements (`statementCodes` guides inclusion)

### Acceptance criteria
- Any statement can be changed or added by metadata only (no code changes)
- Integrity rules pass or emit precise validation messages
- Outputs trace back to source activities and mappings (audit trail)
- Typical statement generation in < 1s with realistic data volumes

### Open decisions
- Confirm whether `GOODS_SERVICES_PLANNING` should be merged into `GOODS_SERVICES`; update seeds/templates accordingly


