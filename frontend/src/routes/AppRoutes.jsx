import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import PublicRoute from '../components/PublicRoute';
import UserRoute from '../components/UserRoute';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Transactions from '../pages/Transactions';
import Budgets from '../pages/Budgets';
import SavingGoals from '../pages/SavingGoals';
import Support from '../pages/Support';
import NotFound404 from '../pages/NotFound404';
import Home from '../pages/Home';
import Categories from '../pages/Categories';
import Profile from '../pages/Profile';
import Family from '../pages/Family';
import Members from '../pages/Members';
import AdminRoute from '../components/AdminRoute';
import AdminPage from '../pages/AdminPage';
import AppLoadingScreen from '../components/AppLoadingScreen';
import { useAuth } from '../context/AuthContext';

function RootRedirect() {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) return <AppLoadingScreen />;

    if (!isAuthenticated) return <Home />;

    const role = String(user?.role || '').toUpperCase();

    if (role === 'ADMIN' || role === 'ROLE_ADMIN') {
        return <Navigate to="/admin/users" replace />;
    }

    return <Navigate to="/app/dashboard" replace />;
}
export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<RootRedirect />} />

            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                }
            />
            <Route
                path="/register"
                element={
                    <PublicRoute>
                        <Register />
                    </PublicRoute>
                }
            />

            {/* Khu vực ADMIN: chỉ ADMIN được truy cập. */}
            <Route path="/admin" element={<AdminRoute />}>
                <Route index element={<Navigate to="users" replace />} />
                <Route path="users" element={<AdminPage />} />
            </Route>

            {/* Khu vực USER: UserRoute kiểm tra role, ProtectedRoute giữ FamilyProvider + MainLayout. */}
            <Route element={<UserRoute />}>
                <Route path="/app" element={<ProtectedRoute />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="transactions" element={<Transactions />} />
                    <Route path="categories" element={<Categories />} />
                    <Route path="budgets" element={<Budgets />} />
                    <Route path="saving-goals" element={<SavingGoals />} />
                    <Route path="support" element={<Support />} />
                    <Route path="members" element={<Members />} />
                    <Route path="family" element={<Family />} />
                    <Route path="profile" element={<Profile />} />
                </Route>
            </Route>

            <Route path="*" element={<NotFound404 />} />
        </Routes>
    );
}