import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import PublicRoute from '../components/PublicRoute';
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
export default function AppRoutes(){return <Routes><Route path="/" element={<Home/>}/><Route path="/login" element={<PublicRoute><Login/></PublicRoute>}/><Route path="/register" element={<PublicRoute><Register/></PublicRoute>}/><Route path="/app" element={<ProtectedRoute/>}><Route index element={<Navigate to="dashboard" replace/>}/><Route path="dashboard" element={<Dashboard/>}/><Route path="transactions" element={<Transactions/>}/><Route path="categories" element={<Categories/>}/><Route path="budgets" element={<Budgets/>}/><Route path="saving-goals" element={<SavingGoals/>}/><Route path="support" element={<Support/>}/><Route path="members" element={<Members/>}/><Route path="family" element={<Family/>}/><Route path="profile" element={<Profile/>}/></Route><Route path="*" element={<NotFound404/>}/></Routes>;}
