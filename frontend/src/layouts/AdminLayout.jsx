import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ShieldCheck, LogOut, Menu, X, Sun, Moon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ConfirmDialog } from '../components/PfmUI';

const items = [
  { to: '/admin/users', label: 'Quản lý người dùng', icon: Users },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const pageTitle = location.pathname.startsWith('/admin/users') ? 'Quản lý người dùng' : 'Tổng quan quản trị';

  const Sidebar = () => <aside className="admin-sidebar">
    <NavLink to="/admin/users" className="admin-brand" onClick={() => setDrawer(false)}>
      <span className="admin-brand-mark"><ShieldCheck size={22}/></span>
      <span><b>FinHome</b><small>ADMIN CONSOLE</small></span>
    </NavLink>
    <div className="admin-nav-caption">QUẢN TRỊ HỆ THỐNG</div>
    {items.map(({to,label,icon:Icon}) => <NavLink key={to} to={to} onClick={() => setDrawer(false)} className={({isActive}) => `admin-nav-link${isActive?' active':''}`}><Icon size={18}/><span>{label}</span></NavLink>)}
    <div className="admin-sidebar-bottom">
      <div className="admin-sidebar-user"><span>{(user?.fullName||user?.username||'A').slice(0,1).toUpperCase()}</span><div><b>{user?.username}</b><small>System administrator</small></div></div>
      <button type="button" className="admin-logout" onClick={() => setConfirmLogout(true)}><LogOut size={17}/> Đăng xuất</button>
    </div>
  </aside>;

  return <div className="admin-shell">
    <div className="admin-sidebar-desktop"><Sidebar/></div>
    <AnimatePresence>
      {drawer && <><motion.button aria-label="Đóng menu" className="admin-drawer-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setDrawer(false)}/><motion.div className="admin-drawer" initial={{x:-280}} animate={{x:0}} exit={{x:-280}}><button className="admin-drawer-close" onClick={()=>setDrawer(false)}><X size={18}/></button><Sidebar/></motion.div></>}
    </AnimatePresence>
    <main className="admin-main">
      <header className="admin-topbar">
        <button className="admin-mobile-menu" onClick={()=>setDrawer(true)} aria-label="Mở menu"><Menu size={20}/></button>
        <div className="admin-breadcrumb"><span>FinHome Admin</span><b>/</b><strong>{pageTitle}</strong></div>
        <div className="admin-topbar-actions"><span className="admin-role-indicator"><ShieldCheck size={15}/> ADMIN</span><button type="button" className="admin-theme-toggle" onClick={toggleTheme} aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}>{isDark ? <Sun size={18}/> : <Moon size={18}/>}</button></div>
      </header>
      <section className="admin-content">{children}</section>
    </main>
    {confirmLogout && <ConfirmDialog title="Đăng xuất trang quản trị?" description="Phiên làm việc quản trị sẽ kết thúc." onCancel={()=>setConfirmLogout(false)} onConfirm={()=>logout()} confirmText="Đăng xuất"/>}
  </div>;
}
