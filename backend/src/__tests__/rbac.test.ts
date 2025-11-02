import { checkPermission } from '../utils/rbac';
import { AuthRequest } from '../middleware/auth';
import { ModelDefinition } from '../types/model';

describe('RBAC Permission Checking', () => {
  let mockRequest: Partial<AuthRequest>;
  let testModel: ModelDefinition;

  beforeEach(() => {
    mockRequest = {
      user: {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'Viewer',
      },
    };

    testModel = {
      name: 'TestModel',
      fields: [
        { name: 'name', type: 'string', required: true },
        { name: 'description', type: 'string' },
      ],
      rbac: {
        Admin: ['all'],
        Manager: ['create', 'read', 'update'],
        Viewer: ['read'],
      },
    };
  });

  describe('Permission checks for different roles', () => {
    it('should allow Admin role to perform all operations', () => {
      mockRequest.user!.role = 'Admin';

      expect(checkPermission(mockRequest as AuthRequest, testModel, 'create')).toBe(true);
      expect(checkPermission(mockRequest as AuthRequest, testModel, 'read')).toBe(true);
      expect(checkPermission(mockRequest as AuthRequest, testModel, 'update')).toBe(true);
      expect(checkPermission(mockRequest as AuthRequest, testModel, 'delete')).toBe(true);
    });

    it('should allow Manager role to create, read, and update', () => {
      mockRequest.user!.role = 'Manager';

      expect(checkPermission(mockRequest as AuthRequest, testModel, 'create')).toBe(true);
      expect(checkPermission(mockRequest as AuthRequest, testModel, 'read')).toBe(true);
      expect(checkPermission(mockRequest as AuthRequest, testModel, 'update')).toBe(true);
      expect(checkPermission(mockRequest as AuthRequest, testModel, 'delete')).toBe(false);
    });

    it('should only allow Viewer role to read', () => {
      mockRequest.user!.role = 'Viewer';

      expect(checkPermission(mockRequest as AuthRequest, testModel, 'create')).toBe(false);
      expect(checkPermission(mockRequest as AuthRequest, testModel, 'read')).toBe(true);
      expect(checkPermission(mockRequest as AuthRequest, testModel, 'update')).toBe(false);
      expect(checkPermission(mockRequest as AuthRequest, testModel, 'delete')).toBe(false);
    });

    it('should deny access for unknown roles', () => {
      mockRequest.user!.role = 'UnknownRole';

      expect(checkPermission(mockRequest as AuthRequest, testModel, 'read')).toBe(false);
      expect(checkPermission(mockRequest as AuthRequest, testModel, 'create')).toBe(false);
    });
  });

  describe('Owner field restrictions', () => {
    beforeEach(() => {
      testModel.ownerField = 'userId';
      mockRequest.user!.role = 'Manager';
    });

    it('should allow update when user is the owner', () => {
      const record = {
        id: 'record-1',
        name: 'Test Record',
        userId: 'user-123',
      };

      expect(checkPermission(mockRequest as AuthRequest, testModel, 'update', record)).toBe(true);
    });

    it('should deny update when user is not the owner', () => {
      const record = {
        id: 'record-1',
        name: 'Test Record',
        userId: 'other-user-456',
      };

      expect(checkPermission(mockRequest as AuthRequest, testModel, 'update', record)).toBe(false);
    });

    it('should allow delete when user is the owner and has delete permission', () => {
      mockRequest.user!.role = 'Admin';
      const record = {
        id: 'record-1',
        name: 'Test Record',
        userId: 'user-123',
      };

      expect(checkPermission(mockRequest as AuthRequest, testModel, 'delete', record)).toBe(true);
    });

    it('should deny delete when user is not the owner', () => {
      const record = {
        id: 'record-1',
        name: 'Test Record',
        userId: 'other-user-456',
      };

      expect(checkPermission(mockRequest as AuthRequest, testModel, 'delete', record)).toBe(false);
    });

    it('should allow update/delete for Admin even if not owner', () => {
      mockRequest.user!.role = 'Admin';
      const record = {
        id: 'record-1',
        name: 'Test Record',
        userId: 'other-user-456',
      };

      expect(checkPermission(mockRequest as AuthRequest, testModel, 'update', record)).toBe(true);
      expect(checkPermission(mockRequest as AuthRequest, testModel, 'delete', record)).toBe(true);
    });

    it('should allow update when record is null and user has permission', () => {
      expect(checkPermission(mockRequest as AuthRequest, testModel, 'update', undefined)).toBe(true);
    });

    it('should deny delete when record is null and user lacks delete permission', () => {
      expect(checkPermission(mockRequest as AuthRequest, testModel, 'delete', undefined)).toBe(false);
      
      mockRequest.user!.role = 'Admin';
      expect(checkPermission(mockRequest as AuthRequest, testModel, 'delete', undefined)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should deny access when user is not authenticated', () => {
      mockRequest.user = undefined;

      expect(checkPermission(mockRequest as AuthRequest, testModel, 'read')).toBe(false);
    });

    it('should handle model with no RBAC configuration for role', () => {
      mockRequest.user!.role = 'NonExistentRole';
      testModel.rbac = {};

      expect(checkPermission(mockRequest as AuthRequest, testModel, 'read')).toBe(false);
    });

    it('should handle empty permissions array', () => {
      testModel.rbac = {
        Viewer: [],
      };
      mockRequest.user!.role = 'Viewer';

      expect(checkPermission(mockRequest as AuthRequest, testModel, 'read')).toBe(false);
    });

    it('should handle read permission for non-owner operations', () => {
      testModel.ownerField = 'userId';
      mockRequest.user!.role = 'Viewer';
      const record = {
        id: 'record-1',
        userId: 'other-user-456',
      };

      expect(checkPermission(mockRequest as AuthRequest, testModel, 'read', record)).toBe(true);
    });

    it('should handle create permission (not affected by owner field)', () => {
      testModel.ownerField = 'userId';
      mockRequest.user!.role = 'Manager';

      expect(checkPermission(mockRequest as AuthRequest, testModel, 'create')).toBe(true);
      expect(checkPermission(mockRequest as AuthRequest, testModel, 'create', undefined)).toBe(true);
    });
  });

  describe('Complex RBAC scenarios', () => {
    it('should handle model with custom role permissions', () => {
      testModel.rbac = {
        Admin: ['all'],
        Editor: ['read', 'update'],
        Contributor: ['create', 'read'],
        Guest: ['read'],
      };

      mockRequest.user!.role = 'Editor';
      expect(checkPermission(mockRequest as AuthRequest, testModel, 'read')).toBe(true);
      expect(checkPermission(mockRequest as AuthRequest, testModel, 'update')).toBe(true);
      expect(checkPermission(mockRequest as AuthRequest, testModel, 'create')).toBe(false);
      expect(checkPermission(mockRequest as AuthRequest, testModel, 'delete')).toBe(false);
    });

    it('should handle multiple roles with same permissions', () => {
      testModel.rbac = {
        Admin: ['all'],
        SuperAdmin: ['all'],
        Manager: ['create', 'read', 'update'],
      };

      mockRequest.user!.role = 'SuperAdmin';
      expect(checkPermission(mockRequest as AuthRequest, testModel, 'delete')).toBe(true);
    });
  });
});

