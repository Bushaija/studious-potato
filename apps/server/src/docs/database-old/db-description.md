# Healthcare Project Financial Management Database Schema Analysis

## Overview
This database schema supports a comprehensive financial management system for healthcare projects, specifically designed to handle budget planning, execution tracking, and financial reporting across multiple facilities, projects, and time periods.

## Core Domain Concepts

### 1. **Project Management Layer**
The system is built around healthcare projects with specific focus areas:

**Projects Table**
- Central entity managing different healthcare initiatives
- Supports project types: HIV, Malaria, TB (enum constraint)
- Project status tracking (ACTIVE, INACTIVE, ARCHIVED)
- Each project has unique code and name for identification

### 2. **Geographic & Facility Hierarchy**
```
Provinces → Districts → Facilities
```

**Geographic Structure:**
- **Provinces**: Top-level administrative divisions
- **Districts**: Regional subdivisions within provinces
- **Facilities**: Healthcare service points (hospitals or health centers)

**Facility Management:**
- Two facility types: hospital, health_center (enum constraint)
- Each facility belongs to a specific district
- Unique constraint ensures no duplicate facility names within the same district

### 3. **Financial Event System**
The schema implements a sophisticated double-entry accounting system:

**Events Table**
- Core financial events with unique note numbers and codes
- Categorized by type: REVENUE, EXPENSE, ASSET, LIABILITY, EQUITY
- Contains statement codes for financial reporting integration
- Display order for consistent presentation

**Financial Events Table**
- Individual financial transactions
- Supports DEBIT/CREDIT directions for proper accounting
- Quarterly breakdown (Q1-Q4) with date tracking
- Links transactions to source data for audit trails
- Project-specific financial tracking

### 4. **Budget Management Framework**

#### **Two-Phase Budget Structure:**
1. **Planning Phase** (Bottom-up budgeting)
2. **Allocation Phase** (Top-down budget distribution)

#### **Planning Phase Components:**

**Planning Categories & Activities**
- Project-specific and facility-type-specific categorization
- Hierarchical structure: Categories → Planning Activities
- Each category has unique codes within project/facility type combinations

**Planning Data**
- Detailed cost calculations: frequency × unit_cost × quarterly counts
- Automatic amount calculations via generated columns
- Comments for justification and documentation

#### **Allocation Phase Components:**

**Budget Allocations**
- Event-based budget distribution across facilities and periods
- Original vs. revised budget tracking
- Quarterly budget breakdowns with automatic totals
- Project-specific allocations with referential integrity

**Plan-Activity-Budget Mappings**
- Links planning activities to budget allocations
- Mapping ratios for proportional budget distribution
- Enables flexible budget allocation strategies

### 5. **Execution & Performance Tracking**

**Activities System**
- Hierarchical structure: Categories → Sub-categories → Activities
- Project-specific activity definitions
- Display ordering for consistent reporting
- Total row indicators for summary calculations

**Execution Data**
- Quarterly actual expenditure tracking
- Automatic cumulative balance calculations
- Facility and project-specific execution records
- Audit trail with creator/updater tracking

**Activity-Event Mappings**
- Links activities to financial events
- Supports direct and indirect mapping types
- Enables flexible chart of accounts mapping

### 6. **Reporting & Analytics Framework**

**Statement Templates**
- Configurable financial statement generation
- Line item definitions with calculation formulas
- Hierarchical statement structure (parent-child relationships)
- Support for totals and subtotals
- Event-based calculations for dynamic reporting

**Category-Event Mappings**
- Links budget categories to financial events
- Supports both category and sub-category mappings
- Unique constraint prevents duplicate mappings

**Materialized View: v_planning_category_totals**
- Pre-calculated category-level budget summaries
- Quarterly and total budget aggregations
- Optimizes reporting performance

### 7. **Temporal Management**

**Reporting Periods**
- Annual reporting cycles with flexible period types
- Status tracking (ACTIVE, etc.)
- Date range definitions for period boundaries
- Unique constraint on year/period type combinations

### 8. **User Management & Security**

**User System**
- Role-based access: accountant, admin
- Facility-specific user assignments
- Email verification support
- Session management with token-based authentication

**Account & Session Management**
- OAuth-style authentication support
- Token management (access, refresh, ID tokens)
- Session tracking with IP and user agent
- Secure password handling

## Key Design Patterns & Constraints

### **Data Integrity Measures**
1. **Referential Integrity**: Extensive foreign key relationships
2. **Check Constraints**: Enum validations, business rule enforcement
3. **Unique Constraints**: Prevent duplicate data combinations
4. **Generated Columns**: Automatic calculations for totals and balances

### **Hierarchical Data Management**
- Categories → Sub-categories → Activities
- Provinces → Districts → Facilities
- Statement Templates with parent-child relationships

### **Audit & Tracking**
- Created/updated timestamps throughout
- Creator/updater fields for accountability
- Version control through updated_at fields

### **Financial Controls**
- Project ID requirements in financial tables
- Quarter validations (1-4 only)
- Direction controls (DEBIT/CREDIT only)
- Decimal precision for monetary values (15,2 or 18,2)

## Business Process Flow

1. **Project Setup**: Create projects with types and status
2. **Planning**: Define categories, activities, and detailed cost plans
3. **Budget Allocation**: Distribute budgets across facilities and periods
4. **Execution**: Record actual expenditures against activities
5. **Financial Recording**: Generate financial events from execution data
6. **Reporting**: Produce financial statements using templates and mappings

## Scalability & Performance Features

- **Indexed Foreign Keys**: Optimized joins and lookups
- **Composite Unique Constraints**: Prevent duplicate business combinations
- **Generated Columns**: Reduce calculation overhead
- **Materialized Views**: Pre-calculated aggregations
- **Quarterly Partitioning**: Supports time-based analysis

This schema effectively supports a complete financial management lifecycle for healthcare projects, from initial planning through execution and reporting, with strong data integrity and audit capabilities.