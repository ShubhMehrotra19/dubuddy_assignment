import express = require('express');
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import {
    saveModelDefinition,
    loadModelDefinition,
    listModelDefinitions,
    deleteModelDefinition,
    createTableForModel,
} from '../services/modelService';
import { ModelDefinition } from '../types/model';
import { registerModelRoutes } from '../utils/routeRegistry';

const router = express.Router();

// Get all models
router.get('/', authenticate, async (req: AuthRequest, res) => {
    try {
        const models = await listModelDefinitions();
        res.json(models);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get single model
router.get('/:modelName', authenticate, async (req: AuthRequest, res) => {
    try {
        const model = await loadModelDefinition(req.params.modelName);
        if (!model) {
            return res.status(404).json({ error: 'Model not found' });
        }
        res.json(model);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create or update model (Admin only)
router.post('/', authenticate, requireRole('Admin'), async (req: AuthRequest, res) => {
    try {
        const model: ModelDefinition = req.body;

        // Validate model
        if (!model.name || !model.fields || !Array.isArray(model.fields)) {
            return res.status(400).json({ error: 'Invalid model definition' });
        }

        await saveModelDefinition(model);
        res.json({ message: 'Model saved successfully', model });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Publish model (creates table and registers routes)
router.post('/:modelName/publish', authenticate, requireRole('Admin'), async (req: AuthRequest, res) => {
    try {
        const model = await loadModelDefinition(req.params.modelName);
        if (!model) {
            return res.status(404).json({ error: 'Model not found' });
        }

        // Create database table
        await createTableForModel(model);

        // Register CRUD routes
        registerModelRoutes(model.name);

        res.json({ message: 'Model published successfully', model });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Delete model
router.delete('/:modelName', authenticate, requireRole('Admin'), async (req: AuthRequest, res) => {
    try {
        await deleteModelDefinition(req.params.modelName);
        res.json({ message: 'Model deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

