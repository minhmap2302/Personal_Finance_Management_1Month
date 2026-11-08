import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export default function PublicRoute({ children }) { const { loading, isAuthenticated } = useAuth(); if (loading) return <div className="loading-screen">Đang tải…</div>; return isAuthenticated ? <Navigate to="/app/dashboard" replace /> : children; }
