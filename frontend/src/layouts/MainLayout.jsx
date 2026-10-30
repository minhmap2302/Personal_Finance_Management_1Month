import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, ChevronDown, CircleHelp, FolderKanban, Home, LayoutDashboard, LogOut, Menu, ReceiptText, Settings, ShieldCheck, Users, UserCircle, WalletCards, X, Sprout } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const nav = [
  { to:'/app/dashboard', label:'Tổng quan', icon:LayoutDashboard }, {to:'/app/transactions',label:'Giao dịch',icon:ReceiptText},
  {to:'/app/categories',label:'Danh mục',icon:FolderKanban}, {to:'/app/budgets',label:'Ngân sách',icon:WalletCards},
  {to:'/app/saving-goals',label:'Mục tiêu tiết kiệm',icon:ShieldCheck}, {to:'/app/members',label:'Thành viên',icon:Users},
  {to:'/app/family',label:'Gia đình',icon:Home}, {to:'/app/profile',label:'Hồ sơ cá nhân',icon:UserCircle}, {to:'/app/support',label:'Hỗ trợ',icon:CircleHelp}
];
export default function MainLayout({ children }) {
  const [drawer,setDrawer] = useState(false); const [confirm,setConfirm] = useState(false); const [profileOpen,setProfileOpen] = useState(false);
  const { user, logout } = useAuth(); const location = useLocation();
  const name = user?.fullName || user?.username || 'Nguyễn Văn A';
  const Sidebar = () => <aside className="sidebar">
    <NavLink to="/app/dashboard" className="brand" onClick={()=>setDrawer(false)}><span className="brand-mark"><Home size={22}/></span><span><b>FinHome</b><small>QUẢN LÝ TÀI CHÍNH GIA ĐÌNH</small></span></NavLink>
    <div className="side-caption">KHÔNG GIAN CỦA BẠN</div>
    <nav className="nav-list">{nav.map(({to,label,icon:Icon})=><NavLink key={to} to={to} onClick={()=>setDrawer(false)} className={({isActive})=>`nav-link ${isActive?'active':''}`}><Icon size={19}/><span>{label}</span>{to==='/app/dashboard'&&<span className="nav-dot"/>}</NavLink>)}</nav>
    <div className="sidebar-bottom"><div className="help-card"><span className="help-icon"><Sprout size={19}/></span><b>Đang đi đúng hướng!</b><p>Mỗi khoản chi rõ ràng là một bước gần hơn tới mục tiêu.</p><NavLink to="/app/support">Khám phá mẹo hay <span>↗</span></NavLink></div><button className="nav-link logout-link" onClick={()=>setConfirm(true)}><LogOut size={19}/><span>Đăng xuất</span></button><div className="side-foot">FinHome <span>•</span> Phiên bản 1.0</div></div>
  </aside>;
  return <div className="app-shell">
    <div className="desktop-sidebar"><Sidebar/></div>
    <AnimatePresence>{drawer&&<><motion.div className="drawer-scrim" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setDrawer(false)}/><motion.div className="mobile-drawer" initial={{x:-320}} animate={{x:0}} exit={{x:-320}} transition={{type:'spring',damping:28}}><button className="drawer-close" onClick={()=>setDrawer(false)}><X/></button><Sidebar/></motion.div></>}</AnimatePresence>
    <main className="app-main"><header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={()=>setDrawer(true)} aria-label="Mở menu"><Menu size={21}/></button><div className="breadcrumb"><span>Không gian gia đình</span><b>/</b><strong>{nav.find(n=>n.to===location.pathname)?.label||'Tổng quan'}</strong></div></div><div className="topbar-actions"><button className="family-select"><span className="family-avatar"><Home size={16}/></span><span><small>KHÔNG GIAN HIỆN TẠI</small><b>Gia đình Nguyễn Văn A</b></span><ChevronDown size={15}/></button><button className="icon-button notification" aria-label="Thông báo"><Bell size={19}/><i/></button><div className="profile-wrap"><button className="profile-button" onClick={()=>setProfileOpen(!profileOpen)}><span className="avatar">{name.trim().charAt(0).toUpperCase()}</span><span className="profile-text"><b>{name}</b><small>{user?.role||'Chủ gia đình'}</small></span><ChevronDown size={15}/></button>{profileOpen&&<div className="profile-menu"><NavLink to="/app/profile" onClick={()=>setProfileOpen(false)}><UserCircle size={16}/> Hồ sơ cá nhân</NavLink><button onClick={()=>{setProfileOpen(false);setConfirm(true)}}><LogOut size={16}/> Đăng xuất</button></div>}</div></div></header><section className="page-content" key={location.pathname}>{children}</section></main>
    <AnimatePresence>{confirm&&<motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><motion.div className="confirm-modal" initial={{y:16,scale:.97}} animate={{y:0,scale:1}} exit={{y:12,scale:.98}}><div className="modal-icon"><LogOut size={23}/></div><h3>Đăng xuất khỏi FinHome?</h3><p>Phiên làm việc hiện tại sẽ kết thúc. Bạn có thể đăng nhập lại bất cứ lúc nào.</p><div className="modal-actions"><button className="btn-secondary" onClick={()=>setConfirm(false)}>Ở lại</button><button className="btn-danger" onClick={()=>logout()}>Đăng xuất</button></div></motion.div></motion.div>}</AnimatePresence>
  </div>;
}
