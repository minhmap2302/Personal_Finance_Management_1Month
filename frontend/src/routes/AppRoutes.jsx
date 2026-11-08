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

const modules = [
  ['transactions','Giao dịch','Theo dõi thu nhập, chi tiêu và lịch sử biến động tài chính.'],
  ['budgets','Ngân sách','Theo dõi hạn mức tổng và hạn mức theo từng danh mục.'],
  ['saving-goals','Mục tiêu tiết kiệm','Thiết lập mục tiêu và theo dõi tiến độ tích lũy của gia đình.'],
  ['support','Hỗ trợ & Trợ giúp','Tìm câu trả lời và thông tin hỗ trợ sử dụng ứng dụng.']
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
      {modules.map(([path,title,description]) => <Route key={path} path={path} element={<ModulePage title={title} description={description}/>}/>)}
    </Route>
    <Route path="*" element={<NotFound404/>}/>
  </Routes>;
}
