import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FamilyProvider } from '../context/FamilyContext';
import MainLayout from '../layouts/MainLayout';
import AppLoadingScreen from './AppLoadingScreen';

export default function ProtectedRoute() {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();
  if (loading) return <AppLoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <FamilyProvider><MainLayout><Outlet /></MainLayout></FamilyProvider>;
}
