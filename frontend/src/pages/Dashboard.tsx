import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import type {ModelDefinition} from '../types/model';

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
        return <div className="dashboard-container">Loading...</div>;
    }

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Model Management</h1>
                <div className="header-actions">
                    <span>Welcome, {user?.email} ({user?.role})</span>
                    <Link to="/models/new" className="btn-primary">
                        Create New Model
                    </Link>
                    <button onClick={logout} className="btn-secondary">
                        Logout
                    </button>
                </div>
            </header>

            <div className="models-grid">
                {models.length === 0 ? (
                    <div className="empty-state">
                        <p>No models defined yet.</p>
                        <Link to="/models/new" className="btn-primary">
                            Create Your First Model
                        </Link>
                    </div>
                ) : (
                    models.map((model) => (
                        <div key={model.name} className="model-card">
                            <div className="model-card-header">
                                <h2>{model.name}</h2>
                                <span className="model-table-name">
                  Table: {model.tableName || `${model.name.toLowerCase()}s`}
                </span>
                            </div>

                            <div className="model-info">
                                <p><strong>Fields:</strong> {model.fields.length}</p>
                                {model.ownerField && (
                                    <p><strong>Owner Field:</strong> {model.ownerField}</p>
                                )}
                                <p><strong>RBAC Roles:</strong> {Object.keys(model.rbac).join(', ')}</p>
                            </div>

                            <div className="model-actions">
                                <Link
                                    to={`/models/${model.name}/records`}
                                    className="btn-action"
                                >
                                    View Records
                                </Link>
                                {user?.role === 'Admin' && (
                                    <>
                                        <Link
                                            to={`/models/${model.name}/edit`}
                                            className="btn-action"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => handlePublish(model.name)}
                                            className="btn-action"
                                        >
                                            Publish
                                        </button>
                                        <button
                                            onClick={() => handleDelete(model.name)}
                                            className="btn-action btn-danger"
                                        >
                                            Delete
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

