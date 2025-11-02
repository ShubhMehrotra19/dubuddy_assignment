import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import type { ModelDefinition, ModelField, FieldType } from '../types/model';

const FIELD_TYPES: FieldType[] = ['string', 'number', 'boolean', 'date', 'json'];
const ROLES = ['Admin', 'Manager', 'Viewer'] as const;
const PERMISSIONS = ['all', 'create', 'read', 'update', 'delete'] as const;

type Role = typeof ROLES[number];
type Permission = typeof PERMISSIONS[number];

export default function ModelEditor() {
    const { modelName } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [tableName, setTableName] = useState('');
    const [fields, setFields] = useState<ModelField[]>([]);
    const [ownerField, setOwnerField] = useState('');
    const [rbac, setRbac] = useState<Record<Role, Permission[]>>({
        Admin: [],
        Manager: [],
        Viewer: [],
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (modelName) {
            fetchModel();
        }
    }, [modelName]);

    const fetchModel = async () => {
        try {
            const response = await axios.get(`/api/models/${modelName}`);
            const model: ModelDefinition = response.data;
            setName(model.name);
            setTableName(model.tableName || '');
            setFields(model.fields);
            setOwnerField(model.ownerField || '');
            // @ts-ignore
            setRbac(model.rbac);
        } catch (error) {
            console.error('Failed to fetch model:', error);
        }
    };

    const addField = () => {
        setFields([...fields, { name: '', type: 'string', required: false }]);
    };

    const updateField = (index: number, updates: Partial<ModelField>) => {
        const updated = [...fields];
        updated[index] = { ...updated[index], ...updates };
        setFields(updated);
    };

    const removeField = (index: number) => {
        setFields(fields.filter((_, i) => i !== index));
    };

    const toggleRBAC = (role: Role, permission: Permission) => {
        const rolePerms = rbac[role] || [];
        const updatedPerms = rolePerms.includes(permission)
            ? rolePerms.filter((p) => p !== permission)
            : [...rolePerms, permission];

        if (permission === 'all' && updatedPerms.includes('all')) {
            setRbac({ ...rbac, [role]: ['all'] });
        } else {
            const filteredPerms = updatedPerms.filter((p) => p !== 'all');
            setRbac({ ...rbac, [role]: filteredPerms });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (user?.role !== 'Admin') {
            alert('Only admins can create/edit models');
            return;
        }

        setLoading(true);
        try {
            const model: ModelDefinition = {
                name,
                tableName: tableName || undefined,
                fields: fields.filter((f) => f.name),
                ownerField: ownerField || undefined,
                rbac,
            };

            await axios.post('/api/models', model);
            alert('Model saved successfully!');
            navigate('/');
        } catch (error: any) {
            alert(`Failed to save: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="editor-container">
            <div className="editor-header">
                <h1>{modelName ? `Edit Model: ${modelName}` : 'Create New Model'}</h1>
                <button onClick={() => navigate('/')} className="btn-secondary">
                    Back to Dashboard
                </button>
            </div>

            <form onSubmit={handleSubmit} className="editor-form">
                <div className="form-section">
                    <h2>Basic Information</h2>
                    <div className="form-group">
                        <label>Model Name *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            disabled={!!modelName}
                        />
                    </div>

                    <div className="form-group">
                        <label>Table Name (optional)</label>
                        <input
                            type="text"
                            value={tableName}
                            onChange={(e) => setTableName(e.target.value)}
                            placeholder="Auto-generated if empty"
                        />
                    </div>

                    <div className="form-group">
                        <label>Owner Field (optional)</label>
                        <input
                            type="text"
                            value={ownerField}
                            onChange={(e) => setOwnerField(e.target.value)}
                            placeholder="e.g., ownerId"
                        />
                    </div>
                </div>

                <div className="form-section">
                    <h2>Fields</h2>
                    {fields.map((field, index) => (
                        <div key={index} className="field-editor">
                            <input
                                type="text"
                                placeholder="Field name"
                                value={field.name}
                                onChange={(e) => updateField(index, { name: e.target.value })}
                                required
                            />
                            <select
                                value={field.type}
                                onChange={(e) => updateField(index, { type: e.target.value as FieldType })}
                            >
                                {FIELD_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={field.required || false}
                                    onChange={(e) => updateField(index, { required: e.target.checked })}
                                />
                                Required
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={field.unique || false}
                                    onChange={(e) => updateField(index, { unique: e.target.checked })}
                                />
                                Unique
                            </label>
                            <input
                                type="text"
                                placeholder="Default value"
                                value={field.default || ''}
                                onChange={(e) => updateField(index, { default: e.target.value || undefined })}
                            />
                            <button
                                type="button"
                                onClick={() => removeField(index)}
                                className="btn-remove"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    <button type="button" onClick={addField} className="btn-add">
                        + Add Field
                    </button>
                </div>

                <div className="form-section">
                    <h2>RBAC Permissions</h2>
                    <div className="rbac-table">
                        <table>
                            <thead>
                            <tr>
                                <th>Role</th>
                                {PERMISSIONS.map((perm) => (
                                    <th key={perm}>{perm}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {ROLES.map((role) => (
                                <tr key={role}>
                                    <td>{role}</td>
                                    {PERMISSIONS.map((perm) => (
                                        <td key={perm}>
                                            <input
                                                type="checkbox"
                                                checked={rbac[role]?.includes(perm) || false}
                                                onChange={() => toggleRBAC(role, perm)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? 'Saving...' : 'Save Model'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="btn-secondary"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
