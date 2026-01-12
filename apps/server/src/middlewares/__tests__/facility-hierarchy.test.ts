import { describe, it, expect, vi, beforeEach } from 'vitest';
import { facilityHierarchyMiddleware } from '../facility-hierarchy';
import { FacilityHierarchyService } from '@/api/services/facility-hierarchy.service';

// Mock the FacilityHierarchyService
vi.mock('@/api/services/facility-hierarchy.service', () => ({
  FacilityHierarchyService: {
    getAccessibleFacilityIds: vi.fn(),
  },
}));

describe('facilityHierarchyMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should inject accessible facility IDs for authenticated user', async () => {
    // Mock user and service response
    const mockUser = { id: '1', role: 'daf', facilityId: 10 };
    const mockAccessibleIds = [10, 11, 12];
    
    vi.mocked(FacilityHierarchyService.getAccessibleFacilityIds).mockResolvedValue(mockAccessibleIds);

    // Create mock context
    const mockContext = {
      get: vi.fn((key: string) => {
        if (key === 'user') return mockUser;
        return undefined;
      }),
      set: vi.fn(),
    };

    const mockNext = vi.fn();

    // Execute middleware
    await facilityHierarchyMiddleware(mockContext as any, mockNext);

    // Verify service was called with correct user ID
    expect(FacilityHierarchyService.getAccessibleFacilityIds).toHaveBeenCalledWith(1);

    // Verify context was set correctly
    expect(mockContext.set).toHaveBeenCalledWith('accessibleFacilityIds', mockAccessibleIds);
    expect(mockContext.set).toHaveBeenCalledWith('userFacility', 10);
    expect(mockContext.set).toHaveBeenCalledWith('userRole', 'daf');

    // Verify next was called
    expect(mockNext).toHaveBeenCalled();
  });

  it('should set empty context for unauthenticated user', async () => {
    // Create mock context with no user
    const mockContext = {
      get: vi.fn(() => null),
      set: vi.fn(),
    };

    const mockNext = vi.fn();

    // Execute middleware
    await facilityHierarchyMiddleware(mockContext as any, mockNext);

    // Verify service was NOT called
    expect(FacilityHierarchyService.getAccessibleFacilityIds).not.toHaveBeenCalled();

    // Verify empty context was set
    expect(mockContext.set).toHaveBeenCalledWith('accessibleFacilityIds', []);
    expect(mockContext.set).toHaveBeenCalledWith('userFacility', null);
    expect(mockContext.set).toHaveBeenCalledWith('userRole', null);

    // Verify next was called
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle errors gracefully and set empty context', async () => {
    // Mock user
    const mockUser = { id: '1', role: 'daf', facilityId: 10 };
    
    // Mock service to throw error
    vi.mocked(FacilityHierarchyService.getAccessibleFacilityIds).mockRejectedValue(
      new Error('Database error')
    );

    // Create mock context
    const mockContext = {
      get: vi.fn((key: string) => {
        if (key === 'user') return mockUser;
        return undefined;
      }),
      set: vi.fn(),
    };

    const mockNext = vi.fn();

    // Spy on console.error
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Execute middleware
    await facilityHierarchyMiddleware(mockContext as any, mockNext);

    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalled();

    // Verify empty context was set
    expect(mockContext.set).toHaveBeenCalledWith('accessibleFacilityIds', []);
    expect(mockContext.set).toHaveBeenCalledWith('userFacility', 10);
    expect(mockContext.set).toHaveBeenCalledWith('userRole', 'daf');

    // Verify next was called (middleware doesn't block on error)
    expect(mockNext).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
