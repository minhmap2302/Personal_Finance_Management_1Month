import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLoadingScreen from './AppLoadingScreen';
import AdminLayout from '../layouts/AdminLayout';

/** Chỉ cho phép tài khoản ADMIN truy cập khu vực /admin/*. */
export default function AdminRoute() {
  const { loading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (loading) return <AppLoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const role = String(user?.role || '')
    .toUpperCase()
    .replace(/^ROLE_/, '');

  if (role === 'USER') {
    return <Navigate to="/app/dashboard" replace />;
  }

  if (role !== 'ADMIN') {
    return <Navigate to="/login" replace />;
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
