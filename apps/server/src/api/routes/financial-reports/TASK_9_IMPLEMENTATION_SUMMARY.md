# Task 9: Enhance Workflow Service with Hierarchy Routing - Implementation Summary

## Overview
Enhanced the financial report workflow service to implement hierarchy-based routing for approval workflows. The system now routes approvals through the correct facility hierarchy (health centers → parent hospital DAF → parent hospital DG) while maintaining strict district boundaries.

## Changes Made

### 1. Enhanced Workflow Service (`financial-reports-workflow.service.ts`)

#### Added `canApproveReport` Method
- **Purpose**: Validates if a user can approve a report based on facility hierarchy
- **Implementation**: Uses `FacilityHierarchyService.canAccessFacility()` to check if the user has access to the report's facility
- **Requirements**: 3.1-3.5, 6.5, 5.2, 5.3

```typescript
async canApproveReport(userId: number, reportId: number): Promise<boolean>
```

#### Enhanced `canDafApprove` Method
- **Added**: Hierarchy validation using `canApproveReport()`
- **Behavior**: DAF users can only approve reports from facilities within their hierarchy scope
- **Requirements**: 2.1, 4.2, 3.1-3.5

#### Enhanced `canDgApprove` Method
- **Added**: Hierarchy validation using `canApproveReport()`
- **Behavior**: DG users can only approve reports from facilities within their hierarchy scope
- **Requirements**: 3.1, 4.3, 3.1-3.5

#### Updated `submitForApproval` Method
- **Changed**: Routes notifications to parent hospital DAF users using `notifyDafUsersForFacility()`
- **Behavior**: 
  - For health center reports: Routes to parent hospital DAF users
  - For hospital reports: Routes to same hospital DAF users
- **Requirements**: 1.4, 3.1

#### Updated `dafApprove` Method
- **Changed**: Routes notifications to parent hospital DG users using `notifyDgUsersForFacility()`
- **Behavior**: 
  - For health center reports: Routes to parent hospital DG users
  - For hospital reports: Routes to same hospital DG users
- **Requirements**: 2.4, 3.2, 3.1-3.5

#### Updated `dafReject` Method
- **Enhanced**: Includes hierarchy validation in rejection flow
- **Behavior**: Routes rejection back to original facility accountant
- **Requirements**: 2.5-2.8, 3.5, 6.5

#### Updated `dgApprove` Method
- **Enhanced**: Includes hierarchy validation before final approval
- **Requirements**: 3.1-3.5

#### Updated `dgReject` Method
- **Enhanced**: Includes hierarchy validation in rejection flow
- **Behavior**: Routes rejection back to original facility accountant
- **Requirements**: 3.6-3.8, 3.5, 6.5

### 2. Enhanced Notification Service (`notification.service.ts`)

#### Added `notifyDafUsersForFacility` Method
- **Purpose**: Hierarchy-aware notification routing for DAF users
- **Implementation**:
  - Gets facility details including district information
  - Uses `FacilityHierarchyService.getDafUsersForFacility()` to find correct DAF users
  - Routes to parent hospital DAF users for health centers
  - Routes to same hospital DAF users for hospitals
  - Includes facility name and district context in notifications
  - Falls back to admin users if no DAF users found
- **Requirements**: 1.4, 3.1, 9.1-9.5

#### Added `notifyDgUsersForFacility` Method
- **Purpose**: Hierarchy-aware notification routing for DG users
- **Implementation**:
  - Gets facility details including district information
  - Uses `FacilityHierarchyService.getDgUsersForFacility()` to find correct DG users
  - Routes to parent hospital DG users for health centers
  - Routes to same hospital DG users for hospitals
  - Includes facility name and district context in notifications
  - Falls back to admin users if no DG users found
- **Requirements**: 2.4, 3.2, 9.1-9.5

#### Deprecated Methods
- `notifyDafUsers()` - Marked as deprecated, use `notifyDafUsersForFacility()` instead
- `notifyDgUsers()` - Marked as deprecated, use `notifyDgUsersForFacility()` instead

## Key Features

### Hierarchy-Based Routing
1. **Health Center Reports**:
   - Submit → Parent Hospital DAF
   - DAF Approve → Parent Hospital DG
   - Reject → Original Health Center Accountant

2. **Hospital Reports**:
   - Submit → Same Hospital DAF
   - DAF Approve → Same Hospital DG
   - Reject → Original Hospital Accountant

### Access Control
- DAF/DG users can only approve reports from facilities within their hierarchy scope
- Validation occurs at multiple levels:
  - Permission check in `canDafApprove()` and `canDgApprove()`
  - Facility access check in `canApproveReport()`
  - District boundary enforcement through `FacilityHierarchyService`

### Notification Context
- All notifications include facility name and district information
- Notifications are sent only to users within the relevant district hierarchy
- Fallback to admin users if no DAF/DG users are found (Requirement 9.5)

### Rejection Flows
- Rejections always route back to the original facility accountant
- Report is unlocked for editing after rejection
- Rejection comments are required and stored

## Integration Points

### Dependencies
- `FacilityHierarchyService`: Provides hierarchy access control and user lookup
- `facilities` schema: Used for facility details and district information
- Existing workflow validation and state management

### Backward Compatibility
- Deprecated methods remain functional for existing code
- New hierarchy-aware methods are used in workflow service
- No breaking changes to existing API contracts

## Testing Considerations

### Unit Tests Needed
1. `canApproveReport()` validation for different user roles
2. Hierarchy routing in `submitForApproval()`
3. Hierarchy routing in `dafApprove()` and `dgApprove()`
4. Rejection flow routing
5. Notification routing for different facility types
6. Fallback to admin users when no DAF/DG users exist

### Integration Tests Needed
1. Complete approval flow: Health Center → Hospital DAF → Hospital DG
2. Complete approval flow: Hospital → Hospital DAF → Hospital DG
3. Rejection flows route back correctly
4. Cross-district access is blocked
5. Notifications include correct facility context

## Requirements Coverage

### Fully Implemented
- ✅ 3.1: Route health center reports to parent hospital DAF
- ✅ 3.2: Route DAF-approved reports to hospital DG
- ✅ 3.3: Route hospital reports to same hospital DAF/DG
- ✅ 3.4: Prevent cross-district approvals
- ✅ 3.5: Route rejections back to original facility
- ✅ 6.5: Rejection flows route correctly
- ✅ 5.2: DAF approval permissions validated
- ✅ 5.3: DG approval permissions validated
- ✅ 9.1: Notify DAF users at parent hospital
- ✅ 9.2: Notify DG users at same hospital
- ✅ 9.3: Notify accountant at source facility on rejection
- ✅ 9.4: Include facility and district context in notifications
- ✅ 9.5: Fallback to admin users if no DAF/DG found

## Files Modified
1. `apps/server/src/api/routes/financial-reports/financial-reports-workflow.service.ts`
2. `apps/server/src/api/routes/financial-reports/notification.service.ts`

## Next Steps
1. Run integration tests to verify complete approval flows
2. Test rejection flows with different facility types
3. Verify notifications include correct facility context
4. Test fallback to admin users scenario
5. Proceed to Task 10: Update notification service for hierarchy (if not already covered)
