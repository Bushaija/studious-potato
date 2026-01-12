1. Statement of Revenue and Expenditure
=======================================

schema:
-------

Description: string [explanation: column which contains categories and activities]
Note: number
FY 2025/2026 (Frw) [explanation: current fiscal year, should be dynamic]
FY 2024/2025 (Frw) [explanation: previous fiscal year, should be dynamic]


Categories 
----------

1. REVENUES
2. EXPENSES
3. SURPLUS / DEFICIT


Sub-categories
---------------

1. REVENUES
1.1 Revenue from non-exchange
1.2 Revenue from exchange transactions
1.3 Borrowings

2. EXPENSES
- no sub-categories

3. SURPLUS / (DEFICIT) FOR THE PERIOD




Activities
-----------

1. REVENUES
    1.1 Revenue from non-exchange
    - Tax revenue
    - Grants
    - Transfers from central treasury
    - Transfers from public entities
    - Fines, penalties and licences

    1.2 Revenue from exchange transactions
    - Property income
    - Sales of goods and services
    - Proceeds from sale of capital items
    - Other revenue
    
    1.3 Borrowings
    - Domestic borrowings
    - External borrowings
    - TOTAL REVENUE

2. EXPENSES
- Compensation of employees
- Goods and services
- Grants and other transfers
- Subsidies
- Social assistance
- Finance costs
- Acquisition of fixed assets
- Repayment of borrowings
- Other expenses
- TOTAL EXPENSES

3. SURPLUS / (DEFICIT)   


Example:

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





2. Statement of Financial Assets and Liabilities
================================================

schema:
-------

Description: string [explanation: column which contains categories and activities]
Note: number
FY 2025/2026 (Frw) [explanation: current fiscal year, should be dynamic]
FY 2024/2025 (Frw) [explanation: previous fiscal year, should be dynamic]



Categories
----------

1. ASSETS 
2. LIABILITIES
3. REPRESENTED BY 

Sub-categories
--------------

1. ASSETS 
    1.1 Current assets
    1.2 Non-current assets

2. LIABILITIES
    2.1 Current liabilities
    2.2 Non-current liabilities

3. REPRESENTED BY 
    - no sub-categories

Activities
----------

1. ASSETS 
    1.1 Current assets
    - Cash and cash equivalents
    - Receivables from exchange transactions
    - Advance payments
    Total current assets

    1.2 Non-current assets
    - Direct investments
    - Total non-current assets  
Total assets (A)

2. LIABILITIES
    2.1 Current liabilities
    - Payables
    - Payments received in advance
    - Retained performance securities
    - Total current liabilities

    2.2 Non-current liabilities
    - Direct borrowings
    - Total non-current liabilities 
Total liabilities (B)
Net assets C = A - B

3. REPRESENTED BY 
- Accumulated surplus/(deficits)
- Prior year adjustments
- Surplus/deficits of the period
Total Net Assets

example:

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

3. Statement of Cash Flows
==========================

schema:
-------

Description: string [explanation: column which contains categories and activities]
Note: number
FY 2025/2026 (Frw) [explanation: current fiscal year, should be dynamic]
FY 2024/2025 (Frw) [explanation: previous fiscal year, should be dynamic]


Categories
----------

1. CASH FLOW FROM OPERATING ACTIVITIES
2. CASH FLOW FROM INVESTING ACTIVITIES
3. CASH FLOW FROM FINANCING ACTIVITIES


Sub-categories & sub-sub-categories
-----------------------------------

1. CASH FLOW FROM OPERATING ACTIVITIES
1. 1 REVENUE 
    1.1.1 Revenue from non-exchange transactions 
    1.1.2 Revenue from exchange transactions 
1.2 EXPENSES
    1.2.1 Adjusted for:  
2. CASH FLOW FROM INVESTING ACTIVITIES
3. CASH FLOW FROM FINANCING ACTIVITIES


Activities
----------

1. CASH FLOW FROM OPERATING ACTIVITIES
1. 1 REVENUE 
1.1.1 Revenue from non-exchange transactions 
- Tax revenue
- Grants
- Transfers from central treasury
- Transfers from public entities
- Fines, penalties, and licenses

1.1.2 Revenue from exchange transactions 
- Property income
- Sales of goods and services 
- Other revenue

1.2 EXPENSES
- Compensation of employees
- Goods and services
- Grants and transfers
- Subsidies
- Social assistance
- Finance costs
- Other expenses

1.2.1 Adjusted for:  
    - Changes in receivables 
    - Changes in payables
    - Prior year adjustments
Net cash flows from operating activities (computed)

2. CASH FLOW FROM INVESTING ACTIVITIES
- Acquisition of fixed assets
- Proceeds from sale of capital items
- Purchase shares
- Net cash flows from investing activities (computed)

3. CASH FLOW FROM FINANCING ACTIVITIES
- Proceeds from borrowings
- Repayment of borrowings
- Net cash flows from financing activities   (computed)
- Net increase/decrease in cash and cash equivalents (computed)
- Cash and cash equivalents at beginning of period
- Cash and cash equivalents at end of period

Example:

# Statement of Cash Flows

