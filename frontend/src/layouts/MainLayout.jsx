import { useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, ChevronDown, CircleHelp, FolderKanban, Home, LayoutDashboard, LogOut, Menu, ReceiptText, Search, ShieldCheck, Users, UserCircle, WalletCards, X, Sprout, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';

const nav = [
  { to:'/app/dashboard', label:'Tổng quan', icon:LayoutDashboard }, {to:'/app/transactions',label:'Giao dịch',icon:ReceiptText},
  {to:'/app/categories',label:'Danh mục',icon:FolderKanban}, {to:'/app/budgets',label:'Ngân sách',icon:WalletCards},
  {to:'/app/saving-goals',label:'Mục tiêu tiết kiệm',icon:ShieldCheck}, {to:'/app/members',label:'Thành viên',icon:Users},
  {to:'/app/family',label:'Không gian gia đình',icon:Home}, {to:'/app/profile',label:'Hồ sơ cá nhân',icon:UserCircle}, {to:'/app/support',label:'Hỗ trợ',icon:CircleHelp}
];

export default function MainLayout({ children }) {
  const [drawer,setDrawer] = useState(false); const [confirm,setConfirm] = useState(false); const [profileOpen,setProfileOpen] = useState(false); const [familyMenuOpen,setFamilyMenuOpen] = useState(false); const [familySearch,setFamilySearch] = useState('');
  const { user, logout } = useAuth();
  const { families, activeFamily, activeFamilyId, setActiveFamilyId, familiesLoading } = useFamily();
  const location = useLocation();
  const name = user?.fullName || user?.username || 'Người dùng';
  const filteredFamilies = useMemo(() => {
    const q = familySearch.trim().toLocaleLowerCase('vi');
    return q ? families.filter((f) => String(f.name || '').toLocaleLowerCase('vi').includes(q)) : families;
  }, [families, familySearch]);
  // Các trang cá nhân/quản trị lời mời vẫn phải dùng được dù tài khoản chưa thuộc gia đình nào.
  const isAllowedWithoutFamily = ['/app/members', '/app/family', '/app/profile'].some(
      (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  );
  const showFamilyWaiting = !familiesLoading && families.length === 0 && !isAllowedWithoutFamily;

  const Sidebar = () => <aside className="sidebar">
    <NavLink to="/app/dashboard" className="brand" onClick={()=>setDrawer(false)}><span className="brand-mark"><Home size={22}/></span><span><b>FinHome</b><small>QUẢN LÝ TÀI CHÍNH GIA ĐÌNH</small></span></NavLink>
    <div className="side-caption">KHÔNG GIAN CỦA BẠN</div>
    <nav className="nav-list">{nav.map(({to,label,icon:Icon})=><NavLink key={to} to={to} onClick={()=>setDrawer(false)} className={({isActive})=>`nav-link ${isActive?'active':''}`}><Icon size={19}/><span>{label}</span>{to==='/app/dashboard'&&<span className="nav-dot"/>}</NavLink>)}</nav>
    <div className="sidebar-bottom"><div className="help-card"><span className="help-icon"><Sprout size={19}/></span><b>Đang đi đúng hướng!</b><p>Mỗi khoản chi rõ ràng là một bước gần hơn tới mục tiêu.</p><NavLink to="/app/support">Khám phá mẹo hay <span>↗</span></NavLink></div><button className="nav-link logout-link" onClick={()=>setConfirm(true)}><LogOut size={19}/><span>Đăng xuất</span></button><div className="side-foot">FinHome <span>•</span> Phiên bản 1.0</div></div>
  </aside>;

  return <div className="app-shell">
    <div className="desktop-sidebar"><Sidebar/></div>
    <AnimatePresence>{drawer&&<><motion.div className="drawer-scrim" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setDrawer(false)}/><motion.div className="mobile-drawer" initial={{x:-320}} animate={{x:0}} exit={{x:-320}} transition={{type:'spring',damping:28}}><button className="drawer-close" onClick={()=>setDrawer(false)}><X/></button><Sidebar/></motion.div></>}</AnimatePresence>
    <main className="app-main"><header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={()=>setDrawer(true)} aria-label="Mở menu"><Menu size={21}/></button><div className="breadcrumb"><span>Không gian gia đình</span><b>/</b><strong>{nav.find(n=>n.to===location.pathname)?.label||'Tổng quan'}</strong></div></div><div className="topbar-actions">
      <div className="family-picker-wrap">
        <button type="button" className={`family-picker-trigger ${familyMenuOpen ? 'is-open' : ''}`} onClick={() => { setFamilyMenuOpen(v => !v); setFamilySearch(''); }} aria-expanded={familyMenuOpen} aria-label="Chọn không gian gia đình">
          <span className="family-avatar"><Home size={17}/></span>
          <span className="family-picker-copy"><small>KHÔNG GIAN HIỆN TẠI</small><b>{activeFamily?.name || (families.length ? 'Chọn gia đình' : 'Chưa có gia đình')}</b></span>
          <ChevronDown size={16} className={`family-picker-chevron ${familyMenuOpen ? 'rotated' : ''}`}/>
        </button>
        <AnimatePresence>
          {familyMenuOpen && <motion.div className="family-picker-popover" initial={{opacity:0,y:8,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:6,scale:.98}} transition={{duration:.16}}>
            <div className="family-picker-heading"><div><b>Không gian gia đình</b><small>Chọn nơi bạn muốn làm việc</small></div><button type="button" onClick={()=>setFamilyMenuOpen(false)} aria-label="Đóng"><X size={16}/></button></div>
            {families.length > 3 && <label className="family-picker-search"><Search size={15}/><input value={familySearch} onChange={e=>setFamilySearch(e.target.value)} placeholder="Tìm gia đình..."/></label>}
            <div className="family-picker-list">
              {familiesLoading ? <div className="family-picker-empty">Đang tải danh sách gia đình…</div> :
                  filteredFamilies.length ? filteredFamilies.map(f => <button type="button" key={f.id} className={`family-picker-option ${String(f.id)===String(activeFamilyId)?'selected':''}`} onClick={()=>{setActiveFamilyId(f.id);setFamilyMenuOpen(false);}}>
                    <span className="family-option-icon"><Home size={16}/></span><span className="family-option-text"><b>{f.name}</b><small>{{OWNER:'Chủ gia đình',MANAGER:'Quản lý',MEMBER:'Thành viên'}[f.myRole] || 'Thành viên'}</small></span>{String(f.id)===String(activeFamilyId)&&<Check size={17}/>}
                  </button>) : <div className="family-picker-empty">{families.length ? 'Không tìm thấy gia đình phù hợp.' : 'Bạn chưa tham gia gia đình nào.'}</div>}
            </div>
            <div className="family-picker-footer"><Link to="/app/family" onClick={()=>setFamilyMenuOpen(false)}><Plus size={15}/> {families.length ? 'Quản lý không gian gia đình' : 'Tạo gia đình mới'}</Link></div>
          </motion.div>}
        </AnimatePresence>
      </div>
      <button className="icon-button notification" aria-label="Thông báo"><Bell size={19}/><i/></button><div className="profile-wrap"><button className="profile-button" onClick={()=>setProfileOpen(!profileOpen)}><span className="avatar">{name.trim().charAt(0).toUpperCase()}</span><span className="profile-text"><b>{name}</b><small>{user?.role||'Người dùng'}</small></span><ChevronDown size={15}/></button>{profileOpen&&<div className="profile-menu"><NavLink to="/app/profile" onClick={()=>setProfileOpen(false)}><UserCircle size={16}/> Hồ sơ cá nhân</NavLink><button onClick={()=>{setProfileOpen(false);setConfirm(true)}}><LogOut size={16}/> Đăng xuất</button></div>}</div></div></header><section className="page-content" key={location.pathname}>{showFamilyWaiting ? <motion.div className="family-required-state" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}>
      <div className="family-required-card"><span className="family-required-icon"><Users size={26}/></span><span className="family-required-kicker">BẮT ĐẦU CÙNG FINHOME</span><h1>Bạn chưa tham gia gia đình nào</h1><p>Để xem và quản lý dữ liệu tài chính, hãy tạo không gian gia đình mới hoặc chờ lời mời tham gia từ người thân.</p><div className="family-required-actions"><Link className="family-required-primary" to="/app/family"><Plus size={17}/> Tạo gia đình mới</Link><Link className="family-required-secondary" to="/app/members"><Users size={16}/> Xem lời mời</Link></div><div className="family-required-foot"><Sparkles size={15}/> Các trang tổng quan và tính năng vẫn được giữ nguyên. Dữ liệu sẽ xuất hiện khi bạn tham gia gia đình.</div></div>
    </motion.div> : children}</section></main>
    <AnimatePresence>{confirm&&<motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><motion.div className="confirm-modal" initial={{y:16,scale:.97}} animate={{y:0,scale:1}} exit={{y:12,scale:.98}}><div className="modal-icon"><LogOut size={23}/></div><h3>Đăng xuất khỏi FinHome?</h3><p>Phiên làm việc hiện tại sẽ kết thúc. Bạn có thể đăng nhập lại bất cứ lúc nào.</p><div className="modal-actions"><button className="btn-secondary" onClick={()=>setConfirm(false)}>Ở lại</button><button className="btn-danger" onClick={()=>logout()}>Đăng xuất</button></div></motion.div></motion.div>}</AnimatePresence>
  </div>;
}
