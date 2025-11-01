import express = require('express');
import { createCRUDRoutes } from '../routes/crudRoutes';

const registeredRoutes = new Set<string>();
let appInstance: express.Application | null = null;

export function initializeRouteRegistry(app: express.Application) {
    appInstance = app;
}

export function registerModelRoutes(modelName: string) {
    if (!appInstance) {
        throw new Error('Route registry not initialized');
    }

    const modelNameLower = modelName.toLowerCase();

    if (registeredRoutes.has(modelNameLower)) {
        return; // Already registered
    }

    appInstance.use(`/api/${modelNameLower}`, createCRUDRoutes(modelName));
    registeredRoutes.add(modelNameLower);
    console.log(`Registered CRUD routes for model: ${modelName}`);
}

export function isRouteRegistered(modelName: string): boolean {
    return registeredRoutes.has(modelName.toLowerCase());
}

export function getRegisteredRoutes(): string[] {
    return Array.from(registeredRoutes);
}

