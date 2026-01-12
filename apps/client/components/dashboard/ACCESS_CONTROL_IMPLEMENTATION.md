# Dashboard Access Control Implementation

## Overview
This document describes the role-based access control (RBAC) implementation for the Budget Monitoring Dashboard, ensuring users only see and interact with data relevant to their scope and authority.

## User Roles

### Admin
- **Scope**: National or Provincial level
- **Access**: Full access to all data across all regions
- **Capabilities**:
  - View both Province and District tabs
  - Switch between any province or district
  - View country-wide aggregates and comparisons
  - Filter by any program or quarter
  - See all approval states across the system

### Accountant
- **Scope**: One or more districts (typically District Hospital level)
- **Access**: Limited to their assigned district(s)
- **Capabilities**:
  - View District tab only (Province tab hidden)
  - Cannot change district selection (locked to their district)
  - View their own district metrics
  - View facility-level charts within their district
  - View facility approval table for their district
  - Filter by program and quarter within their scope

### Program Manager
- **Scope**: Similar to Accountant (district-level)
- **Access**: Limited to their assigned district(s)
- **Capabilities**: Same as Accountant role

## Access Control Matrix

| Feature / Tab                                 | Admin | Accountant | Program Manager |
| --------------------------------------------- | ----- | ---------- | --------------- |
| **Province Tab**                              | ✅     | 🚫          | 🚫               |
| **District Tab**                              | ✅     | ✅          | ✅               |
| **View All Provinces**                        | ✅     | 🚫          | 🚫               |
| **View All Districts**                        | ✅     | 🚫          | 🚫               |
| **Top Metrics Cards**                         | ✅     | ✅          | ✅               |
| **Pie Chart – Program Distribution**          | ✅     | ✅          | ✅               |
| **Bar Chart – Budget by District**            | ✅     | 🚫          | 🚫               |
| **Bar Chart – Budget by Facility**            | ✅     | ✅          | ✅               |
| **Province Table – Approval Summary**         | ✅     | 🚫          | 🚫               |
| **District Table – Facility Approvals**       | ✅     | ✅          | ✅               |
| **Filter by Any Province**                    | ✅     | 🚫          | 🚫               |
| **Filter by Any District**                    | ✅     | 🚫          | 🚫               |
| **Filter by Program**                         | ✅     | ✅          | ✅               |
| **Filter by Quarter**                         | ✅     | ✅          | ✅               |
| **Click District to Navigate**                | ✅     | 🚫          | 🚫               |

## Implementation Architecture

### Core Files

#### 1. `lib/dashboard-access-control.ts`
Central utility for access control logic.

**Key Functions:**
- `getDashboardAccessRights(user, facility)`: Returns comprehensive access rights based on user role
- `canAccessProvince(accessRights, provinceId)`: Check province access
- `canAccessDistrict(accessRights, districtId)`: Check district access
- `getDefaultTab(accessRights)`: Get default tab based on permissions
- `getDefaultDistrictId(accessRights)`: Get default district for accountants
- `filterAllowedDistricts(districts, accessRights)`: Filter district list
- `filterAllowedProvinces(provinces, accessRights)`: Filter province list

**Access Rights Interface:**
```typescript
interface DashboardAccessRights {
  // Tab visibility
  canViewProvinceTab: boolean;
  canViewDistrictTab: boolean;

  // Data scope
  canViewAllProvinces: boolean;
  canViewAllDistricts: boolean;
  allowedDistrictIds: number[];
  allowedProvinceIds: number[];

  // Feature access
  canViewProvinceLevelCharts: boolean;
  canViewDistrictLevelCharts: boolean;
  canViewProvinceApprovalTable: boolean;
  canViewDistrictApprovalTable: boolean;
  canViewBudgetByDistrictChart: boolean;
  canViewBudgetByFacilityChart: boolean;

  // Filter permissions
  canFilterByAnyProvince: boolean;
  canFilterByAnyDistrict: boolean;
  canFilterByProgram: boolean;
  canFilterByQuarter: boolean;
}
```

#### 2. `hooks/use-dashboard-access.ts`
React hook for accessing user permissions in components.

**Returns:**
- `accessRights`: Complete access rights object
- `defaultTab`: Default tab based on permissions
- `defaultDistrictId`: Default district ID for accountants
- `defaultProvinceId`: Default province ID (if applicable)
- `user`: Current user object
- `isLoading`: Loading state

**Usage:**
```typescript
const { accessRights, defaultTab, defaultDistrictId } = useDashboardAccess();
```

#### 3. `components/dashboard/EnhancedDashboard.tsx`
Main dashboard component with access control integration.

**Key Features:**
- Validates tab access before switching
- Prevents accountants from changing district/province
- Shows loading state while checking permissions
- Displays error if user has no access
- Conditionally renders tabs based on permissions
- Adjusts page description based on user role

#### 4. `components/dashboard/ProvinceTabContainer.tsx` & `DistrictTabContainer.tsx`
Container components that filter data based on access rights.

**Key Features:**
- Filter provinces/districts based on `allowedProvinceIds`/`allowedDistrictIds`
- Pass access rights to child components
- Notify parent when data is loaded

#### 5. `components/dashboard/ProvinceTab.tsx` & `DistrictTab.tsx`
Presentation components with conditional rendering.

