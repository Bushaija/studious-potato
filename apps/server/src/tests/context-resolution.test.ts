/**
 * Test file for context resolution utility
 * 
 * This file contains basic tests to verify the context resolution logic
 * works correctly according to the requirements.
 */

import { resolveExecutionContext, validateActivityCodes, buildCorrectedUIContext } from '../lib/utils/context-resolution';
import type { ExecutionRecord } from '../lib/utils/context-resolution';

// Mock logger for testing
const mockLogger = (level: string, message: string, meta?: any) => {
  console.log(`[${level.toUpperCase()}] ${message}`, meta || '');
};

// Test data
const createMockRecord = (overrides: Partial<ExecutionRecord> = {}): ExecutionRecord => ({
  id: 1,
  project: { projectType: 'HIV' },
  facility: { facilityType: 'hospital' },
  formData: {
    context: {
      projectType: 'HIV',
      facilityType: 'hospital'
    },
    activities: [
      { code: 'HIV_EXEC_HOSPITAL_A_1' },
      { code: 'HIV_EXEC_HOSPITAL_B_1' }
    ]
  },
  ...overrides
});

// Test 1: Happy path - database and form data match
console.log('=== Test 1: Happy path - matching context ===');
const record1 = createMockRecord();
const result1 = resolveExecutionContext(record1, mockLogger);

console.log('Result:', result1);
console.log('Expected: no warnings, database source, not corrected');
console.log('Actual warnings:', result1.warnings.length);
console.log('Actual source:', result1.context.source);
console.log('Actual corrected:', result1.context.corrected);
console.log('');

// Test 2: Context mismatch - form data shows different values
console.log('=== Test 2: Context mismatch ===');
const record2 = createMockRecord({
  project: { projectType: 'Malaria' },
  facility: { facilityType: 'health_center' },
  formData: {
    context: {
      projectType: 'HIV',
      facilityType: 'hospital'
    }
  }
});
const result2 = resolveExecutionContext(record2, mockLogger);

console.log('Result:', result2);
console.log('Expected: warnings present, database source, corrected=true');
console.log('Actual warnings:', result2.warnings.length);
console.log('Actual source:', result2.context.source);
console.log('Actual corrected:', result2.context.corrected);
console.log('');

// Test 3: Missing database values - fallback to form data
console.log('=== Test 3: Missing database values ===');
const record3 = createMockRecord({
  project: null,
  facility: null,
  formData: {
    context: {
      projectType: 'Malaria',
      facilityType: 'health_center'
    }
  }
});
const result3 = resolveExecutionContext(record3, mockLogger);

console.log('Result:', result3);
console.log('Expected: form_data source, not corrected');
console.log('Actual source:', result3.context.source);
console.log('Actual corrected:', result3.context.corrected);
console.log('');

// Test 4: Activity code validation
console.log('=== Test 4: Activity code validation ===');
const activities = [
  { code: 'HIV_EXEC_HOSPITAL_A_1' },
  { code: 'HIV_EXEC_HOSPITAL_B_1' },
  { code: 'MAL_EXEC_HEALTH_CENTER_A_1' }, // Mismatch - wrong project and facility
  { code: 'HIV_EXEC_HEALTH_CENTER_C_1' }, // Mismatch - wrong facility
  { code: 'INVALID_CODE' } // Malformed
];

const validation = validateActivityCodes(activities, result1.context, 123, mockLogger);
console.log('Validation result summary:', {
  isValid: validation.isValid,
  mismatchCount: validation.mismatches.length,
  validationRate: validation.validationReport.summary.validationRate
});
console.log('Expected: isValid=false, mismatches=3, validationRate=40%');
console.log('Actual isValid:', validation.isValid);
console.log('Actual mismatches:', validation.mismatches.length);
console.log('Actual validation rate:', validation.validationReport.summary.validationRate + '%');
console.log('');

// Test 5: Validation report generation
console.log('=== Test 5: Validation report generation ===');
const { formatValidationReportForLogging } = require('../lib/utils/context-resolution');
const reportFormatted = formatValidationReportForLogging(validation.validationReport);
console.log('Formatted validation report:');
console.log(reportFormatted);
console.log('');

// Test 6: Build corrected UI context
console.log('=== Test 6: Build corrected UI context ===');
const originalUIContext = {
  quarter: 'Q1',
  projectType: 'HIV',
  facilityType: 'hospital'
};

const correctedUIContext = buildCorrectedUIContext(originalUIContext, result2.context);
console.log('Corrected UI context:', correctedUIContext);
console.log('Expected: corrected=true, source=database');
console.log('');

// Test 7: Perfect validation scenario
console.log('=== Test 7: Perfect validation scenario ===');
const perfectActivities = [
  { code: 'HIV_EXEC_HOSPITAL_A_1' },
  { code: 'HIV_EXEC_HOSPITAL_B_1' },
  { code: 'HIV_EXEC_HOSPITAL_C_1' }
];

const perfectValidation = validateActivityCodes(perfectActivities, result1.context, 456, mockLogger);
console.log('Perfect validation result:', {
  isValid: perfectValidation.isValid,
  validationRate: perfectValidation.validationReport.summary.validationRate,
  recommendationsCount: perfectValidation.validationReport.recommendations.length
});
console.log('Expected: isValid=true, validationRate=100%, recommendations with success message');
console.log('');

console.log('=== All tests completed ===');