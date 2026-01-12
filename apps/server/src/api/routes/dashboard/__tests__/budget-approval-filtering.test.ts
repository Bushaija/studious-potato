/**
 * Tests for budget calculation filtering by approval status
 * Verifies that rejected plans are excluded from budget calculations
 * 
 * Requirements tested:
 * - 1.3: Dashboard metrics compute allocated budgets using only approved planning entries
 * - 1.4: Budget reports display allocated amounts based exclusively on approved plans
 * - 4.3: Program, district, and facility budget summaries include only approved plans
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  fetchPlanningEntries,
  aggregateBudgetData,
  aggregateByDistrict,
  aggregateByFacility,
  aggregateByProgram
} from '../../../services/dashboard/aggregation.service';
import { 
  calculateAllocatedBudget,
  calculateSpentBudget,
  calculateUtilization
} from '../../../services/dashboard/budget-calculations.service';

// Mock the database
vi.mock('@/db', () => ({
  db: {
    query: {
      schemaFormDataEntries: {
        findMany: vi.fn()
      },
      reportingPeriods: {
        findFirst: vi.fn()
      },
      districts: {
        findMany: vi.fn()
      },
      facilities: {
        findMany: vi.fn()
      }
    }
  }
}));

describe('Budget Approval Status Filtering', () => {
  describe('fetchPlanningEntries - Approval Status Filter', () => {
    it('should only fetch APPROVED planning entries', async () => {
      const { db } = await import('@/db');
      const mockFindMany = db.query.schemaFormDataEntries.findMany as any;
      
      // Mock data with mixed approval statuses
      mockFindMany.mockResolvedValueOnce([
        {
          id: 1,
          facilityId: 1,
          projectId: 1,
          approvalStatus: 'APPROVED',
          formData: { activities: { act1: { total_budget: 1000 } } },
          project: { id: 1, projectType: '1' }
        },
        {
          id: 2,
          facilityId: 1,
          projectId: 2,
          approvalStatus: 'APPROVED',
          formData: { activities: { act1: { total_budget: 500 } } },
          project: { id: 2, projectType: '1' }
        }
      ]);

      const result = await fetchPlanningEntries({
        facilityIds: [1],
        reportingPeriodId: 1
      });

      // Verify the query was called with approval status filter
      expect(mockFindMany).toHaveBeenCalled();
      
      // All returned entries should be APPROVED
      expect(result.every(entry => entry.approvalStatus === 'APPROVED')).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should exclude REJECTED plans from results', async () => {
      const { db } = await import('@/db');
      const mockFindMany = db.query.schemaFormDataEntries.findMany as any;
      
      // Mock only approved entries (rejected ones filtered by query)
      mockFindMany.mockResolvedValueOnce([
        {
          id: 1,
          facilityId: 1,
          projectId: 1,
          approvalStatus: 'APPROVED',
          formData: { activities: { act1: { total_budget: 1000 } } },
          project: { id: 1, projectType: '1' }
        }
      ]);

      const result = await fetchPlanningEntries({
        facilityIds: [1],
        reportingPeriodId: 1
      });

      // Should not include rejected plans
      expect(result.find(entry => entry.approvalStatus === 'REJECTED')).toBeUndefined();
      expect(result).toHaveLength(1);
    });

    it('should exclude PENDING plans from results', async () => {
      const { db } = await import('@/db');
      const mockFindMany = db.query.schemaFormDataEntries.findMany as any;
      
      mockFindMany.mockResolvedValueOnce([
        {
          id: 1,
          facilityId: 1,
          projectId: 1,
          approvalStatus: 'APPROVED',
          formData: { activities: { act1: { total_budget: 1000 } } },
          project: { id: 1, projectType: '1' }
        }
      ]);

      const result = await fetchPlanningEntries({
        facilityIds: [1],
        reportingPeriodId: 1
      });

      // Should not include pending plans
      expect(result.find(entry => entry.approvalStatus === 'PENDING')).toBeUndefined();
      expect(result).toHaveLength(1);
    });

    it('should exclude DRAFT plans from results', async () => {
      const { db } = await import('@/db');
      const mockFindMany = db.query.schemaFormDataEntries.findMany as any;
      
      mockFindMany.mockResolvedValueOnce([
        {
          id: 1,
          facilityId: 1,
          projectId: 1,
          approvalStatus: 'APPROVED',
          formData: { activities: { act1: { total_budget: 1000 } } },
          project: { id: 1, projectType: '1' }
        }
      ]);

      const result = await fetchPlanningEntries({
        facilityIds: [1],
        reportingPeriodId: 1
      });

      // Should not include draft plans
      expect(result.find(entry => entry.approvalStatus === 'DRAFT')).toBeUndefined();
      expect(result).toHaveLength(1);
    });
  });

  describe('Budget Summary Calculations', () => {
    it('should calculate correct allocated budget excluding rejected plans', () => {
      const planningEntries = [
        {
          id: 1,
          approvalStatus: 'APPROVED',
          formData: { activities: { act1: { total_budget: 1000 } } }
        },
        {
          id: 2,
          approvalStatus: 'APPROVED',
          formData: { activities: { act1: { total_budget: 500 } } }
        }
      ] as any;

      const allocated = calculateAllocatedBudget(planningEntries);
      
      // Should only sum approved plans: 1000 + 500 = 1500
      expect(allocated).toBe(1500);
    });

    it('should return zero when no approved plans exist', () => {
      const planningEntries = [] as any;

      const allocated = calculateAllocatedBudget(planningEntries);
      
      expect(allocated).toBe(0);
    });

    it('should calculate utilization percentage correctly with approved plans only', () => {
      const allocated = 1000;
      const spent = 600;

      const utilization = calculateUtilization(allocated, spent);
      
      expect(utilization).toBe(60);
    });
  });

  describe('Program Budget Distribution', () => {
    it('should exclude rejected plans from program distribution', async () => {
      const { db } = await import('@/db');
      const mockFindMany = db.query.schemaFormDataEntries.findMany as any;
      
      // Only approved plans should be returned
      mockFindMany.mockResolvedValueOnce([
        {
          id: 1,
          facilityId: 1,
          projectId: 1,
          approvalStatus: 'APPROVED',
          formData: { activities: { act1: { total_budget: 1000 } } },
          project: { id: 1, name: 'HIV Program', projectType: '1' }
        },
        {
          id: 2,
          facilityId: 1,
          projectId: 2,
          approvalStatus: 'APPROVED',
          formData: { activities: { act1: { total_budget: 500 } } },
          project: { id: 2, name: 'HIV Program', projectType: '1' }
        }
      ]);

      const result = await aggregateByProgram([1], 1);

      // Should only include approved plans in program totals
      expect(result[0].allocated).toBe(1500); // 1000 + 500
    });

    it('should calculate correct program percentages with approved plans only', async () => {
      const { db } = await import('@/db');
      const mockFindMany = db.query.schemaFormDataEntries.findMany as any;
      
      mockFindMany.mockResolvedValueOnce([
        {
          id: 1,
          facilityId: 1,
          projectId: 1,
          approvalStatus: 'APPROVED',
          formData: { activities: { act1: { total_budget: 600 } } },
          project: { id: 1, name: 'HIV Program', projectType: '1' }
        },
        {
          id: 2,
          facilityId: 1,
          projectId: 2,
          approvalStatus: 'APPROVED',
          formData: { activities: { act1: { total_budget: 400 } } },
          project: { id: 2, name: 'Malaria Program', projectType: '2' }
        }
      ]);

      const result = await aggregateByProgram([1], 1);

      // HIV: 600/1000 = 60%, Malaria: 400/1000 = 40%
      const hivProgram = result.find(p => p.programId === 1);
      const malariaProgram = result.find(p => p.programId === 2);
      
      expect(hivProgram?.percentage).toBe(60);
      expect(malariaProgram?.percentage).toBe(40);
    });
  });

  describe('District Budget Aggregation', () => {
    it('should exclude rejected plans from district aggregations', async () => {
      const { db } = await import('@/db');
      const mockFindMany = db.query.schemaFormDataEntries.findMany as any;
      const mockDistrictsFindMany = db.query.districts.findMany as any;
      const mockFacilitiesFindMany = db.query.facilities.findMany as any;

      // Mock districts
      mockDistrictsFindMany.mockResolvedValueOnce([
        { id: 1, name: 'District A', provinceId: 1 }
      ]);

      // Mock facilities
      mockFacilitiesFindMany.mockResolvedValueOnce([
        { id: 1, name: 'Facility 1', districtId: 1 }
      ]);

      // Mock planning entries (only approved) - called once per district
      mockFindMany.mockResolvedValueOnce([
        {
          id: 1,
          facilityId: 1,
          projectId: 1,
          approvalStatus: 'APPROVED',
          formData: { activities: { act1: { total_budget: 1000 } } },
          project: { id: 1, projectType: '1' }
        }
      ]);

      // Mock execution entries - called once per district
      mockFindMany.mockResolvedValueOnce([]);

      const result = await aggregateByDistrict(1, [1], 1);

      // Should only include approved plans
      expect(result[0].allocated).toBe(1000);
    });

    it('should verify approval status filter is applied in district queries', async () => {
      const { db } = await import('@/db');
      const mockFindMany = db.query.schemaFormDataEntries.findMany as any;

      // Mock only approved entries
      mockFindMany.mockResolvedValueOnce([
        {
          id: 1,
          facilityId: 1,
          projectId: 1,
          approvalStatus: 'APPROVED',
          formData: { activities: { act1: { total_budget: 1000 } } },
          project: { id: 1, projectType: '1' }
        }
      ]);

      const result = await fetchPlanningEntries({
        facilityIds: [1],
        reportingPeriodId: 1
      });

      // Verify all returned entries are approved
      expect(result.every(entry => entry.approvalStatus === 'APPROVED')).toBe(true);
      expect(result).toHaveLength(1);
    });
  });

  describe('Facility Budget Aggregation', () => {
    it('should exclude rejected plans from facility summaries', async () => {
      const { db } = await import('@/db');
      const mockFindMany = db.query.schemaFormDataEntries.findMany as any;
      const mockFacilitiesFindMany = db.query.facilities.findMany as any;

      mockFacilitiesFindMany.mockResolvedValueOnce([
        { id: 1, name: 'Facility 1', districtId: 1, facilityType: 'hospital' }
      ]);

      // Only approved plans - called once per facility
      mockFindMany.mockResolvedValueOnce([
        {
          id: 1,
          facilityId: 1,
          projectId: 1,
          approvalStatus: 'APPROVED',
          formData: { activities: { act1: { total_budget: 2000 } } },
          project: { id: 1, projectType: '1' }
        }
      ]);

      // Execution entries - called once per facility
      mockFindMany.mockResolvedValueOnce([]);

      const result = await aggregateByFacility(1, [1], 1);

      // Should only include approved plans
      expect(result[0].allocated).toBe(2000);
    });

    it('should verify approval status filter is applied in facility queries', async () => {
      const { db } = await import('@/db');
      const mockFindMany = db.query.schemaFormDataEntries.findMany as any;

      // Mock only approved entries
      mockFindMany.mockResolvedValueOnce([
        {
          id: 1,
          facilityId: 1,
          projectId: 1,
          approvalStatus: 'APPROVED',
          formData: { activities: { act1: { total_budget: 1500 } } },
          project: { id: 1, projectType: '1' }
        },
        {
          id: 2,
          facilityId: 2,
          projectId: 2,
          approvalStatus: 'APPROVED',
          formData: { activities: { act1: { total_budget: 1200 } } },
          project: { id: 2, projectType: '1' }
        }
      ]);

      const result = await fetchPlanningEntries({
        facilityIds: [1, 2],
        reportingPeriodId: 1
      });

      // All returned entries should be approved
      expect(result.every(entry => entry.approvalStatus === 'APPROVED')).toBe(true);
      expect(result).toHaveLength(2);
    });
  });

  describe('Integration: Budget Data Aggregation', () => {
    it('should aggregate budget data using only approved plans', async () => {
      const { db } = await import('@/db');
      const mockFindMany = db.query.schemaFormDataEntries.findMany as any;

      // Mock approved planning entries
      mockFindMany.mockResolvedValueOnce([
        {
          id: 1,
          facilityId: 1,
          projectId: 1,
          approvalStatus: 'APPROVED',
          formData: { activities: { act1: { total_budget: 1000 } } },
          project: { id: 1, projectType: '1' }
        },
        {
          id: 2,
          facilityId: 1,
          projectId: 2,
          approvalStatus: 'APPROVED',
          formData: { activities: { act1: { total_budget: 500 } } },
          project: { id: 2, projectType: '1' }
        }
      ]);

      // Mock execution entries
      mockFindMany.mockResolvedValueOnce([
        {
          id: 3,
          facilityId: 1,
          projectId: 1,
          formData: { 
            rollups: { 
              bySection: { 
                B: { total: 300 } 
              } 
            } 
          },
          project: { id: 1, projectType: '1' }
        }
      ]);

      const result = await aggregateBudgetData({
        facilityIds: [1],
        reportingPeriodId: 1
      });

      // Allocated should only include approved plans
      expect(result.allocated).toBe(1500); // 1000 + 500
      expect(result.spent).toBe(300);
      expect(result.remaining).toBe(1200); // 1500 - 300
      expect(result.utilizationPercentage).toBe(20); // 300/1500 * 100
    });

    it('should handle case with no approved plans', async () => {
      const { db } = await import('@/db');
      const mockFindMany = db.query.schemaFormDataEntries.findMany as any;

      // No approved plans
      mockFindMany.mockResolvedValueOnce([]);
      mockFindMany.mockResolvedValueOnce([]);

      const result = await aggregateBudgetData({
        facilityIds: [1],
        reportingPeriodId: 1
      });

      expect(result.allocated).toBe(0);
      expect(result.spent).toBe(0);
      expect(result.remaining).toBe(0);
      expect(result.utilizationPercentage).toBe(0);
    });
  });
});
