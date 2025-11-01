import express = require('express');
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { loadModelDefinition } from '../services/modelService';
import { checkPermission } from '../utils/rbac';
import type { Permission } from '../utils/rbac';

const router = express.Router();
const prisma = new PrismaClient();
export function createCRUDRoutes(modelName: string) {
    const modelRouter = express.Router();

    // GET /api/:modelName
    modelRouter.get('/', authenticate, async (req: AuthRequest, res) => {
        try {
            const model = await loadModelDefinition(modelName);
            if (!model) {
                return res.status(404).json({ error: 'Model not found' });
            }

            if (!checkPermission(req, model, 'read')) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            const tableName = model.tableName || `${model.name.toLowerCase()}s`;
            const records = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}" ORDER BY "createdAt" DESC`);

            res.json(records);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // GET /api/:modelName/:id
    modelRouter.get('/:id', authenticate, async (req: AuthRequest, res) => {
        try {
            const model = await loadModelDefinition(modelName);
            if (!model) {
                return res.status(404).json({ error: 'Model not found' });
            }

            if (!checkPermission(req, model, 'read')) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            const tableName = model.tableName || `${model.name.toLowerCase()}s`;
            const records = await prisma.$queryRawUnsafe(
                `SELECT * FROM "${tableName}" WHERE id = $1`,
                req.params.id
            );

            const record = Array.isArray(records) ? records[0] : records;
            if (!record) {
                return res.status(404).json({ error: 'Record not found' });
            }

            res.json(record);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // POST /api/:modelName
    modelRouter.post('/', authenticate, async (req: AuthRequest, res) => {
        try {
            const model = await loadModelDefinition(modelName);
            if (!model) {
                return res.status(404).json({ error: 'Model not found' });
            }

            if (!checkPermission(req, model, 'create')) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            const tableName = model.tableName || `${model.name.toLowerCase()}s`;
            const data = req.body;

            // Set owner field if specified
            if (model.ownerField && req.user) {
                data[model.ownerField] = req.user.userId;
            }
            const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'createdAt' && k !== 'updatedAt');
            const values = fields.map((_, i) => `$${i + 1}`);
            const fieldNames = fields.map(f => `"${f}"`).join(', ');
            const params = fields.map(f => data[f]);

            const sql = `
        INSERT INTO "${tableName}" (${fieldNames}, "createdAt", "updatedAt")
        VALUES (${values.join(', ')}, NOW(), NOW())
        RETURNING *
      `;

            const result = await prisma.$queryRawUnsafe(sql, ...params);
            const record = Array.isArray(result) ? result[0] : result;

            res.status(201).json(record);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // PUT /api/:modelName/:id
    modelRouter.put('/:id', authenticate, async (req: AuthRequest, res) => {
        try {
            const model = await loadModelDefinition(modelName);
            if (!model) {
                return res.status(404).json({ error: 'Model not found' });
            }

            const tableName = model.tableName || `${model.name.toLowerCase()}s`;

            const existingRecords = await prisma.$queryRawUnsafe(
                `SELECT * FROM "${tableName}" WHERE id = $1`,
                req.params.id
            );
            const existing = Array.isArray(existingRecords) ? existingRecords[0] : existingRecords;

            if (!existing) {
                return res.status(404).json({ error: 'Record not found' });
            }
            if (!checkPermission(req, model, 'update', existing)) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            const data = req.body;
            delete data.id;
            delete data.createdAt;
            const fields = Object.keys(data).filter(k => k !== 'updatedAt');
            const setClause = fields.map((f, i) => `"${f}" = $${i + 1}`).join(', ');
            const params = fields.map(f => data[f]);
            params.push(req.params.id);

            const sql = `
        UPDATE "${tableName}"
        SET ${setClause}, "updatedAt" = NOW()
        WHERE id = $${params.length}
        RETURNING *
      `;

            const result = await prisma.$queryRawUnsafe(sql, ...params);
            const record = Array.isArray(result) ? result[0] : result;

            res.json(record);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // DELETE /api/:modelName/:id
    modelRouter.delete('/:id', authenticate, async (req: AuthRequest, res) => {
        try {
            const model = await loadModelDefinition(modelName);
            if (!model) {
                return res.status(404).json({ error: 'Model not found' });
            }

            const tableName = model.tableName || `${model.name.toLowerCase()}s`;
            const existingRecords = await prisma.$queryRawUnsafe(
                `SELECT * FROM "${tableName}" WHERE id = $1`,
                req.params.id
            );
            const existing = Array.isArray(existingRecords) ? existingRecords[0] : existingRecords;

            if (!existing) {
                return res.status(404).json({ error: 'Record not found' });
            }

            if (!checkPermission(req, model, 'delete', existing)) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            await prisma.$executeRawUnsafe(
                `DELETE FROM "${tableName}" WHERE id = $1`,
                req.params.id
            );

            res.json({ message: 'Record deleted successfully' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    return modelRouter;
}

export default router;

