import { describe, it, expect } from 'vitest';
import { AggregationService } from '../aggregation.service';

describe('AggregationService', () => {
  const service = new AggregationService();

  describe('extractActivityValues', () => {
    it('should extract quarterly values from form data', () => {
      const formData = {
        activities: [
          { code: 'A_001', q1: 100, q2: 200, q3: 300, q4: 400 },
          { code: 'B_001', q1: 50, q2: 75, q3: 100, q4: 125 }
        ]
      };

      const result = service.extractActivityValues(formData, 'A_001');
      
      expect(result).toEqual({
        q1: 100,
        q2: 200,
        q3: 300,
        q4: 400,
        total: 1000
      });
    });

    it('should return zero values for missing activities', () => {
      const formData = {
        activities: [
          { code: 'A_001', q1: 100, q2: 200, q3: 300, q4: 400 }
        ]
      };

      const result = service.extractActivityValues(formData, 'MISSING_CODE');
      
      expect(result).toEqual({
        q1: 0,
        q2: 0,
        q3: 0,
        q4: 0,
        total: 0
      });
    });

    it('should handle malformed data gracefully', () => {
      const formData = {
        activities: [
          { code: 'A_001', q1: 'invalid', q2: null, q3: undefined, q4: 400 }
        ]
      };

      const result = service.extractActivityValues(formData, 'A_001');
      
      expect(result).toEqual({
        q1: 0,
        q2: 0,
        q3: 0,
        q4: 400,
        total: 400
      });
    });
  });

  describe('matchActivityCode', () => {
    const availableCodes = ['HIV_EXEC_A_001', 'HIV_EXEC_B_001', 'TB_EXEC_A_001'];

    it('should find direct matches', () => {
      const result = service.matchActivityCode('HIV_EXEC_A_001', availableCodes);
      expect(result).toBe('HIV_EXEC_A_001');
    });

    it('should find case-insensitive matches', () => {
      const result = service.matchActivityCode('hiv_exec_a_001', availableCodes);
      expect(result).toBe('HIV_EXEC_A_001');
    });

    it('should return null for no matches', () => {
      const result = service.matchActivityCode('NONEXISTENT_CODE', availableCodes);
      expect(result).toBeNull();
    });
  });

  describe('sumQuarterlyValues', () => {
    it('should sum multiple quarterly values', () => {
      const values = [
        { q1: 100, q2: 200, q3: 300, q4: 400, total: 1000 },
        { q1: 50, q2: 75, q3: 100, q4: 125, total: 350 },
        { q1: 25, q2: 25, q3: 25, q4: 25, total: 100 }
      ];

      const result = service.sumQuarterlyValues(values);
      
      expect(result).toEqual({
        q1: 175,
        q2: 300,
        q3: 425,
        q4: 550,
        total: 1450
      });
    });

    it('should return zero values for empty array', () => {
      const result = service.sumQuarterlyValues([]);
      
      expect(result).toEqual({
        q1: 0,
        q2: 0,
        q3: 0,
        q4: 0,
        total: 0
      });
    });
  });

  describe('handleMissingActivityData', () => {
    it('should filter out invalid activities and return warnings', () => {
      const executionData = [
        {
          id: 1,
          facilityId: 1,
          facilityName: 'Test Facility',
          facilityType: 'hospital',
          projectType: 'HIV',
          formData: {
            activities: [
              { code: 'A_001', q1: 100 }, // valid
              { invalidActivity: true }, // invalid - no code
              null, // invalid - null
              { code: 'B_001', q1: 200 } // valid
            ]
          },
          computedValues: {}
        }
      ];

      const result = service.handleMissingActivityData(executionData);
      
      expect(result.cleanedData).toHaveLength(1);
      expect(result.cleanedData[0].formData.activities).toHaveLength(2);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Filtered out 2 invalid activities');
    });
  });
});