/**
 * Valid user permission types
 */
export type UserPermission = 
  | 'view_reports'
  | 'edit_budget'
  | 'manage_users'
  | 'admin_access'
  | 'all_quarters';

/**
 * Array of user permissions
 */
export type UserPermissions = UserPermission[];

/**
 * Array of project IDs that a user has access to
 */
export type ProjectAccess = number[];
