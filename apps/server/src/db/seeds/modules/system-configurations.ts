import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { SeedManager } from "../utils/seed-manager";

interface SystemConfigurationData {
  configKey: string;
  configValue: any;
  description: string;
  configType: string;
  scope: "GLOBAL" | "PROJECT" | "FACILITY";
  scopeId?: number;
}

// Global system configurations
const globalConfigurations: SystemConfigurationData[] = [
  // Form validation configurations
  {
    configKey: 'form_validation_rules',
    configValue: {
      currency: {
        min: 0,
        max: 999999999.99,
        decimalPlaces: 2
      },
      percentage: {
        min: 0,
        max: 100,
        decimalPlaces: 2
      },
      date: {
        minYear: 2020,
        maxYear: 2030,
        format: 'YYYY-MM-DD'
      },
      text: {
        minLength: 1,
        maxLength: 500
      },
      textarea: {
        minLength: 1,
        maxLength: 2000
      }
    },
    description: 'Global form field validation rules',
    configType: 'validation',
    scope: 'GLOBAL'
  },

  // Financial statement configurations
  {
    configKey: 'financial_statements_config',
    configValue: {
      defaultCurrency: 'RWF',
      currencyFormat: {
        symbol: 'RWF',
        position: 'after',
        thousandsSeparator: ',',
        decimalSeparator: '.',
        decimalPlaces: 2
      },
      reportingPeriods: {
        defaultType: 'ANNUAL',
        fiscalYearStart: '07-01', // July 1st
        fiscalYearEnd: '06-30'    // June 30th
      },
      statements: {
        showVarianceColumns: true,
        showPercentageColumns: true,
        highlightNegativeValues: true
      }
    },
    description: 'Financial statement display and formatting configuration',
    configType: 'reporting',
    scope: 'GLOBAL'
  },

  // Planning form configurations
  {
    configKey: 'planning_form_config',
    configValue: {
      defaultFields: {
        frequency: {
          type: 'number',
          label: 'Frequency',
          required: true,
          min: 1,
          max: 12
        },
        unitCost: {
          type: 'currency',
          label: 'Unit Cost',
          required: true,
          min: 0
        },
        quarterCounts: {
          q1: { type: 'number', label: 'Q1 Count', min: 0 },
          q2: { type: 'number', label: 'Q2 Count', min: 0 },
          q3: { type: 'number', label: 'Q3 Count', min: 0 },
          q4: { type: 'number', label: 'Q4 Count', min: 0 }
        }
      },
      calculations: {
        quarterAmount: 'frequency * unitCost * quarterCount',
        totalBudget: 'sum(q1Amount + q2Amount + q3Amount + q4Amount)'
      }
    },
    description: 'Planning form field configurations and calculation rules',
    configType: 'form',
    scope: 'GLOBAL'
  },

  // Execution form configurations
  {
    configKey: 'execution_form_config',
    configValue: {
      defaultFields: {
        quarterlyAmounts: {
          q1: { type: 'currency', label: 'Q1 Amount', required: true },
          q2: { type: 'currency', label: 'Q2 Amount', required: true },
          q3: { type: 'currency', label: 'Q3 Amount', required: true },
          q4: { type: 'currency', label: 'Q4 Amount', required: true }
        },
        comment: {
          type: 'textarea',
          label: 'Comments',
          required: false,
          maxLength: 1000
        }
      },
      calculations: {
        cumulativeBalance: 'q1Amount + q2Amount + q3Amount + q4Amount'
      },
      validation: {
        warnOnLargeVariance: true,
        varianceThreshold: 0.20 // 20% variance threshold
      }
    },
    description: 'Execution form field configurations and validation rules',
    configType: 'form',
    scope: 'GLOBAL'
  },

  // User permissions configuration
  {
    configKey: 'user_permissions',
    configValue: {
      roles: {
        accountant: {
          canViewReports: true,
          canEditPlanningData: true,
          canEditExecutionData: true,
          canSubmitReports: true,
          canApproveReports: false,
          canManageUsers: false,
          canConfigureSystem: false
        },
        admin: {
          canViewReports: true,
          canEditPlanningData: true,
          canEditExecutionData: true,
          canSubmitReports: true,
          canApproveReports: true,
          canManageUsers: true,
          canConfigureSystem: true
        },
        program_manager: {
          canViewReports: true,
          canEditPlanningData: true,
          canEditExecutionData: false,
          canSubmitReports: false,
          canApproveReports: true,
          canManageUsers: false,
          canConfigureSystem: false
        }
      }
    },
    description: 'User role permissions configuration',
    configType: 'security',
    scope: 'GLOBAL'
  },

  // Data validation thresholds
  {
    configKey: 'data_validation_thresholds',
    configValue: {
      budgetVariance: {
        warning: 0.15,  // 15%
        error: 0.30     // 30%
      },
      executionVariance: {
        warning: 0.10,  // 10%
        error: 0.25     // 25%
      },
      quarterlyDistribution: {
        maxQuarterPercentage: 0.60,  // 60%
        minQuarterPercentage: 0.05   // 5%
      }
    },
    description: 'Data validation thresholds and warning levels',
    configType: 'validation',
    scope: 'GLOBAL'
  },

  // Audit configuration
  {
    configKey: 'audit_config',
    configValue: {
      enableAuditLog: true,
      auditableOperations: ['CREATE', 'UPDATE', 'DELETE'],
      auditableTables: [
        'enhanced_users',
        'enhanced_projects', 
        'schema_form_data_entries',
        'enhanced_financial_reports',
        'form_schemas',
        'dynamic_activities',
        'configurable_event_mappings'
      ],
      retentionPeriodDays: 2555 // 7 years
    },
    description: 'System audit logging configuration',
    configType: 'audit',
    scope: 'GLOBAL'
  },

  // Email notification configuration
  {
    configKey: 'notification_config',
    configValue: {
      emailEnabled: false, // Set to true when email service is configured
      notifications: {
        reportSubmitted: {
          enabled: true,
          recipients: ['admin', 'program_manager'],
          template: 'report_submitted'
        },
        reportApproved: {
          enabled: true,
          recipients: ['accountant'],
          template: 'report_approved'
        },
        reportRejected: {
          enabled: true,
          recipients: ['accountant'],
          template: 'report_rejected'
        },
        dataValidationWarning: {
          enabled: true,
          recipients: ['accountant', 'admin'],
          template: 'validation_warning'
        }
      }
    },
    description: 'Email notification configuration',
    configType: 'notification',
    scope: 'GLOBAL'
  },

  // Backup and maintenance configuration
  {
    configKey: 'maintenance_config',
    configValue: {
      backupSchedule: {
        enabled: true,
        frequency: 'daily',
        time: '02:00',
        retentionDays: 90
      },
      maintenanceWindow: {
        enabled: false,
        dayOfWeek: 'Sunday',
        startTime: '02:00',
        endTime: '04:00',
        timezone: 'Africa/Kigali'
      },
      dataArchival: {
        enabled: true,
        archiveAfterYears: 5,
        scheduleMonthly: true
      }
    },
    description: 'System maintenance and backup configuration',
    configType: 'maintenance',
    scope: 'GLOBAL'
  }
];

