/**
 * Context Resolution Utility
 * 
 * This utility provides robust context resolution for execution data retrieval,
 * ensuring that the correct project and facility type information is used
 * for activity catalog loading and UI display.
 * 
 * Requirements addressed:
 * - 1.1: Use actual project and facility information from database
 * - 1.2: Prioritize database records over form data context
 * - 3.2: Log context resolution decisions
 */

export interface ExecutionContext {
  projectType: string;
  facilityType: string;
  source: 'database' | 'form_data' | 'inferred';
  corrected: boolean;
}

export interface ContextResolutionResult {
  context: ExecutionContext;
  warnings: string[];
}

export interface ActivityValidationResult {
  isValid: boolean;
  expectedPrefix: string;
  actualPrefixes: string[];
  mismatches: string[];
  validationReport: ActivityValidationReport;
}

export interface ActivityValidationReport {
  executionId: number;
  timestamp: string;
  expectedContext: {
    projectType: string;
    facilityType: string;
  };
  summary: {
    totalActivities: number;
    validActivities: number;
    invalidActivities: number;
    validationRate: number;
  };
  prefixAnalysis: {
    expectedPrefix: string;
    foundPrefixes: Array<{
      prefix: string;
      count: number;
      isValid: boolean;
    }>;
  };
  detailedMismatches: Array<{
    code: string;
    expectedPrefix: string;
    actualPrefix: string;
    issue: 'wrong_project' | 'wrong_facility' | 'malformed' | 'missing_parts';
  }>;
  recommendations: string[];
}

export interface ExecutionRecord {
  id: number;
  project?: {
    projectType: string;
  } | null;
  facility?: {
    facilityType: string;
  } | null;
  formData?: {
    context?: {
      projectType?: string;
      facilityType?: string;
    };
    activities?: Array<{
      code?: string;
    }>;
  };
}

/**
 * Resolves execution context from database records with fallback to form data
 * 
 * Priority order:
 * 1. Database project.projectType and facility.facilityType
 * 2. Form data context if database values are missing
 * 3. Validation and correction of mismatches
 */
export function resolveExecutionContext(
  record: ExecutionRecord,
  logger?: (level: 'info' | 'warn' | 'error', message: string, meta?: any) => void
): ContextResolutionResult {
  const warnings: string[] = [];
  const log = logger || console.log;

  // Extract database values
  const dbProjectType = record.project?.projectType;
  const dbFacilityType = record.facility?.facilityType;

  // Extract form data context values
  const formProjectType = record.formData?.context?.projectType;
  const formFacilityType = record.formData?.context?.facilityType;

  log('info', 'Starting context resolution', {
    executionId: record.id,
    dbProjectType,
    dbFacilityType,
    formProjectType,
    formFacilityType
  });

  // Determine final context values
  let finalProjectType: string;
  let finalFacilityType: string;
  let source: ExecutionContext['source'] = 'database';
  let corrected = false;

  // Resolve project type
  if (dbProjectType) {
    finalProjectType = dbProjectType;
    
    // Check for mismatch with form data
    if (formProjectType && formProjectType !== dbProjectType) {
      corrected = true;
      const warning = `Project type mismatch detected for execution ${record.id}: form data shows '${formProjectType}' but database shows '${dbProjectType}'. Using database value.`;
      warnings.push(warning);
      log('warn', warning, {
        executionId: record.id,
        formValue: formProjectType,
        databaseValue: dbProjectType
      });
    }
  } else if (formProjectType) {
    finalProjectType = formProjectType;
    source = 'form_data';
    const warning = `Using form data project type '${formProjectType}' for execution ${record.id} - database value missing`;
    warnings.push(warning);
    log('info', warning, { executionId: record.id });
  } else {
    // Fallback to default - this should rarely happen
    finalProjectType = 'HIV'; // Default based on system behavior
    source = 'inferred';
    const warning = `No project type found for execution ${record.id}, using default 'HIV'`;
    warnings.push(warning);
    log('warn', warning, { executionId: record.id });
  }

  // Resolve facility type
  if (dbFacilityType) {
    finalFacilityType = dbFacilityType;
    
    // Check for mismatch with form data
    if (formFacilityType && formFacilityType !== dbFacilityType) {
      corrected = true;
      const warning = `Facility type mismatch detected for execution ${record.id}: form data shows '${formFacilityType}' but database shows '${dbFacilityType}'. Using database value.`;
      warnings.push(warning);
      log('warn', warning, {
        executionId: record.id,
        formValue: formFacilityType,
        databaseValue: dbFacilityType
      });
    }
  } else if (formFacilityType) {
    finalFacilityType = formFacilityType;
    if (source === 'database') source = 'form_data';
    const warning = `Using form data facility type '${formFacilityType}' for execution ${record.id} - database value missing`;
    warnings.push(warning);
    log('info', warning, { executionId: record.id });
  } else {
    // Fallback to default
    finalFacilityType = 'hospital'; // Default based on system behavior
    source = 'inferred';
    const warning = `No facility type found for execution ${record.id}, using default 'hospital'`;
    warnings.push(warning);
    log('warn', warning, { executionId: record.id });
  }

  const context: ExecutionContext = {
    projectType: finalProjectType,
    facilityType: finalFacilityType,
    source,
    corrected
  };

  log('info', 'Context resolution completed', {
    executionId: record.id,
    resolvedContext: context,
    warningsCount: warnings.length
  });

  return {
    context,
    warnings
  };
}

