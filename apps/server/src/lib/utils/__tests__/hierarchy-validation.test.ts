import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateRoleFacilityConsistency, validateSameDistrict, validateHierarchyAccess } from '../hierarchy-validation';
import { HierarchyValidationError, HierarchyAuthorizationError } from '@/lib/errors/hierarchy.errors';
import { db } from '@/db';

// Mock the database
vi.mock('@/db', () => ({
  db: {
    query: {
      facilities: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      users: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
  },
}));

describe('Hierarchy Validation Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateRoleFacilityConsistency', () => {
    it('should throw error when DAF role has no facility', async () => {
      await expect(
        validateRoleFacilityConsistency('daf', null)
      ).rejects.toThrow(HierarchyValidationError);
      
      await expect(
        validateRoleFacilityConsistency('daf', null)
      ).rejects.toThrow('DAF role requires a facility assignment');
    });

    it('should throw error when DG role has no facility', async () => {
      await expect(
        validateRoleFacilityConsistency('dg', null)
      ).rejects.toThrow(HierarchyValidationError);
      
      await expect(
        validateRoleFacilityConsistency('dg', null)
      ).rejects.toThrow('DG role requires a facility assignment');
    });

    it('should throw error when facility not found', async () => {
      vi.mocked(db.query.facilities.findFirst).mockResolvedValue(undefined);

      await expect(
        validateRoleFacilityConsistency('daf', 999)
      ).rejects.toThrow(HierarchyValidationError);
      
      await expect(
        validateRoleFacilityConsistency('daf', 999)
      ).rejects.toThrow('Facility with ID 999 not found');
    });

    it('should throw error when DAF role assigned to health center', async () => {
      vi.mocked(db.query.facilities.findFirst).mockResolvedValue({
        id: 1,
        name: 'Test Health Center',
        facilityType: 'health_center',
        districtId: 11,
        parentFacilityId: 2,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        validateRoleFacilityConsistency('daf', 1)
      ).rejects.toThrow(HierarchyValidationError);
      
      await expect(
        validateRoleFacilityConsistency('daf', 1)
      ).rejects.toThrow('DAF role can only be assigned to hospital facilities');
    });

    it('should pass when DAF role assigned to hospital', async () => {
      vi.mocked(db.query.facilities.findFirst).mockResolvedValue({
        id: 1,
        name: 'Test Hospital',
        facilityType: 'hospital',
        districtId: 11,
        parentFacilityId: null,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        validateRoleFacilityConsistency('daf', 1)
      ).resolves.not.toThrow();
    });

    it('should pass when accountant role has no facility', async () => {
      await expect(
        validateRoleFacilityConsistency('accountant', null)
      ).resolves.not.toThrow();
    });
  });

  describe('validateSameDistrict', () => {
    it('should throw error when first facility not found', async () => {
      vi.mocked(db.query.facilities.findFirst)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({
          id: 2,
          name: 'Facility 2',
          facilityType: 'hospital',
          districtId: 11,
          parentFacilityId: null,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      await expect(
        validateSameDistrict(1, 2)
      ).rejects.toThrow(HierarchyValidationError);
      
      await expect(
        validateSameDistrict(1, 2)
      ).rejects.toThrow('Facility with ID 1 not found');
    });

    it('should throw error when second facility not found', async () => {
      vi.mocked(db.query.facilities.findFirst)
        .mockResolvedValueOnce({
          id: 1,
          name: 'Facility 1',
          facilityType: 'hospital',
          districtId: 11,
          parentFacilityId: null,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce(undefined);

      await expect(
        validateSameDistrict(1, 2)
      ).rejects.toThrow(HierarchyValidationError);
      
      await expect(
        validateSameDistrict(1, 2)
      ).rejects.toThrow('Facility with ID 2 not found');
    });

    it('should throw error when facilities in different districts', async () => {
      vi.mocked(db.query.facilities.findFirst)
        .mockResolvedValueOnce({
          id: 1,
          name: 'Butaro Hospital',
          facilityType: 'hospital',
          districtId: 11,
          parentFacilityId: null,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 2,
          name: 'Byumba Hospital',
          facilityType: 'hospital',
          districtId: 13,
          parentFacilityId: null,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      await expect(
        validateSameDistrict(1, 2)
      ).rejects.toThrow(HierarchyAuthorizationError);
      
      await expect(
        validateSameDistrict(1, 2)
      ).rejects.toThrow('Cross-district operation not allowed');
    });

    it('should pass when facilities in same district', async () => {
      vi.mocked(db.query.facilities.findFirst)
        .mockResolvedValueOnce({
          id: 1,
          name: 'Butaro Hospital',
          facilityType: 'hospital',
          districtId: 11,
          parentFacilityId: null,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 2,
          name: 'Kivuye Health Center',
          facilityType: 'health_center',
          districtId: 11,
          parentFacilityId: 1,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      await expect(
        validateSameDistrict(1, 2)
      ).resolves.not.toThrow();
    });
  });

  describe('validateHierarchyAccess', () => {
    it('should throw error when user not found', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

      await expect(
        validateHierarchyAccess(999, 1)
      ).rejects.toThrow(HierarchyValidationError);
      
      await expect(
        validateHierarchyAccess(999, 1)
      ).rejects.toThrow('User with ID 999 not found');
    });

    it('should throw error when user is inactive', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'accountant',
        facilityId: 1,
        isActive: false,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        banned: false,
        banReason: null,
        banExpires: null,
        image: null,
        permissions: [],
        projectAccess: [],
        configAccess: null,
        lastLoginAt: null,
        createdBy: null,
        mustChangePassword: false,
      });

      await expect(
        validateHierarchyAccess(1, 1)
      ).rejects.toThrow(HierarchyAuthorizationError);
      
      await expect(
        validateHierarchyAccess(1, 1)
      ).rejects.toThrow('User account is inactive');
    });

    it('should allow admin to access any facility', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 1,
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        facilityId: null,
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        banned: false,
        banReason: null,
        banExpires: null,
        image: null,
        permissions: [],
        projectAccess: [],
        configAccess: null,
        lastLoginAt: null,
        createdBy: null,
        mustChangePassword: false,
      });

      await expect(
        validateHierarchyAccess(1, 999)
      ).resolves.not.toThrow();
    });

    it('should use provided accessible facility IDs', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'daf',
        facilityId: 1,
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        banned: false,
        banReason: null,
        banExpires: null,
        image: null,
        permissions: [],
        projectAccess: [],
        configAccess: null,
        lastLoginAt: null,
        createdBy: null,
        mustChangePassword: false,
      });

      vi.mocked(db.query.facilities.findFirst).mockResolvedValue({
        id: 2,
        name: 'Test Facility',
        facilityType: 'health_center',
        districtId: 11,
        parentFacilityId: 1,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Should pass when facility is in accessible list
      await expect(
        validateHierarchyAccess(1, 2, [1, 2, 3])
      ).resolves.not.toThrow();

      // Should fail when facility is not in accessible list
      await expect(
        validateHierarchyAccess(1, 5, [1, 2, 3])
      ).rejects.toThrow(HierarchyAuthorizationError);
    });
  });
});
