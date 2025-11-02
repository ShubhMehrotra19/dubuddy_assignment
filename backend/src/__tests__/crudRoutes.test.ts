import request from 'supertest';
import express from 'express';
import { ModelDefinition } from '../types/model';
import * as modelService from '../services/modelService';
import * as rbac from '../utils/rbac';
import { mockPrismaInstance } from './setup';

jest.mock('../services/modelService');
jest.mock('../utils/rbac');

const { createCRUDRoutes } = require('../routes/crudRoutes');

describe('Dynamic API CRUD Routes', () => {
  let app: express.Application;
  const modelName = 'TestModel';

  beforeEach(() => {
    app = express();
    app.use(express.json());

    jest.clearAllMocks();

    const router = createCRUDRoutes(modelName);
    app.use('/api/testmodel', router);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockModelDefinition: ModelDefinition = {
    name: 'TestModel',
    tableName: 'testmodels',
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

  describe('GET /api/:modelName - List all records', () => {
    it('should return 200 and list of records for user with read permission', async () => {
      (modelService.loadModelDefinition as jest.Mock).mockResolvedValue(mockModelDefinition);
      (rbac.checkPermission as jest.Mock).mockReturnValue(true);
      mockPrismaInstance.$queryRawUnsafe.mockResolvedValue([
        { id: '1', name: 'Test 1', createdAt: new Date() },
        { id: '2', name: 'Test 2', createdAt: new Date() },
      ]);

      const response = await request(app)
        .get('/api/testmodel')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(mockPrismaInstance.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('should return 403 when user lacks read permission', async () => {
      (modelService.loadModelDefinition as jest.Mock).mockResolvedValue(mockModelDefinition);
      (rbac.checkPermission as jest.Mock).mockReturnValue(false);

      const response = await request(app)
        .get('/api/testmodel')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 404 when model does not exist', async () => {
      (modelService.loadModelDefinition as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/testmodel')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Model not found');
    });

    it('should handle database errors gracefully', async () => {
      (modelService.loadModelDefinition as jest.Mock).mockResolvedValue(mockModelDefinition);
      (rbac.checkPermission as jest.Mock).mockReturnValue(true);
      mockPrismaInstance.$queryRawUnsafe.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/testmodel')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/:modelName/:id - Get single record', () => {
    it('should return 200 and single record for user with read permission', async () => {
      (modelService.loadModelDefinition as jest.Mock).mockResolvedValue(mockModelDefinition);
      (rbac.checkPermission as jest.Mock).mockReturnValue(true);
      mockPrismaInstance.$queryRawUnsafe.mockResolvedValue([
        { id: '1', name: 'Test 1', description: 'Description' },
      ]);

      const response = await request(app)
        .get('/api/testmodel/1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('1');
      expect(response.body.name).toBe('Test 1');
    });

    it('should return 404 when record does not exist', async () => {
      (modelService.loadModelDefinition as jest.Mock).mockResolvedValue(mockModelDefinition);
      (rbac.checkPermission as jest.Mock).mockReturnValue(true);
      mockPrismaInstance.$queryRawUnsafe.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/testmodel/999')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Record not found');
    });

    it('should return 403 when user lacks read permission', async () => {
      (modelService.loadModelDefinition as jest.Mock).mockResolvedValue(mockModelDefinition);
      (rbac.checkPermission as jest.Mock).mockReturnValue(false);

      const response = await request(app)
        .get('/api/testmodel/1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/:modelName - Create record', () => {
    it('should return 201 and created record for user with create permission', async () => {
      (modelService.loadModelDefinition as jest.Mock).mockResolvedValue(mockModelDefinition);
      (rbac.checkPermission as jest.Mock).mockReturnValue(true);
      const createdRecord = { id: 'new-1', name: 'New Record', description: 'New Description', createdAt: new Date(), updatedAt: new Date() };
      mockPrismaInstance.$queryRawUnsafe.mockResolvedValue([createdRecord]);

      const response = await request(app)
        .post('/api/testmodel')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'New Record', description: 'New Description' });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('New Record');
      expect(mockPrismaInstance.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('should return 403 when user lacks create permission', async () => {
      (modelService.loadModelDefinition as jest.Mock).mockResolvedValue(mockModelDefinition);
      (rbac.checkPermission as jest.Mock).mockReturnValue(false);

      const response = await request(app)
        .post('/api/testmodel')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'New Record' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should set owner field when model has ownerField', async () => {
      const modelWithOwner: ModelDefinition = {
        ...mockModelDefinition,
        ownerField: 'userId',
      };
      (modelService.loadModelDefinition as jest.Mock).mockResolvedValue(modelWithOwner);
      (rbac.checkPermission as jest.Mock).mockReturnValue(true);
      const createdRecord = {
        id: 'new-1',
        name: 'New Record',
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaInstance.$queryRawUnsafe.mockResolvedValue([createdRecord]);

      const response = await request(app)
        .post('/api/testmodel')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'New Record' });

      expect(response.status).toBe(201);
      expect(mockPrismaInstance.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('should handle database errors during creation', async () => {
      (modelService.loadModelDefinition as jest.Mock).mockResolvedValue(mockModelDefinition);
      (rbac.checkPermission as jest.Mock).mockReturnValue(true);
      mockPrismaInstance.$queryRawUnsafe.mockRejectedValue(new Error('Database constraint violation'));

      const response = await request(app)
        .post('/api/testmodel')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'New Record' });

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /api/:modelName/:id - Update record', () => {
    it('should return 200 and updated record for user with update permission', async () => {
      (modelService.loadModelDefinition as jest.Mock).mockResolvedValue(mockModelDefinition);
      const existingRecord = { id: '1', name: 'Old Name', description: 'Old Description' };
      mockPrismaInstance.$queryRawUnsafe
        .mockResolvedValueOnce([existingRecord])
        .mockResolvedValueOnce([{ ...existingRecord, name: 'New Name' }]);
      (rbac.checkPermission as jest.Mock).mockReturnValue(true);

      const response = await request(app)
        .put('/api/testmodel/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'New Name' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('New Name');
      expect(mockPrismaInstance.$queryRawUnsafe).toHaveBeenCalledTimes(2);
    });

    it('should return 403 when user lacks update permission', async () => {
      (modelService.loadModelDefinition as jest.Mock).mockResolvedValue(mockModelDefinition);
      mockPrismaInstance.$queryRawUnsafe.mockResolvedValue([{ id: '1', name: 'Old Name' }]);
      (rbac.checkPermission as jest.Mock).mockReturnValue(false);

      const response = await request(app)
        .put('/api/testmodel/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'New Name' });

      expect(response.status).toBe(403);
    });

    it('should return 403 when user tries to update record they do not own', async () => {
      const modelWithOwner: ModelDefinition = {
        ...mockModelDefinition,
        ownerField: 'userId',
      };
      (modelService.loadModelDefinition as jest.Mock).mockResolvedValue(modelWithOwner);
      const existingRecord = { id: '1', name: 'Old Name', userId: 'other-user-456' };
      mockPrismaInstance.$queryRawUnsafe.mockResolvedValueOnce([existingRecord]);
      (rbac.checkPermission as jest.Mock).mockReturnValue(false);

      const response = await request(app)
        .put('/api/testmodel/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'New Name' });

      expect(response.status).toBe(403);
    });

    it('should return 404 when record does not exist', async () => {
      (modelService.loadModelDefinition as jest.Mock).mockResolvedValue(mockModelDefinition);
      mockPrismaInstance.$queryRawUnsafe.mockResolvedValue([]);

      const response = await request(app)
        .put('/api/testmodel/999')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'New Name' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/:modelName/:id - Delete record', () => {
    it('should return 200 and success message for user with delete permission', async () => {
      (modelService.loadModelDefinition as jest.Mock).mockResolvedValue(mockModelDefinition);
      const existingRecord = { id: '1', name: 'Test Record' };
      mockPrismaInstance.$queryRawUnsafe.mockResolvedValueOnce([existingRecord]);
      mockPrismaInstance.$executeRawUnsafe.mockResolvedValue(1);
      (rbac.checkPermission as jest.Mock).mockReturnValue(true);

      const response = await request(app)
        .delete('/api/testmodel/1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Record deleted successfully');
      expect(mockPrismaInstance.$executeRawUnsafe).toHaveBeenCalled();
    });

    it('should return 403 when user lacks delete permission', async () => {
      (modelService.loadModelDefinition as jest.Mock).mockResolvedValue(mockModelDefinition);
      mockPrismaInstance.$queryRawUnsafe.mockResolvedValue([{ id: '1', name: 'Test Record' }]);
      (rbac.checkPermission as jest.Mock).mockReturnValue(false);

      const response = await request(app)
        .delete('/api/testmodel/1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
    });

    it('should return 403 when user tries to delete record they do not own', async () => {
      const modelWithOwner: ModelDefinition = {
        ...mockModelDefinition,
        ownerField: 'userId',
      };
      (modelService.loadModelDefinition as jest.Mock).mockResolvedValue(modelWithOwner);
      const existingRecord = { id: '1', name: 'Test Record', userId: 'other-user-456' };
      mockPrismaInstance.$queryRawUnsafe.mockResolvedValueOnce([existingRecord]);
      (rbac.checkPermission as jest.Mock).mockReturnValue(false);

      const response = await request(app)
        .delete('/api/testmodel/1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
    });

    it('should return 404 when record does not exist', async () => {
      (modelService.loadModelDefinition as jest.Mock).mockResolvedValue(mockModelDefinition);
      mockPrismaInstance.$queryRawUnsafe.mockResolvedValue([]);

      const response = await request(app)
        .delete('/api/testmodel/999')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
    });
  });

  describe('Table name resolution', () => {
    it('should use custom tableName when provided', async () => {
      const modelWithCustomTable: ModelDefinition = {
        ...mockModelDefinition,
        tableName: 'custom_table_name',
      };
      (modelService.loadModelDefinition as jest.Mock).mockResolvedValue(modelWithCustomTable);
      (rbac.checkPermission as jest.Mock).mockReturnValue(true);
      mockPrismaInstance.$queryRawUnsafe.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/testmodel')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(mockPrismaInstance.$queryRawUnsafe).toHaveBeenCalled();
      const sqlCall = mockPrismaInstance.$queryRawUnsafe.mock.calls[0][0];
      expect(sqlCall).toContain('custom_table_name');
    });

    it('should use default tableName when not provided', async () => {
      const modelWithoutTable: ModelDefinition = {
        ...mockModelDefinition,
        tableName: undefined,
      };
      (modelService.loadModelDefinition as jest.Mock).mockResolvedValue(modelWithoutTable);
      (rbac.checkPermission as jest.Mock).mockReturnValue(true);
      mockPrismaInstance.$queryRawUnsafe.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/testmodel')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(mockPrismaInstance.$queryRawUnsafe).toHaveBeenCalled();
      const sqlCall = mockPrismaInstance.$queryRawUnsafe.mock.calls[0][0];
      expect(sqlCall).toContain('testmodels');
    });
  });
});

