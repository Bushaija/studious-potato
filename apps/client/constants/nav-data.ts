import type { SessionData } from '@/lib/auth-server';
import type { NavItem } from '@/types/nav-types';

type AuthUser = SessionData['user'];

type RoleNavItem = Omit<NavItem, 'items'> & {
  items?: RoleNavItem[];
  roles: string[];
};

const ALL_NAV_ITEMS: RoleNavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: 'dashboard',
    shortcut: ['d', 'd'],
    roles: ['accountant', 'admin', 'program_manager', 'superadmin', 'daf', 'dg'],
    items: []
  },

  // SCHEMA-DRIVEN PLANNING MODULE
  {
    title: 'Budget Planning',
    url: '/dashboard/planning',
    icon: 'clipboardList',
    shortcut: ['p', 'p'],
    roles: ['accountant', 'program_manager', 'admin', 'daf'],
  },

  // SCHEMA-DRIVEN EXECUTION MODULE
  {
    title: 'Budget Execution',
    url: '/dashboard/execution',
    icon: 'checkList',
    shortcut: ['e', 'e'],
    roles: ['accountant', 'program_manager', 'admin', 'daf']
  },
  {
    title: 'Budget Compilation',
    url: '/dashboard/compiled',
    icon: 'layers',
    shortcut: ['e', 'e'],
    roles: ['accountant', 'program_manager', 'admin', 'daf']
  },

  
  // ENHANCED REPORTING MODULE
  {
    title: 'Financial Reports',
    url: '/dashboard/reports',
    icon: 'notebookTabs',
    shortcut: ['r', 'r'],
    isActive: true,
    roles: ['accountant', 'program_manager'],
    items: [
      {
        title: 'Revenue & Expenditure',
        url: '/dashboard/reports/revenue-expenditure',
        icon: 'dollarSign',
        shortcut: ['r', 'e'],
        roles: ['accountant', 'program_manager']
      },
      {
        title: 'Balance Sheet',
        url: '/dashboard/reports/balance-sheet',
        icon: 'scale',
        shortcut: ['b', 's'],
        roles: ['accountant', 'program_manager']
      },
      {
        title: 'Cash Flow',
        url: '/dashboard/reports/cash-flow',
        icon: 'arrowUpDown',
        shortcut: ['c', 'f'],
        roles: ['accountant', 'program_manager']
      },
      {
        title: 'Net Assets Changes',
        url: '/dashboard/reports/net-assets-changes',
        icon: 'trendingUp',
        shortcut: ['n', 'a'],
        roles: ['accountant', 'program_manager']
      },
      {
        title: 'Budget vs Actual',
        url: '/dashboard/reports/budget-vs-actual',
        icon: 'barChart3',
        shortcut: ['b', 'a'],
        roles: ['accountant', 'program_manager']
      },
    ]
  },

  // APPROVAL WORKFLOWS
  {
    title: 'Approvals',
    url: '/dashboard/financial-reports',
    icon: 'clipboardCheck',
    shortcut: ['a', 'p'],
    isActive: true,
    roles: ['daf', 'dg'],
    items: [
      {
        title: 'DAF Queue',
        url: '/dashboard/daf-queue',
        icon: 'clipboardCheck',
        shortcut: ['d', 'q'],
        roles: ['daf']
      },
      {
        title: 'DG Queue',
        url: '/dashboard/financial-reports/dg-queue',
        icon: 'clipboardCheck',
        shortcut: ['d', 'g'],
        roles: ['dg']
      },
    ]
  },

  // ENHANCED ADMINISTRATION
  {
    title: 'Administration',
    url: '/dashboard/admin',
    icon: 'settings',
    shortcut: ['a', 'd'],
    roles: ['admin', 'superadmin'],
    isActive: true,
    items: [
      {
        title: 'User Management',
        url: '/dashboard/admin/users',
        icon: 'users',
        roles: ['admin', 'superadmin']
      },
      {
        title: 'System Configuration',
        url: '/dashboard/admin/system-config',
        icon: 'cog',
        roles: ['superadmin'],
        items: [
          {
            title: 'Global Settings',
            url: '/dashboard/admin/system-config/global',
            icon: 'globe',
            roles: ['superadmin']
          },
          {
            title: 'Configuration Audit',
            url: '/dashboard/admin/system-config/audit',
            icon: 'history',
            roles: ['superadmin']
          }
        ]
      },
    ]
  }
];

export function getNavigationForUser(user: AuthUser): NavItem[] {
  const role = user.role ?? "accountant";
  return filterNavItemsByRole(ALL_NAV_ITEMS, role) as NavItem[];
}

function filterNavItemsByRole(items: RoleNavItem[], userRole: string): RoleNavItem[] {
  return items
    .filter(item => item.roles.includes(userRole))
    .map(item => ({
      ...item,
      items: item.items ? filterNavItemsByRole(item.items, userRole) : []
    })) as RoleNavItem[];
}

// Enhanced permission-based filtering with facility and project scoping
export function getNavigationWithPermissions(
  user: AuthUser,
  permissions: string[],
  userFacility?: { id: number; facilityType: string },
  userProjects?: number[]
): NavItem[] {
  const roleBasedNav = getNavigationForUser(user);

  // Apply additional permission and scope-based filtering
  return roleBasedNav.map(item => {
    // Apply facility-specific filtering for accountants
    if (user.role === 'accountant' && userFacility) {
      // Customize navigation based on facility type
      if (userFacility.facilityType === 'health_center') {
        // Health centers might have different form schemas/activities
        // This could filter out hospital-specific items
      }
    }

    // Apply project-specific filtering for program managers
    if (user.role === 'program_manager' && userProjects) {
      // Filter project-related items based on assigned projects
    }

    return item;
  });
}

// Utility function to get navigation with dynamic schema awareness
export function getSchemaAwareNavigation(
  user: AuthUser,
  availableSchemas: string[] = [], // Form schema types available to user
  userConfig: {
    facilityType?: 'hospital' | 'health_center';
    projectTypes?: ('HIV' | 'Malaria' | 'TB')[];
    permissions?: string[];
  } = {}
): NavItem[] {
  const baseNav = getNavigationForUser(user);

  // Customize navigation based on available schemas and user context
  return baseNav.map(item => {
    // Add dynamic badges or modify items based on schema availability
    if (item.title === 'Budget Planning' && availableSchemas.includes('planning')) {
      // Could add a badge showing number of available planning schemas
    }

    if (item.title === 'Budget Execution' && availableSchemas.includes('execution')) {
      // Could add status indicators for pending executions
    }

    return item;
  });
}