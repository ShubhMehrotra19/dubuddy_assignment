import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import type {ModelDefinition} from '../types/model';
import { useAuth } from '../contexts/AuthContext';

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

            // Initialize form data
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
        return <div className="records-container">Loading...</div>;
    }

    if (!model) {
        return <div className="records-container">Model not found</div>;
    }

    return (
        <div className="records-container">
            <div className="records-header">
                <div>
                    <h1>{model.name} Records</h1>
                    <p className="model-info">
                        Table: {model.tableName || `${model.name.toLowerCase()}s`}
                    </p>
                </div>
                <div className="header-actions">
                    {canCreate() && (
                        <button onClick={handleCreate} className="btn-primary">
                            + Create Record
                        </button>
                    )}
                    <button onClick={() => navigate('/')} className="btn-secondary">
                        Back to Dashboard
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>{editingRecord ? 'Edit Record' : 'Create Record'}</h2>
                        <form onSubmit={handleSubmit}>
                            {model.fields.map((field) => (
                                <div key={field.name} className="form-group">
                                    <label>
                                        {field.name} {field.required && '*'}
                                    </label>
                                    {field.type === 'boolean' ? (
                                        <input
                                            type="checkbox"
                                            checked={formData[field.name] || false}
                                            onChange={(e) =>
                                                setFormData({ ...formData, [field.name]: e.target.checked })
                                            }
                                        />
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
                                        />
                                    ) : field.type === 'date' ? (
                                        <input
                                            type="datetime-local"
                                            value={formData[field.name] || ''}
                                            onChange={(e) =>
                                                setFormData({ ...formData, [field.name]: e.target.value })
                                            }
                                            required={field.required}
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            value={formData[field.name] || ''}
                                            onChange={(e) =>
                                                setFormData({ ...formData, [field.name]: e.target.value })
                                            }
                                            required={field.required}
                                        />
                                    )}
                                </div>
                            ))}
                            <div className="form-actions">
                                <button type="submit" className="btn-primary">
                                    Save
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {records.length === 0 ? (
                <div className="empty-state">
                    <p>No records found.</p>
                    {canCreate() && (
                        <button onClick={handleCreate} className="btn-primary">
                            Create First Record
                        </button>
                    )}
                </div>
            ) : (
                <div className="records-table-container">
                    <table className="records-table">
                        <thead>
                        <tr>
                            {model.fields.map((field) => (
                                <th key={field.name}>{field.name}</th>
                            ))}
                            <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {records.map((record) => (
                            <tr key={record.id}>
                                {model.fields.map((field) => (
                                    <td key={field.name}>
                                        {typeof record[field.name] === 'object'
                                            ? JSON.stringify(record[field.name])
                                            : String(record[field.name] ?? '')}
                                    </td>
                                ))}
                                <td>
                                    <div className="action-buttons">
                                        {canUpdate(record) && (
                                            <button
                                                onClick={() => handleEdit(record)}
                                                className="btn-action"
                                            >
                                                Edit
                                            </button>
                                        )}
                                        {canDelete(record) && (
                                            <button
                                                onClick={() => handleDelete(record.id)}
                                                className="btn-action btn-danger"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

