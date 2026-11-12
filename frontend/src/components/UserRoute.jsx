import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLoadingScreen from './AppLoadingScreen';

/**
 * Chỉ cho phép tài khoản USER truy cập khu vực /app/*.
 * ADMIN được chuyển về khu vực quản trị; tài khoản chưa đăng nhập về /login.
 */
export default function UserRoute() {
  const { loading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (loading) return <AppLoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const role = String(user?.role || '')
    .toUpperCase()
    .replace(/^ROLE_/, '');

  if (role === 'ADMIN') {
    return <Navigate to="/admin/users" replace />;
  }

  if (role !== 'USER') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
