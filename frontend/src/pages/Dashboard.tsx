import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import type { ModelDefinition } from '../types/model';
import { Database, Plus, LogOut, FileText, Edit, Trash2, Upload, Eye, Loader2 } from 'lucide-react';

export default function Dashboard() {
    const { user, logout } = useAuth();
    const [models, setModels] = useState<ModelDefinition[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        try {
            const response = await axios.get('/api/models');
            setModels(response.data);
        } catch (error) {
            console.error('Failed to fetch models:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async (modelName: string) => {
        try {
            await axios.post(`/api/models/${modelName}/publish`);
            alert('Model published successfully!');
            fetchModels();
        } catch (error: any) {
            alert(`Failed to publish: ${error.response?.data?.error || error.message}`);
        }
    };

    const handleDelete = async (modelName: string) => {
        if (!confirm(`Are you sure you want to delete model "${modelName}"?`)) return;

        try {
            await axios.delete(`/api/models/${modelName}`);
            alert('Model deleted successfully!');
            fetchModels();
        } catch (error: any) {
            alert(`Failed to delete: ${error.response?.data?.error || error.message}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
                    <p className="text-slate-600 font-medium">Loading your models...</p>
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
                        <div className="flex items-center gap-3">
                            <Database className="w-8 h-8 text-indigo-600" />
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Model Management</h1>
                                <p className="text-sm text-slate-500">Auto-CRUD RBAC Platform</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-slate-900">{user?.email}</p>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                    {user?.role}
                                </span>
                            </div>

                            <Link
                                to="/models/new"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                            >
                                <Plus className="w-5 h-5" />
                                <span className="hidden sm:inline">Create Model</span>
                            </Link>

                            <button
                                onClick={logout}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {models.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md w-full text-center transform hover:scale-105 transition-transform duration-300">
                            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Database className="w-10 h-10 text-indigo-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-3">No Models Yet</h3>
                            <p className="text-slate-600 mb-6">
                                Get started by creating your first data model. Define fields, set permissions, and start managing your data.
                            </p>
                            <Link
                                to="/models/new"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                            >
                                <Plus className="w-5 h-5" />
                                Create Your First Model
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {models.map((model, index) => (
                            <div
                                key={model.name}
                                className="bg-white rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {/* Card Header */}
                                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                                    <div className="flex items-start justify-between mb-2">
                                        <h2 className="text-2xl font-bold">{model.name}</h2>
                                        <FileText className="w-6 h-6 opacity-80" />
                                    </div>
                                    <p className="text-indigo-100 text-sm flex items-center gap-2">
                                        <Database className="w-4 h-4" />
                                        {model.tableName || `${model.name.toLowerCase()}s`}
                                    </p>
                                </div>

                                <div className="p-6 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 rounded-lg p-3">
                                            <p className="text-xs text-slate-500 mb-1">Fields</p>
                                            <p className="text-2xl font-bold text-slate-900">{model.fields.length}</p>
                                        </div>
                                        {model.ownerField && (
                                            <div className="bg-slate-50 rounded-lg p-3">
                                                <p className="text-xs text-slate-500 mb-1">Owner Field</p>
                                                <p className="text-sm font-semibold text-slate-900 truncate">{model.ownerField}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-500 mb-2">RBAC Roles</p>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.keys(model.rbac).map((role) => (
                                                <span
                                                    key={role}
                                                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800"
                                                >
                                                    {role}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 p-4 bg-slate-50">
                                    <div className="flex flex-wrap gap-2">
                                        <Link
                                            to={`/models/${model.name}/records`}
                                            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-white border-2 border-indigo-600 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-colors duration-200"
                                        >
                                            <Eye className="w-4 h-4" />
                                            <span className="text-sm">Records</span>
                                        </Link>

                                        {user?.role === 'Admin' && (
                                            <>
                                                <Link
                                                    to={`/models/${model.name}/edit`}
                                                    className="inline-flex items-center justify-center p-2 bg-white border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors duration-200"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handlePublish(model.name)}
                                                    className="inline-flex items-center justify-center p-2 bg-white border-2 border-green-500 text-green-600 rounded-lg hover:bg-green-50 transition-colors duration-200"
                                                    title="Publish"
                                                >
                                                    <Upload className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(model.name)}
                                                    className="inline-flex items-center justify-center p-2 bg-white border-2 border-red-500 text-red-600 rounded-lg hover:bg-red-50 transition-colors duration-200"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}