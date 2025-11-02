import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import type { ModelDefinition, ModelField, FieldType } from '../types/model';
import { ArrowLeft, Plus, Trash2, Save, Database, Shield, Settings, Loader2 } from 'lucide-react';

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
            setRbac(model.rbac as ModelRBAC);
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/')}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-6 h-6 text-slate-600" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                    <Settings className="w-7 h-7 text-indigo-600" />
                                    {modelName ? `Edit Model: ${modelName}` : 'Create New Model'}
                                </h1>
                                <p className="text-sm text-slate-500 mt-1">Define structure and permissions</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Database className="w-6 h-6" />
                                Basic Information
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">
                                    Model Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    disabled={!!modelName}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                                    placeholder="e.g., Product, User, Order"
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700">
                                        Table Name <span className="text-slate-400">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={tableName}
                                        onChange={(e) => setTableName(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                        placeholder="Auto-generated if empty"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700">
                                        Owner Field <span className="text-slate-400">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={ownerField}
                                        onChange={(e) => setOwnerField(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                        placeholder="e.g., ownerId"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Settings className="w-6 h-6" />
                                Fields
                            </h2>
                            <button
                                type="button"
                                onClick={addField}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                Add Field
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {fields.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <p className="mb-4">No fields yet. Click "Add Field" to get started.</p>
                                </div>
                            ) : (
                                fields.map((field, index) => (
                                    <div
                                        key={index}
                                        className="bg-slate-50 rounded-lg p-4 space-y-3 border-2 border-slate-200 hover:border-indigo-300 transition-colors"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                            <input
                                                type="text"
                                                placeholder="Field name *"
                                                value={field.name}
                                                onChange={(e) => updateField(index, { name: e.target.value })}
                                                required
                                                className="px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                            />
                                            <select
                                                value={field.type}
                                                onChange={(e) => updateField(index, { type: e.target.value as FieldType })}
                                                className="px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white"
                                            >
                                                {FIELD_TYPES.map((type) => (
                                                    <option key={type} value={type}>
                                                        {type}
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                placeholder="Default value"
                                                value={field.default || ''}
                                                onChange={(e) => updateField(index, { default: e.target.value || undefined })}
                                                className="px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeField(index)}
                                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Remove
                                            </button>
                                        </div>
                                        <div className="flex gap-4">
                                            <label className="inline-flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={field.required || false}
                                                    onChange={(e) => updateField(index, { required: e.target.checked })}
                                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm font-medium text-slate-700">Required</span>
                                            </label>
                                            <label className="inline-flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={field.unique || false}
                                                    onChange={(e) => updateField(index, { unique: e.target.checked })}
                                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm font-medium text-slate-700">Unique</span>
                                            </label>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Shield className="w-6 h-6" />
                                RBAC Permissions
                            </h2>
                        </div>
                        <div className="p-6 overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                <tr className="border-b-2 border-slate-200">
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Role</th>
                                    {PERMISSIONS.map((perm) => (
                                        <th key={perm} className="px-4 py-3 text-center text-sm font-semibold text-slate-700 capitalize">
                                            {perm}
                                        </th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                {ROLES.map((role) => (
                                    <tr key={role} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-4 font-medium text-slate-900">{role}</td>
                                        {PERMISSIONS.map((perm) => (
                                            <td key={perm} className="px-4 py-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={rbac[role]?.includes(perm) || false}
                                                    onChange={() => toggleRBAC(role, perm)}
                                                    className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex gap-4 sticky bottom-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-6 h-6" />
                                    Save Model
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="px-8 py-4 bg-white border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-400 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}