| DESCRIPTION | NOTE | FY 2025/2026 (FRW) | FY 2024/2025 (FRW) |
|-------------|------|-------------------|-------------------|
| **CASH FLOW FROM OPERATING ACTIVITIES** |  |  |  |
| **1. REVENUE** |  |  |  |
| **1.1 Revenue from non-exchange transactions** |  |  |  |
| Tax revenue | 1 | - | - |
| Grants | 2 | - | - |
| Transfers from central treasury | 3 | - | - |
| Transfers from public entities | 4 | 4 | - |
| Fines, penalties, and licenses | 5 | - | - |
| **1.2 Revenue from exchange transactions** |  |  |  |
| Property income | 6 | - | - |
| Sales of goods and services | 7 | - | - |
| Other revenue | 9 | 4 | - |
| **2. EXPENSES** |  |  |  |
| Compensation of employees | 12 | - | - |
| Goods and services | 13 | 44 | - |
| Grants and transfers | 14 | 4 | - |
| Subsidies | 15 | - | - |
| Social assistance | 16 | - | - |
| Finance costs | 17 | - | - |
| Other expenses | 20 | - | - |
| **Adjusted for:** |  |  |  |
| Changes in receivables |  | - | - |
| Changes in payables |  | - | - |
| Prior year adjustments | 31 | 4 | - |
| **Net cash flows from operating activities** |  | **-40** | **-** |
| **CASH FLOW FROM INVESTING ACTIVITIES** |  |  |  |
| Acquisition of fixed assets | 18 | - | - |
| Proceeds from sale of capital items | 8 | - | - |
| Purchase shares |  | - | - |
| **Net cash flows from investing activities** |  | **-** | **-** |
| **CASH FLOW FROM FINANCING ACTIVITIES** |  |  |  |
| Proceeds from borrowings | 10 | - | - |
| Repayment of borrowings | 19 | - | - |
| **Net cash flows from financing activities** |  | **-** | **-** |
| **Net increase/decrease in cash and cash equivalents** |  | **-40** | **-** |
| Cash and cash equivalents at beginning of period | 21 | - | - |
| **Cash and cash equivalents at end of period** | 22 | **-36** | **-** |


4. Statement of Changes in Net Assets
=====================================

schema:
-------

Description: string [explanation: column which contains categories and activities]
Note: number
FY 2025/2026 (Frw) [explanation: current fiscal year, should be dynamic]
FY 2024/2025 (Frw) [explanation: previous fiscal year, should be dynamic]

Categories
----------

- OPENING BALANCES
- PRIOR YEAR ADJUSTMENTS
- MOVEMENTS IN ASSETS
- MOVEMENTS IN LIABILITIES
- SURPLUS / DEFICIT FOR THE YEAR
- CLOSING BALANCES

Activities
----------

1. OPENING BALANCES
- Balances as at 30th June


2. PRIOR YEAR ADJUSTMENTS
- Prior year adjustments

3. MOVEMENTS IN ASSETS
- Changes in the composition of financial and non-financial assets.
- Cash and cash equivalents
- Receivables and other financial assets
- Investments


4. MOVEMENTS IN LIABILITIES
- Payables and other liabilities
- Borrowing


5. SURPLUS / DEFICIT FOR THE YEAR
- Net surplus/(Deficit) for the financial year

6. CLOSING BALANCES
- Balance as at 30th June 

example:

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



5. Statement of Budget vs Actual
================================

schema:
-------

Description: string [explanation: column which contains categories and activities]
Note: number
Revised Budget (A): decimal
Actual (B): decimal
Variance (A - B): decimal
Performance %: decimal


Categories
----------

1. RECEIPTS 
2. EXPENDITURES 


Activities
----------

1. RECEIPTS 
- Tax revenue 
- Grants and transfers    
- Other revenue
- Transfers from public entities
- Total Receipts

2. EXPENDITURES 
- Compensation of employees   
- Goods and services
- Finance cost    
- Subsidies   
- Grants and other transfers
- Social assistance   
- Other expenses  
- Total Expenditures
- Total non-financial assets  

Net lending / borrowing (computed)
Total net incurrence of liabilities (computed)


example:


# Statement of Budget vs Actual Performance

| DESCRIPTION | NOTE | REVISED BUDGET (A) | ACTUAL (B) | VARIANCE (A - B) | PERFORMANCE % |
|-------------|------|-------------------|------------|------------------|---------------|
| **1. RECEIPTS** |  |  |  |  |  |
| Tax revenue | 1 | - | - | - | - |
| Grants and transfers | 2 | - | - | - | - |
| Other revenue | 9 | - | 4 | -4 | - |
| Transfers from public entities | 4 | 2368 | 4 | 2364 | 0.17% |
| **Total Receipts** | 33 | 2368 | 8 | 2360 | 0.34% |
| **2. EXPENDITURES** |  |  |  |  |  |
| Compensation of employees | 12 | - | - | - | - |
| Goods and services | 23 | - | - | - | - |
| Finance cost | 17 | - | - | - | - |
| Subsidies | 15 | - | - | - | - |
| Grants and other transfers | 14 | - | 4 | -4 | - |
| Social assistance | 16 | - | - | - | - |
| Other expenses | 20 | - | - | - | - |
| **Total Expenditures** | 34 | - | 4 | -4 | - |
| Total non-financial assets | 35 | - | - | - | - |
| **Net lending / borrowing** |  | **-** | **-** | **-** | **-** |
| Total net incurrence of liabilities | 36 | - | - | - | - |