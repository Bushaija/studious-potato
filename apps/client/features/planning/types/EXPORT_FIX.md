# Planning Types Export Fix

## Problem
Next.js was showing build warnings about missing exports:

```
⚠ export 'API_ENDPOINTS' (reexported as 'API_ENDPOINTS') was not found in './component-types'
⚠ export 'FILE_CONSTRAINTS' (reexported as 'FILE_CONSTRAINTS') was not found in './component-types'
⚠ export 'UPLOAD_STAGES' (reexported as 'UPLOAD_STAGES') was not found in './component-types'
⚠ export 'ERROR_CODES' (reexported as 'ERROR_CODES') was not found in './component-types'
⚠ export 'isApiError' (reexported as 'isApiError') was not found in './component-types'
⚠ export 'isValidationError' (reexported as 'isValidationError') was not found in './component-types'
⚠ export 'isUploadError' (reexported as 'isUploadError') was not found in './component-types'
⚠ export 'isNetworkError' (reexported as 'isNetworkError') was not found in './component-types'
⚠ export 'isAccessError' (reexported as 'isAccessError') was not found in './component-types'
```

## Root Cause
The `index.ts` file was trying to re-export constants and type guards from `component-types.ts`, but these exports actually exist in `api-types.ts`.

### File Structure
```
features/planning/types/
├── index.ts              # Central export point
├── component-types.ts    # Component props, UI state types
└── api-types.ts          # API-related types, constants, type guards
```

### What's in Each File

**component-types.ts** (UI-focused):
- Component prop interfaces
- Tab state management
- Upload state types
- File validation types
- Constants: `DEFAULT_ACCEPTED_FORMATS`, `DEFAULT_MAX_FILE_SIZE`, `STAGE_ORDER`
- Type guards: `isValidTabMode`, `isValidUploadStage`, `hasValidationIssues`, `isUploadSuccessful`

**api-types.ts** (API-focused):
- API request/response types
- Error types (ApiError, ValidationError, etc.)
- Constants: `API_ENDPOINTS`, `FILE_CONSTRAINTS`, `UPLOAD_STAGES`, `ERROR_CODES`
- Type guards: `isApiError`, `isValidationError`, `isUploadError`, `isNetworkError`, `isAccessError`

## Solution
Updated `index.ts` to import from the correct source files:

**Before:**
```typescript
// Re-export constants
export {
  DEFAULT_ACCEPTED_FORMATS,
  DEFAULT_MAX_FILE_SIZE,
  STAGE_ORDER,
  API_ENDPOINTS,        // ❌ Not in component-types
  FILE_CONSTRAINTS,     // ❌ Not in component-types
  UPLOAD_STAGES,        // ❌ Not in component-types
  ERROR_CODES,          // ❌ Not in component-types
} from './component-types';

// Re-export type guards
export {
  isValidTabMode,
  isValidUploadStage,
  hasValidationIssues,
  isUploadSuccessful,
  isApiError,           // ❌ Not in component-types
  isValidationError,    // ❌ Not in component-types
  isUploadError,        // ❌ Not in component-types
  isNetworkError,       // ❌ Not in component-types
  isAccessError,        // ❌ Not in component-types
  // ...
} from './component-types';
```

**After:**
```typescript
// Re-export constants from component-types
export {
  DEFAULT_ACCEPTED_FORMATS,
  DEFAULT_MAX_FILE_SIZE,
  STAGE_ORDER,
} from './component-types';

// Re-export constants from api-types
export {
  API_ENDPOINTS,
  FILE_CONSTRAINTS,
  UPLOAD_STAGES,
  ERROR_CODES,
} from './api-types';

// Re-export type guards from component-types
export {
  isValidTabMode,
  isValidUploadStage,
  hasValidationIssues,
  isUploadSuccessful,
} from './component-types';

// Re-export type guards from api-types
export {
  isApiError,
  isValidationError,
  isUploadError,
  isNetworkError,
  isAccessError,
  isProjectType,
  isFacilityType,
  isFileFormat,
  isApprovalStatus,
} from './api-types';
```

## Result
✅ All Next.js build warnings resolved
✅ No breaking changes to consuming code (same imports still work)
✅ Better organization: API-related exports clearly separated from component exports

## Impact
- **No code changes required** in consuming components
- Imports like `import { API_ENDPOINTS, isApiError } from '@/features/planning/types'` continue to work
- Cleaner build output without warnings

## Date
December 3, 2025
