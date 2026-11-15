import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export default function PublicRoute({ children }) {
  const { loading, isAuthenticated, user } = useAuth();
  if (loading) return <div className="loading-screen">Đang tải…</div>;
  if (!isAuthenticated) return children;
  return <Navigate to={user?.role === 'ADMIN' ? '/admin/users' : '/app/dashboard'} replace />;
}