// Project-specific configurations (examples for HIV project)
const projectConfigurations: SystemConfigurationData[] = [
  {
    configKey: 'hiv_project_config',
    configValue: {
      projectCode: 'HIV',
      projectName: 'HIV National Strategic Plan',
      projectType: 'HIV',
      defaultReportingFrequency: 'quarterly',
      enablePlanningModule: true,
      enableExecutionModule: true,
      enableReportingModule: true,
      customValidations: {
        hrActivitiesRequired: true,
        minimumQuarterlyBudget: 1000000, // 1M RWF
        maxVarianceBeforeWarning: 0.15
      },
      specificFormFields: {
        requireFrequencyField: true,
        requireUnitCostField: true,
        requireCommentField: false
      }
    },
    description: 'HIV project-specific configuration settings',
    configType: 'project',
    scope: 'PROJECT'
    // scopeId will be set when we know the HIV project ID
  }
];

/* eslint-disable no-console */
export async function seedSystemConfigurations(
  db: Database,
  configType?: string
) {
  console.log(`Seeding system configurations${configType ? ` for type ${configType}` : ''}...`);

  // Filter configurations by type if specified
  const configurationsToSeed = configType 
    ? globalConfigurations.filter(config => config.configType === configType)
    : globalConfigurations;

  if (configurationsToSeed.length === 0) {
    console.warn(`No configurations found${configType ? ` for type ${configType}` : ''}`);
    return;
  }

  console.log(`Preparing ${configurationsToSeed.length} global system configurations`);

  // Seed global configurations
  const globalConfigRows = configurationsToSeed.map(config => ({
    configKey: config.configKey,
    configValue: config.configValue,
    description: config.description,
    configType: config.configType,
    scope: config.scope,
    scopeId: config.scopeId || null,
    isActive: true,
  }));

  const seedManager = new SeedManager(db);
  await seedManager.seedWithConflictResolution(schema.systemConfigurations, globalConfigRows, {
    uniqueFields: ["configKey", "scope", "scopeId"],
    onConflict: "update",
    updateFields: ["configValue", "description", "configType", "isActive"],
  });

  // Seed project-specific configurations
  const projects = await db
    .select({ id: schema.projects.id, code: schema.projects.code })
    .from(schema.projects);

  if (projects.length > 0) {
    const projectConfigRows = projectConfigurations.map(config => {
      // Find matching project for this configuration
      const matchingProject = projects.find(p => 
        config.configValue.projectCode === p.code
      );
      
      if (matchingProject) {
        return {
          configKey: config.configKey,
          configValue: config.configValue,
          description: config.description,
          configType: config.configType,
          scope: config.scope,
          scopeId: matchingProject.id,
          isActive: true,
        };
      }
      return null;
    }).filter((row): row is NonNullable<typeof row> => row !== null);

    if (projectConfigRows.length > 0) {
      await seedManager.seedWithConflictResolution(schema.systemConfigurations, projectConfigRows, {
        uniqueFields: ["configKey", "scope", "scopeId"],
        onConflict: "skip",
        updateFields: ["configValue", "description", "configType", "isActive"],
      });
      console.log(`Seeded ${projectConfigRows.length} project-specific configurations`);
    }
  }

  console.log(`Seeded ${globalConfigRows.length} global system configurations`);
  
  // Log summary by configuration type
  const summary = configurationsToSeed.reduce((acc, config) => {
    acc[config.configType] = (acc[config.configType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log("Summary:", Object.entries(summary)
    .map(([key, count]) => `${count} ${key}`)
    .join(", "));
}

export default async function seed(db: Database) {
  await seedSystemConfigurations(db);
}