/**
 * Validates stored activity codes against expected context
 * 
 * Checks if activity code prefixes match the expected pattern:
 * {PROJECT}_{MODULE}_{FACILITY} (e.g., HIV_EXEC_HOSPITAL, MAL_EXEC_HEALTH_CENTER)
 */
export function validateActivityCodes(
  activities: Array<{ code?: string }> | undefined,
  expectedContext: ExecutionContext,
  executionId: number = 0,
  logger?: (level: 'info' | 'warn' | 'error', message: string, meta?: any) => void
): ActivityValidationResult {
  const log = logger || console.log;
  
  if (!activities || activities.length === 0) {
    log('info', 'No activities to validate');
    const emptyReport = generateValidationReport([], expectedContext, executionId);
    return {
      isValid: true,
      expectedPrefix: '',
      actualPrefixes: [],
      mismatches: [],
      validationReport: emptyReport
    };
  }

  // Build expected prefix pattern
  const projectPrefix = expectedContext.projectType.toUpperCase();
  const facilityPrefix = expectedContext.facilityType.toUpperCase();
  const expectedPrefix = `${projectPrefix}_EXEC_${facilityPrefix}`;

  log('info', 'Starting activity code validation', {
    executionId,
    expectedPrefix,
    activityCount: activities.length
  });

  // Extract actual prefixes from activity codes and analyze mismatches
  const actualPrefixes: string[] = [];
  const mismatches: string[] = [];
  const detailedMismatches: ActivityValidationReport['detailedMismatches'] = [];
  const prefixCounts = new Map<string, number>();

  for (const activity of activities) {
    if (!activity.code) continue;

    const code = activity.code;
    const parts = code.split('_');
    
    if (parts.length >= 3) {
      // For codes like "HIV_EXEC_HOSPITAL_A_1", we want "HIV_EXEC_HOSPITAL"
      const prefix = `${parts[0]}_${parts[1]}_${parts[2]}`;
      
      if (!actualPrefixes.includes(prefix)) {
        actualPrefixes.push(prefix);
      }

      // Count prefix occurrences
      prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);

      // Check if this code matches expected pattern
      if (!code.startsWith(expectedPrefix)) {
        mismatches.push(code);
        
        // Analyze the type of mismatch
        const actualProject = parts[0];
        const actualFacility = parts[2];
        const expectedProject = projectPrefix;
        const expectedFacilityType = facilityPrefix;

        let issue: ActivityValidationReport['detailedMismatches'][0]['issue'];
        if (actualProject !== expectedProject && actualFacility !== expectedFacilityType) {
          issue = 'wrong_project'; // Both wrong, but classify as project issue
        } else if (actualProject !== expectedProject) {
          issue = 'wrong_project';
        } else if (actualFacility !== expectedFacilityType) {
          issue = 'wrong_facility';
        } else {
          issue = 'malformed';
        }

        detailedMismatches.push({
          code,
          expectedPrefix,
          actualPrefix: prefix,
          issue
        });
      }
    } else {
      // Malformed code
      mismatches.push(code);
      detailedMismatches.push({
        code,
        expectedPrefix,
        actualPrefix: code,
        issue: 'missing_parts'
      });
    }
  }

  const isValid = mismatches.length === 0;

  // Generate comprehensive validation report
  const validationReport = generateValidationReport(
    activities,
    expectedContext,
    executionId,
    {
      actualPrefixes,
      mismatches,
      detailedMismatches,
      prefixCounts
    }
  );

  log('info', 'Activity code validation completed', {
    executionId,
    expectedPrefix,
    actualPrefixes,
    mismatchCount: mismatches.length,
    validationRate: validationReport.summary.validationRate,
    isValid
  });

  if (!isValid) {
    log('warn', 'Activity code mismatches detected', {
      executionId,
      expectedPrefix,
      mismatchCount: mismatches.length,
      validationRate: validationReport.summary.validationRate,
      topMismatches: mismatches.slice(0, 5) // Log first 5 mismatches
    });
  }

  return {
    isValid,
    expectedPrefix,
    actualPrefixes,
    mismatches,
    validationReport
  };
}

/**
 * Generates a comprehensive validation report for debugging and monitoring
 */
