import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ModelEditor from './pages/ModelEditor';
import ModelRecords from './pages/ModelRecords';

function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    return <>{children}</>;
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/"
                        element={
                            <PrivateRoute>
                                <Dashboard />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/models/new"
                        element={
                            <PrivateRoute>
                                <ModelEditor />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/models/:modelName/edit"
                        element={
                            <PrivateRoute>
                                <ModelEditor />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/models/:modelName/records"
                        element={
                            <PrivateRoute>
                                <ModelRecords />
                            </PrivateRoute>
                        }
                    />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;

