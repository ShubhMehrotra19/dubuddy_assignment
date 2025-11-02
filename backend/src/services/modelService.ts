import fs = require('fs/promises');
import path = require('path');
import { ModelDefinition } from '../types/model';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MODELS_DIR = path.join(process.cwd(), 'models');

export async function ensureModelsDirectory() {
    try {
        await fs.access(MODELS_DIR);
    } catch {
        await fs.mkdir(MODELS_DIR, { recursive: true });
    }
}

export async function saveModelDefinition(model: ModelDefinition): Promise<void> {
    await ensureModelsDirectory();
    const filePath = path.join(MODELS_DIR, `${model.name}.json`);
    await fs.writeFile(filePath, JSON.stringify(model, null, 2), 'utf-8');

    await prisma.modelDefinition.upsert({
        where: { name: model.name },
        update: {
            tableName: model.tableName,
            definition: model as any,
        },
        create: {
            name: model.name,
            tableName: model.tableName,
            definition: model as any,
        },
    });
}

export async function loadModelDefinition(modelName: string): Promise<ModelDefinition | null> {
    try {
        const filePath = path.join(MODELS_DIR, `${modelName}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch {
        return null;
    }
}

export async function listModelDefinitions(): Promise<ModelDefinition[]> {
    await ensureModelsDirectory();
    try {
        const files = await fs.readdir(MODELS_DIR);
        const models: ModelDefinition[] = [];

        for (const file of files) {
            if (file.endsWith('.json')) {
                const modelName = file.replace('.json', '');
                const model = await loadModelDefinition(modelName);
                if (model) {
                    models.push(model);
                }
            }
        }

        return models;
    } catch {
        return [];
    }
}

export async function deleteModelDefinition(modelName: string): Promise<void> {
    const filePath = path.join(MODELS_DIR, `${modelName}.json`);
    try {
        await fs.unlink(filePath);
    } catch {
    }

    await prisma.modelDefinition.deleteMany({
        where: { name: modelName },
    });
}

export async function createTableForModel(model: ModelDefinition): Promise<void> {
    const tableName = model.tableName || `${model.name.toLowerCase()}s`;

    let sql = `CREATE TABLE IF NOT EXISTS "${tableName}" (`;

    sql += `"id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,`;

    if (model.ownerField) {
        sql += `"${model.ownerField}" TEXT,`;
    }

    for (const field of model.fields) {
        let columnDef = `"${field.name}" `;

        switch (field.type) {
            case 'string':
                columnDef += 'TEXT';
                break;
            case 'number':
                columnDef += 'NUMERIC';
                break;
            case 'boolean':
                columnDef += 'BOOLEAN';
                break;
            case 'date':
                columnDef += 'TIMESTAMP';
                break;
            case 'json':
                columnDef += 'JSONB';
                break;
        }

        if (field.required) {
            columnDef += ' NOT NULL';
        }

        if (field.default !== undefined) {
            if (typeof field.default === 'string') {
                const escapedValue = field.default.replace(/'/g, "''");
                columnDef += ` DEFAULT '${escapedValue}'`;
            } else if (typeof field.default === 'boolean') {
                columnDef += ` DEFAULT ${field.default}`;
            } else if (typeof field.default === 'number') {
                columnDef += ` DEFAULT ${field.default}`;
            } else {
                columnDef += ` DEFAULT '${JSON.stringify(field.default).replace(/'/g, "''")}'`;
            }
        }

        if (field.unique) {
            columnDef += ' UNIQUE';
        }

        sql += columnDef + ',';
    }

    sql += `"createdAt" TIMESTAMP DEFAULT NOW(),`;
    sql += `"updatedAt" TIMESTAMP DEFAULT NOW()`;
    sql += ')';

    await prisma.$executeRawUnsafe(sql);
}

