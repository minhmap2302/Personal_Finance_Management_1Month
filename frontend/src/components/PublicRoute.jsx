import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLoadingScreen from './AppLoadingScreen';

export default function PublicRoute({ children }) {
  const { loading, isAuthenticated } = useAuth();
  if (loading) return <AppLoadingScreen />;
  return isAuthenticated ? <Navigate to="/app/dashboard" replace /> : children;
}
