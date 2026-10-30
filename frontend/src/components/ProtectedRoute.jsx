import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../layouts/MainLayout';

export default function ProtectedRoute() {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();
  if (loading) return <div className="loading-screen"><LoaderCircle className="spin" size={34}/><span>Đang khởi tạo không gian tài chính…</span></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <MainLayout><Outlet /></MainLayout>;
}
