import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import PublicRoute from '../components/PublicRoute';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import NotFound404 from '../pages/NotFound404';
import Home from '../pages/Home';
import ModulePage from '../pages/ModulePage';
import Profile from '../pages/Profile';
import Family from '../pages/Family';
import Members from '../pages/Members';
import Categories from '../pages/Categories';
import { CircleHelp, PiggyBank, ReceiptText, WalletCards } from 'lucide-react';

const modules = [
  { path: 'transactions', title: 'Giao dịch', description: 'Theo dõi thu nhập, chi tiêu và lịch sử biến động tài chính.', icon: ReceiptText },
  { path: 'budgets', title: 'Ngân sách', description: 'Theo dõi hạn mức tổng và hạn mức theo từng danh mục.', icon: WalletCards },
  { path: 'saving-goals', title: 'Mục tiêu tiết kiệm', description: 'Thiết lập mục tiêu và theo dõi tiến độ tích lũy của gia đình.', icon: PiggyBank },
  { path: 'support', title: 'Hỗ trợ & Trợ giúp', description: 'Tìm câu trả lời và thông tin hỗ trợ sử dụng ứng dụng.', icon: CircleHelp },
];

export default function AppRoutes() {
  return <Routes>
    <Route path="/" element={<Home/>}/>
    <Route path="/login" element={<PublicRoute><Login/></PublicRoute>}/>
    <Route path="/register" element={<PublicRoute><Register/></PublicRoute>}/>
    <Route path="/app" element={<ProtectedRoute/>}>
      <Route index element={<Navigate to="dashboard" replace/>}/>
      <Route path="dashboard" element={<Dashboard/>}/>
      <Route path="categories" element={<Categories/>}/>
      <Route path="members" element={<Members/>}/>
      <Route path="family" element={<Family/>}/>
      <Route path="profile" element={<Profile/>}/>
      {modules.map(({ path, title, description, icon }) => (
        <Route
          key={path}
          path={path}
          element={<ModulePage title={title} description={description} icon={icon} />}
        />
      ))}
    </Route>
    <Route path="*" element={<NotFound404/>}/>
  </Routes>;
}
