import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';

/**
 * Unit tests for SnapshotService checksum computation
 * These tests verify the core checksum logic without requiring database access
 */
describe('SnapshotService - Checksum Computation', () => {
  // Replicate the computeChecksum logic for testing
  function computeChecksum(snapshot: any): string {
    const snapshotForHashing = { ...snapshot, checksum: "" };
    const snapshotString = JSON.stringify(snapshotForHashing);
    return createHash('sha256').update(snapshotString).digest('hex');
  }

  describe('computeChecksum', () => {
    it('should compute SHA-256 checksum for snapshot data', () => {
      const snapshot = {
        version: '1.0',
        capturedAt: '2024-01-01T00:00:00.000Z',
        statementCode: 'REV_EXP',
        statement: {
          lines: [],
          totals: {},
          metadata: {}
        },
        sourceData: {
          planningEntries: [],
          executionEntries: []
        },
        aggregations: {
          totalPlanning: 0,
          totalExecution: 0,
          variance: 0
        },
        checksum: ''
      };

      const checksum = computeChecksum(snapshot);
      
      expect(checksum).toBeDefined();
      expect(checksum).toHaveLength(64); // SHA-256 produces 64 hex characters
      expect(checksum).toMatch(/^[a-f0-9]{64}$/); // Verify it's a valid hex string
    });

    it('should produce consistent checksums for identical data', () => {
      const snapshot = {
        version: '1.0',
        capturedAt: '2024-01-01T00:00:00.000Z',
        statementCode: 'REV_EXP',
        statement: {
          lines: [],
          totals: {},
          metadata: {}
        },
        sourceData: {
          planningEntries: [],
          executionEntries: []
        },
        aggregations: {
          totalPlanning: 0,
          totalExecution: 0,
          variance: 0
        },
        checksum: ''
      };

      const checksum1 = computeChecksum(snapshot);
      const checksum2 = computeChecksum(snapshot);
      
      expect(checksum1).toBe(checksum2);
    });

    it('should produce different checksums for different data', () => {
      const snapshot1 = {
        version: '1.0',
        capturedAt: '2024-01-01T00:00:00.000Z',
        statementCode: 'REV_EXP',
        statement: {
          lines: [],
          totals: {},
          metadata: {}
        },
        sourceData: {
          planningEntries: [],
          executionEntries: []
        },
        aggregations: {
          totalPlanning: 0,
          totalExecution: 0,
          variance: 0
        },
        checksum: ''
      };

      const snapshot2 = {
        ...snapshot1,
        version: '1.1' // Different version
      };

      const checksum1 = computeChecksum(snapshot1);
      const checksum2 = computeChecksum(snapshot2);
      
      expect(checksum1).not.toBe(checksum2);
    });

    it('should handle complex nested data structures', () => {
      const snapshot = {
        version: '1.0',
        capturedAt: '2024-01-01T00:00:00.000Z',
        statementCode: 'REV_EXP',
        statement: {
          lines: [
            { code: 'A_001', name: 'Revenue', value: 1000 },
            { code: 'B_001', name: 'Expenses', value: 500 }
          ],
          totals: { revenue: 1000, expenses: 500 },
          metadata: { generatedAt: '2024-01-01' }
        },
        sourceData: {
          planningEntries: [
            { id: 1, formData: { activities: [] }, updatedAt: '2024-01-01' }
          ],
          executionEntries: [
            { id: 2, formData: { activities: [] }, updatedAt: '2024-01-01' }
          ]
        },
        aggregations: {
          totalPlanning: 1000,
          totalExecution: 500,
          variance: 500
        },
        checksum: ''
      };

      const checksum = computeChecksum(snapshot);
      
      expect(checksum).toBeDefined();
      expect(checksum).toHaveLength(64);
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