**Key Features:**
- Conditionally render charts based on access rights
- Conditionally render tables based on access rights
- Disable district click navigation for accountants

## User Experience

### Admin Experience
1. Sees both Province and District tabs
2. Can switch freely between tabs
3. Province dropdown shows all provinces
4. District dropdown shows all districts
5. Can click on districts in Province tab to navigate to District tab
6. Sees all charts and tables
7. Full filtering capabilities

### Accountant Experience
1. Sees District tab only (no tab switcher shown)
2. District dropdown is pre-selected and disabled
3. Cannot change district selection
4. Page description adjusted: "Monitor budget allocation, execution, and approval status for your district"
5. Sees:
   - Budget summary cards (district-level)
   - Program distribution chart (district-level)
   - Budget by facility chart
   - Facility approval table
6. Does NOT see:
   - Province tab
   - Budget by district chart
   - Province approval table
   - District click navigation
7. Can filter by program and quarter only

## Data Flow

```
User Login
    ↓
Session Created (includes user.role, user.facilityId, user.facility)
    ↓
useDashboardAccess() hook
    ↓
getDashboardAccessRights(user, facility)
    ↓
Returns DashboardAccessRights object
    ↓
EnhancedDashboard component
    ↓
- Validates tab access
- Sets default tab/district
- Prevents unauthorized actions
    ↓
ProvinceTabContainer / DistrictTabContainer
    ↓
- Filters provinces/districts
- Passes access rights to child
    ↓
ProvinceTab / DistrictTab
    ↓
- Conditionally renders components
- Disables restricted features
```

## Security Considerations

### Frontend Security
- Access control is enforced at component level
- Unauthorized actions are prevented (not just hidden)
- URL parameters are validated against access rights
- District/province changes are blocked for accountants

### Backend Security (Required)
⚠️ **Important**: Frontend access control is NOT sufficient for security.

The backend API must also enforce access control:
1. Validate user permissions on every request
2. Filter data based on user's district/province
3. Reject requests for unauthorized data
4. Log access attempts for audit

**Example Backend Validation:**
```typescript
// In dashboard.handlers.ts
if (user.role === 'accountant') {
  // Validate requested districtId matches user's facility district
  if (requestedDistrictId !== user.facility.districtId) {
    throw new Error('Access denied: Cannot access other districts');
  }
}
```

## Testing Scenarios

### Test as Admin
1. ✅ Can see both Province and District tabs
2. ✅ Can switch between tabs
3. ✅ Can select any province
4. ✅ Can select any district
5. ✅ Can click districts in Province tab to navigate
6. ✅ Sees all charts and tables

### Test as Accountant
1. ✅ Sees District tab only
2. ✅ Cannot see Province tab
3. ✅ District is pre-selected and locked
4. ✅ Cannot change district
5. ✅ Cannot click districts to navigate
6. ✅ Sees district-level charts only
7. ✅ Does not see province-level charts
8. ✅ Can filter by program and quarter

### Test Edge Cases
1. ✅ User with no facility assigned
2. ✅ User with invalid role
3. ✅ URL manipulation attempts (e.g., ?tab=province for accountant)
4. ✅ Direct district ID in URL for accountant
5. ✅ Session expiration during dashboard use

## Future Enhancements

### Potential Improvements
1. **Multi-District Accountants**: Support accountants assigned to multiple districts
2. **Province-Level Accountants**: Add role for province-level oversight
3. **Temporary Access**: Allow admins to grant temporary access to specific districts
4. **Audit Logging**: Log all access attempts and data views
5. **Data Export Restrictions**: Limit export capabilities based on role
6. **Time-Based Access**: Restrict access to certain periods based on role

### Configuration Options
Consider adding configuration for:
- Custom role definitions
- Granular permission sets
- Dynamic access rules based on organizational structure
- Integration with external authorization systems (e.g., OAuth, LDAP)

## Troubleshooting

### Common Issues

**Issue**: Accountant sees "No permission" error
- **Cause**: User's facility has no district assigned
- **Solution**: Ensure user.facility.districtId is set in database

**Issue**: Admin cannot see Province tab
- **Cause**: User role not properly set
- **Solution**: Verify user.role === 'admin' in database

**Issue**: District dropdown shows all districts for accountant
- **Cause**: Access rights not properly filtered
- **Solution**: Check `filterAllowedDistricts()` is called in container

**Issue**: Accountant can change district via URL
- **Cause**: URL validation not working
- **Solution**: Verify `handleDistrictChange()` checks `canFilterByAnyDistrict`

## Maintenance

### When Adding New Features
1. Update `DashboardAccessRights` interface if new permissions needed
2. Update `getDashboardAccessRights()` for each role
3. Add conditional rendering in tab components
4. Update this documentation
5. Add test cases for new features

### When Adding New Roles
1. Add role to `UserRole` type in `types/user.ts`
2. Add role case in `getDashboardAccessRights()`
3. Update access control matrix in this document
4. Test all dashboard features with new role
5. Update backend validation

## References

- User Types: `apps/client/types/user.ts`
- Access Control Logic: `apps/client/lib/dashboard-access-control.ts`
- Access Hook: `apps/client/hooks/use-dashboard-access.ts`
- Main Dashboard: `apps/client/components/dashboard/EnhancedDashboard.tsx`
- Backend Services: `apps/server/src/api/services/dashboard/access-control.service.ts`
