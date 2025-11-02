import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ModelDefinition } from '../types/model';

export type Permission = 'create' | 'read' | 'update' | 'delete';

export function checkPermission(
    req: AuthRequest,
    model: ModelDefinition,
    permission: Permission,
    record?: any
): boolean {
    if (!req.user) return false;

    const role = req.user.role;
    const permissions = model.rbac[role] || [];
    if (permissions.includes('all')) {
        return true;
    }

    if (permissions.includes(permission)) {
        if ((permission === 'update' || permission === 'delete') && model.ownerField) {
            if (!record) return true; 
            return record[model.ownerField] === req.user.userId;
        }
        return true;
    }

    return false;
}

export function createRBACMiddleware(permission: Permission) {
    return async (req: AuthRequest, res: Response, next: any) => {
        try {
            const modelName = req.params.modelName || req.body.modelName;
            const model = await loadModelDefinition(modelName);

            if (!model) {
                return res.status(404).json({ error: 'Model not found' });
            }

            let record = null;
            if (req.params.id || req.body.id) {
                record = await getRecordById(model, req.params.id || req.body.id);
            }

            if (!checkPermission(req, model, permission, record)) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            req.model = model;
            req.modelRecord = record;
            next();
        } catch (error) {
            return res.status(500).json({ error: 'RBAC check failed' });
        }
    };
}

async function loadModelDefinition(modelName: string): Promise<ModelDefinition | null> {
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
        const modelPath = path.join(process.cwd(), 'models', `${modelName}.json`);
        const content = await fs.readFile(modelPath, 'utf-8');
        return JSON.parse(content);
    } catch {
        return null;
    }
}

async function getRecordById(model: ModelDefinition, id: string): Promise<any> {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const tableName = model.tableName || model.name.toLowerCase() + 's';

    try {
        const result = await prisma.$queryRawUnsafe(
            `SELECT * FROM "${tableName}" WHERE id = $1`,
            id
        );
        return Array.isArray(result) ? result[0] : result;
    } catch {
        return null;
    } finally {
        await prisma.$disconnect();
    }
}

