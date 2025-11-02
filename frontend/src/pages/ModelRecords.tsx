import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import type { ModelDefinition } from '../types/model';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Plus, Edit, Trash2, X, Save, Loader2, Database, Table } from 'lucide-react';

export default function ModelRecords() {
    const { modelName } = useParams<{ modelName: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [model, setModel] = useState<ModelDefinition | null>(null);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingRecord, setEditingRecord] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        if (modelName) {
            fetchModel();
            fetchRecords();
        }
    }, [modelName]);

    const fetchModel = async () => {
        try {
            const response = await axios.get(`/api/models/${modelName}`);
            setModel(response.data);

            const initialData: any = {};
            response.data.fields.forEach((field: any) => {
                if (field.default !== undefined) {
                    initialData[field.name] = field.default;
                }
            });
            setFormData(initialData);
        } catch (error) {
            console.error('Failed to fetch model:', error);
        }
    };

    const fetchRecords = async () => {
        try {
            const response = await axios.get(`/api/${modelName?.toLowerCase()}`);
            setRecords(response.data);
        } catch (error: any) {
            if (error.response?.status !== 404) {
                console.error('Failed to fetch records:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    const canCreate = () => {
        if (!model || !user) return false;
        const perms = model.rbac[user.role] || [];
        return perms.includes('all') || perms.includes('create');
    };

    const canUpdate = (record: any) => {
        if (!model || !user) return false;
        const perms = model.rbac[user.role] || [];
        if (perms.includes('all')) return true;
        if (!perms.includes('update')) return false;
        if (model.ownerField && record[model.ownerField] !== user.id) return false;
        return true;
    };

    const canDelete = (record: any) => {
        if (!model || !user) return false;
        const perms = model.rbac[user.role] || [];
        if (perms.includes('all')) return true;
        if (!perms.includes('delete')) return false;
        if (model.ownerField && record[model.ownerField] !== user.id) return false;
        return true;
    };

    const handleCreate = () => {
        setEditingRecord(null);
        const initialData: any = {};
        model?.fields.forEach((field) => {
            if (field.default !== undefined) {
                initialData[field.name] = field.default;
            }
        });
        setFormData(initialData);
        setShowForm(true);
    };

    const handleEdit = (record: any) => {
        setEditingRecord(record);
        setFormData({ ...record });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRecord) {
                await axios.put(`/api/${modelName?.toLowerCase()}/${editingRecord.id}`, formData);
            } else {
                await axios.post(`/api/${modelName?.toLowerCase()}`, formData);
            }
            setShowForm(false);
            fetchRecords();
        } catch (error: any) {
            alert(`Failed to save: ${error.response?.data?.error || error.message}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;

        try {
            await axios.delete(`/api/${modelName?.toLowerCase()}/${id}`);
            fetchRecords();
        } catch (error: any) {
            alert(`Failed to delete: ${error.response?.data?.error || error.message}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
                    <p className="text-slate-600 font-medium">Loading records...</p>
                </div>
            </div>
        );
    }

    if (!model) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl text-slate-600 mb-4">Model not found</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
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
                                    <Table className="w-7 h-7 text-indigo-600" />
                                    {model.name} Records
                                </h1>
                                <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                    <Database className="w-4 h-4" />
                                    {model.tableName || `${model.name.toLowerCase()}s`}
                                </p>
                            </div>
                        </div>

                        {canCreate() && (
                            <button
                                onClick={handleCreate}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                            >
                                <Plus className="w-5 h-5" />
                                Create Record
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all">
                        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex items-center justify-between">
                            <h2 className="text-2xl font-bold">
                                {editingRecord ? 'Edit Record' : 'Create Record'}
                            </h2>
                            <button
                                onClick={() => setShowForm(false)}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {model.fields.map((field) => (
                                <div key={field.name} className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700">
                                        {field.name} {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                    {field.type === 'boolean' ? (
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData[field.name] || false}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, [field.name]: e.target.checked })
                                                }
                                                className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-slate-600">Enable this option</span>
                                        </label>
                                    ) : field.type === 'number' ? (
                                        <input
                                            type="number"
                                            value={formData[field.name] || ''}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    [field.name]: e.target.value ? Number(e.target.value) : undefined,
                                                })
                                            }
                                            required={field.required}
                                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                        />
                                    ) : field.type === 'date' ? (
                                        <input
                                            type="datetime-local"
                                            value={formData[field.name] || ''}
                                            onChange={(e) =>
                                                setFormData({ ...formData, [field.name]: e.target.value })
                                            }
                                            required={field.required}
                                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            value={formData[field.name] || ''}
                                            onChange={(e) =>
                                                setFormData({ ...formData, [field.name]: e.target.value })
                                            }
                                            required={field.required}
                                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                        />
                                    )}
                                </div>
                            ))}

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                                >
                                    <Save className="w-5 h-5" />
                                    Save
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {records.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md w-full text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Table className="w-10 h-10 text-indigo-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-3">No Records Found</h3>
                            <p className="text-slate-600 mb-6">
                                Start by creating your first record for this model.
                            </p>
                            {canCreate() && (
                                <button
                                    onClick={handleCreate}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                                >
                                    <Plus className="w-5 h-5" />
                                    Create First Record
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                                <tr>
                                    {model.fields.map((field) => (
                                        <th key={field.name} className="px-6 py-4 text-left text-sm font-semibold">
                                            {field.name}
                                        </th>
                                    ))}
                                    <th className="px-6 py-4 text-right text-sm font-semibold">Actions</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                {records.map((record) => (
                                    <tr
                                        key={record.id}
                                        className="hover:bg-slate-50 transition-colors"
                                    >
                                        {model.fields.map((field) => (
                                            <td key={field.name} className="px-6 py-4 text-sm text-slate-700">
                                                {typeof record[field.name] === 'object'
                                                    ? JSON.stringify(record[field.name])
                                                    : String(record[field.name] ?? '')}
                                            </td>
                                        ))}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {canUpdate(record) && (
                                                    <button
                                                        onClick={() => handleEdit(record)}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {canDelete(record) && (
                                                    <button
                                                        onClick={() => handleDelete(record.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}