function generateValidationReport(
  activities: Array<{ code?: string }>,
  expectedContext: ExecutionContext,
  executionId: number,
  analysisData?: {
    actualPrefixes: string[];
    mismatches: string[];
    detailedMismatches: ActivityValidationReport['detailedMismatches'];
    prefixCounts: Map<string, number>;
  }
): ActivityValidationReport {
  const timestamp = new Date().toISOString();
  const totalActivities = activities.length;
  const validActivities = totalActivities - (analysisData?.mismatches.length || 0);
  const invalidActivities = analysisData?.mismatches.length || 0;
  const validationRate = totalActivities > 0 ? (validActivities / totalActivities) * 100 : 100;

  const projectPrefix = expectedContext.projectType.toUpperCase();
  const facilityPrefix = expectedContext.facilityType.toUpperCase();
  const expectedPrefix = `${projectPrefix}_EXEC_${facilityPrefix}`;

  // Build prefix analysis
  const foundPrefixes = Array.from(analysisData?.prefixCounts?.entries() || []).map(([prefix, count]) => ({
    prefix,
    count,
    isValid: prefix === expectedPrefix
  }));

  // Generate recommendations based on analysis
  const recommendations = generateRecommendations(
    analysisData?.detailedMismatches || [],
    expectedContext,
    validationRate
  );

  return {
    executionId,
    timestamp,
    expectedContext: {
      projectType: expectedContext.projectType,
      facilityType: expectedContext.facilityType
    },
    summary: {
      totalActivities,
      validActivities,
      invalidActivities,
      validationRate: Math.round(validationRate * 100) / 100 // Round to 2 decimal places
    },
    prefixAnalysis: {
      expectedPrefix,
      foundPrefixes
    },
    detailedMismatches: analysisData?.detailedMismatches || [],
    recommendations
  };
}

/**
 * Generates actionable recommendations based on validation results
 */
function generateRecommendations(
  mismatches: ActivityValidationReport['detailedMismatches'],
  expectedContext: ExecutionContext,
  validationRate: number
): string[] {
  const recommendations: string[] = [];

  if (validationRate === 100) {
    recommendations.push('✅ All activity codes are valid and consistent with the execution context.');
    return recommendations;
  }

  // Analyze mismatch patterns
  const issueTypes = mismatches.reduce((acc, mismatch) => {
    acc[mismatch.issue] = (acc[mismatch.issue] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (issueTypes.wrong_project) {
    recommendations.push(
      `🔄 ${issueTypes.wrong_project} activities have incorrect project type. Expected: ${expectedContext.projectType.toUpperCase()}`
    );
  }

  if (issueTypes.wrong_facility) {
    recommendations.push(
      `🏥 ${issueTypes.wrong_facility} activities have incorrect facility type. Expected: ${expectedContext.facilityType.toUpperCase()}`
    );
  }

  if (issueTypes.malformed) {
    recommendations.push(
      `⚠️ ${issueTypes.malformed} activities have malformed codes that don't follow the expected pattern`
    );
  }

  if (issueTypes.missing_parts) {
    recommendations.push(
      `❌ ${issueTypes.missing_parts} activities have incomplete codes missing required parts`
    );
  }

  // Overall recommendations
  if (validationRate < 50) {
    recommendations.push(
      '🚨 Critical: Less than 50% of activities are valid. Consider data migration or correction.'
    );
  } else if (validationRate < 80) {
    recommendations.push(
      '⚠️ Warning: Validation rate is below 80%. Review data consistency processes.'
    );
  }

  recommendations.push(
    '💡 Consider implementing automated data validation during form submission to prevent future inconsistencies.'
  );

  return recommendations;
}

/**
 * Formats validation report for logging and monitoring
 */
export function formatValidationReportForLogging(report: ActivityValidationReport): string {
  const lines = [
    `=== Activity Validation Report ===`,
    `Execution ID: ${report.executionId}`,
    `Timestamp: ${report.timestamp}`,
    `Expected Context: ${report.expectedContext.projectType}/${report.expectedContext.facilityType}`,
    ``,
    `Summary:`,
    `  Total Activities: ${report.summary.totalActivities}`,
    `  Valid Activities: ${report.summary.validActivities}`,
    `  Invalid Activities: ${report.summary.invalidActivities}`,
    `  Validation Rate: ${report.summary.validationRate}%`,
    ``,
    `Prefix Analysis:`,
    `  Expected: ${report.prefixAnalysis.expectedPrefix}`,
    `  Found Prefixes:`,
    ...report.prefixAnalysis.foundPrefixes.map(p => 
      `    ${p.isValid ? '✅' : '❌'} ${p.prefix} (${p.count} activities)`
    ),
  ];

  if (report.detailedMismatches.length > 0) {
    lines.push(
      ``,
      `Detailed Mismatches (first 10):`,
      ...report.detailedMismatches.slice(0, 10).map(m => 
        `  ${m.code} -> Expected: ${m.expectedPrefix}, Issue: ${m.issue}`
      )
    );
  }

  if (report.recommendations.length > 0) {
    lines.push(
      ``,
      `Recommendations:`,
      ...report.recommendations.map(r => `  ${r}`)
    );
  }

  lines.push(`=== End Report ===`);
  
  return lines.join('\n');
}

/**
 * Creates a corrected UI context object based on resolved context
 */
export function buildCorrectedUIContext(
  originalContext: any,
  resolvedContext: ExecutionContext
): any {
  return {
    ...originalContext,
    projectType: resolvedContext.projectType,
    facilityType: resolvedContext.facilityType,
    // Add metadata about correction
    ...(resolvedContext.corrected && {
      corrected: true,
      source: resolvedContext.source
    })
  };
}