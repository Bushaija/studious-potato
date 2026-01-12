export const VALID_PERMISSIONS = [
  'view_reports',
  'edit_budget',
  'manage_users',
  'admin_access',
  'all_quarters',
  'access_previous_fiscal_year_data',
] as const;

export type Permission = typeof VALID_PERMISSIONS[number];

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  view_reports: 'View financial reports',
  edit_budget: 'Edit budget data',
  manage_users: 'Manage user accounts',
  admin_access: 'Full administrative access',
  all_quarters: 'Access all quarters',
  access_previous_fiscal_year_data: 'Access previous fiscal year data',
};
