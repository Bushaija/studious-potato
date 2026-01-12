# Budget Management System – Challenges & Proposed Solutions

## 1. Challenges in the Current System

### 1.1 Manual Data Entry Forms
- **Issue:** All data input fields for planning and execution are hard-coded in the frontend.  
- **Impact:** Adding or removing a field requires developer intervention and redeployment. This slows down response to changing donor/government requirements.

---

### 1.2 Manual Event–Activity Mapping
- **Issue:** Financial activities are manually mapped to reporting lines through hard-coded configuration.  
- **Impact:** Updating mappings or introducing new categories requires code changes, making reporting inflexible.

---

### 1.3 Rigid Data Structure
- **Issue:** Categories and subcategories are pre-defined in code.  
- **Impact:** Difficult to adapt when a new program, facility type, or reporting structure is introduced.

---

### 1.4 Manually Defined Validation Rules
- **Issue:** Validation logic (required fields, numeric ranges, etc.) is implemented manually in forms and backend.  
- **Impact:** Rules are duplicated, prone to errors, and hard to maintain across modules.

---

### 1.5 Limited Scalability & Extensibility
- **Issue:** The system is not schema-driven.  
- **Impact:** Growing datasets, evolving compliance standards, or new donor formats cannot be handled without developer support.

---

## 2. Proposed Solutions

### 2.1 Schema-Driven Form Engine
- **Solution:** Move from hard-coded forms to a schema-based approach.  
- **Implementation:**
  - Store form definitions (fields, data types, validation rules) in a database or JSON configuration.  
  - Dynamically render forms on the client-side based on schema.  
- **Benefit:** Adding or modifying fields does not require code changes. Non-technical staff can configure fields via an admin interface.

---

### 2.2 Configurable Event–Statement Mapping
- **Solution:** Migrate manual mappings into a database with an admin UI.  
- **Implementation:**
  - `events` table for financial activities.  
  - `event_statement_mapping` table for linking events to financial statements.  
- **Benefit:** New mappings can be introduced without code changes, making the system adaptable to new reporting standards.

---

### 2.3 Centralized Validation Layer
- **Solution:** Define validation rules once in schema and apply them across frontend and backend.  
- **Implementation:**
  - Use libraries like **Zod** or **Yup** for schema validation.  
  - Store rules (e.g., required, min, max) in the same schema as form definitions.  
- **Benefit:** Eliminates duplication, ensures consistency, and reduces validation errors.

---

### 2.4 Modular, API-First Architecture
- **Solution:** Decouple data entry, computation, and reporting through APIs.  
- **Implementation:**
  - Endpoints for planning (`/planning`), execution (`/execution`), and reporting (`/statements`).  
  - Frontend consumes APIs and renders forms dynamically.  
- **Benefit:** Enables multiple clients (web, mobile, reporting tools) to reuse the same backend logic.

---

### 2.5 Computation & Reporting Engine
- **Solution:** Build a flexible computation engine that derives balances, totals, and variances automatically.  
- **Implementation:**
  - Define formulas in metadata (e.g., Surplus = Receipts – Expenditures).  
  - Apply them to raw data to produce financial statements.  
- **Benefit:** Changes in formulas do not require system rewrites, making compliance updates seamless.

---

### 2.6 Extensible Data Model
- **Solution:** Refactor database schema to support modular growth.  
- **Implementation:**
  - Separate **raw data entries**, **schemas/configurations**, and **computed results**.  
  - Support multiple programs, facility types, and donor requirements without structural changes.  
- **Benefit:** Future-proof system that adapts to new needs without redesign.

---

## 3. Expected Outcomes
By implementing the proposed solutions, the upgraded system will achieve:
- **Flexibility**: Easy to add/edit fields, rules, categories, and mappings without redeployment.  
- **Scalability**: Supports multiple programs, facility types, and reporting templates.  
- **Accuracy**: Centralized validation ensures consistent and error-free data entry.  
- **Efficiency**: Reduced manual intervention in form updates and mapping configuration.  
- **Compliance**: Rapid adaptation to changing donor or government reporting standards.  

---
