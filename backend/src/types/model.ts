export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'json';

export interface ModelField {
    name: string;
    type: FieldType;
    required?: boolean;
    default?: any;
    unique?: boolean;
    relation?: {
        model: string;
        field: string;
    };
}

export interface ModelRBAC {
    [role: string]: ('all' | 'create' | 'read' | 'update' | 'delete')[];
}

export interface ModelDefinition {
    name: string;
    tableName?: string;
    fields: ModelField[];
    ownerField?: string;
    rbac: ModelRBAC;
}

