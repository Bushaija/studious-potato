# Hierarchy User Management Guide

## Overview
This guide explains how to use the enhanced user management interface with support for DAF (Directeur Administratif et Financier) and DG (Directeur Général) roles with facility hierarchy.

## Creating Users with DAF/DG Roles

### Step 1: Access User Management
1. Navigate to Dashboard → Admin → Users
2. Click "New User" button

### Step 2: Select Role
When creating a user, you can now select from these roles:
- **Admin**: Full system access
- **Accountant**: Budget planning and execution
- **Program Manager**: Project oversight
- **DAF**: First-level financial approver (Hospital only)
- **DG**: Final financial approver (Hospital only)

### Step 3: Assign Facility

#### For DAF or DG Roles:
When you select DAF or DG role, the facility selector changes to show:
- **Hospital-only facilities**: Only hospitals are available
- **District grouping**: Facilities organized by district
- **Hierarchy information**: Shows how many health centers each hospital oversees
- **Visual indicators**: Hospital badge and child count

Example display:
```
District: Butaro
  ✓ Butaro Hospital [Hospital]
    → 15 health centers in district
```

#### For Other Roles:
Standard facility selector shows all facilities (hospitals and health centers).

### Step 4: Complete User Creation
1. Fill in remaining fields (name, email, password, permissions)
2. Click "Create User"
3. System validates that DAF/DG users are assigned to hospitals

## Understanding the Facility Hierarchy

### Hospital Facilities
- Serve as district hubs
- Can have DAF and DG users
- Oversee multiple health centers in the same district
- Shown with blue "Hospital" badge

### Health Center Facilities
- Report to a parent hospital
- Cannot have DAF or DG users
- Shown with green "HC" badge

### District Organization
All facilities are organized by district. DAF and DG users at a hospital can approve reports from:
- Their own hospital
- All health centers in the same district

## User List Display

### Viewing DAF/DG Users
In the users table, DAF and DG users show:
- **Role badge**: Color-coded (DAF: default, DG: red)
- **Facility name**: The hospital they're assigned to
- **Facility type badge**: "Hospital" badge below facility name
- **Visual distinction**: Easy to identify approval roles

Example:
```
Name: John Doe
Role: [DAF]
Facility: Butaro Hospital
         [Hospital]
```

## Editing Users

### Changing Role to DAF/DG
1. Click on user in the table
2. Click "Edit User"
3. Change role to DAF or DG
4. Facility selector automatically switches to hospital-only mode
5. Select a hospital facility
6. Save changes

### Validation
The system prevents:
- ❌ Assigning DAF/DG roles to health centers
- ❌ Creating DAF/DG users without a facility
- ❌ Selecting non-hospital facilities for DAF/DG roles

## Facility Selector Features

### Search
- Type to search by facility name or district
- Results update in real-time
- Search works across all visible facilities

### District Grouping
- Facilities organized by district
- Easy to find facilities in specific areas
- Hospitals listed first, then health centers

### Hierarchy Visualization
- Hospitals show child health center count
- Example: "→ 15 health centers in district"
- Helps understand approval scope

### Accessibility
- Full keyboard navigation
- Screen reader support
- ARIA labels for all interactive elements

## Common Scenarios

### Scenario 1: Create Hospital DAF User
1. Click "New User"
2. Enter name: "Jane Smith"
3. Enter email: "jane.smith@hospital.rw"
4. Set password
5. Select role: "DAF"
6. Select facility: "Butaro Hospital" (from hospital-only list)
7. Set permissions as needed
8. Click "Create User"

Result: Jane can approve reports from Butaro Hospital and all health centers in Butaro district.

### Scenario 2: Create Health Center Accountant
1. Click "New User"
2. Enter user details
3. Select role: "Accountant"
4. Select facility: "Kivuye Health Center" (from all facilities)
5. Set permissions
6. Click "Create User"

Result: Accountant can only access data from Kivuye Health Center.

### Scenario 3: Promote Accountant to DAF
1. Find accountant user in table
2. Click "Edit User"
3. Change role from "Accountant" to "DAF"
4. Facility selector switches to hospital-only mode
5. Select a hospital facility
6. Save changes

Result: User now has DAF approval permissions for the selected hospital and its district.

## Troubleshooting

### "DAF and DG roles require a hospital facility"
**Problem**: Trying to assign DAF/DG role to health center
**Solution**: Select a hospital facility from the dropdown

### Facility selector shows "No hospitals found"
**Problem**: No hospital facilities in the system
**Solution**: Contact system administrator to add hospital facilities

### Cannot see facility hierarchy
**Problem**: Facility selector not showing child counts
**Solution**: Ensure you've selected DAF or DG role first

### User creation fails with facility validation error
**Problem**: Server rejected facility assignment
**Solution**: 
1. Verify facility is a hospital
2. Check facility exists in the system
3. Ensure facility is in active status

## Best Practices

### Role Assignment
- ✅ Assign DAF users to district hospitals
- ✅ Assign DG users to the same hospitals as DAF users
- ✅ Assign accountants to their specific facilities
- ✅ Use admin role sparingly

### Facility Selection
- ✅ Review child health center count before assigning
- ✅ Ensure district alignment with organizational structure
- ✅ Verify hospital has active status

### User Management
- ✅ Create DAF users before DG users in new districts
- ✅ Maintain at least one DAF and one DG per hospital
- ✅ Document approval hierarchy in your organization

## Related Documentation
- [Task 15 Implementation Summary](./TASK_15_IMPLEMENTATION_SUMMARY.md)
- [Task 15 Verification Checklist](./TASK_15_VERIFICATION_CHECKLIST.md)
- [District-Based Role Hierarchy Requirements](../../../../.kiro/specs/district-based-role-hierarchy/requirements.md)
- [District-Based Role Hierarchy Design](../../../../.kiro/specs/district-based-role-hierarchy/design.md)
