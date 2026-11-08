import { useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell, Check, ChevronDown, CircleHelp, FolderKanban,
  Home, LayoutDashboard, LogOut, Menu, Plus,
  ReceiptText, Search, ShieldCheck, Sparkles,
  Sprout, UserCircle, Users, WalletCards, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import ThemeToggle from '../components/ThemeToggle';

const NAV_ITEMS = [
  { to: '/app/dashboard',    label: 'Tổng quan',           icon: LayoutDashboard },
  { to: '/app/transactions', label: 'Giao dịch',           icon: ReceiptText },
  { to: '/app/categories',   label: 'Danh mục',            icon: FolderKanban },
  { to: '/app/budgets',      label: 'Ngân sách',           icon: WalletCards },
  { to: '/app/saving-goals', label: 'Mục tiêu tiết kiệm',  icon: ShieldCheck },
  { to: '/app/members',      label: 'Thành viên',          icon: Users },
  { to: '/app/family',       label: 'Không gian gia đình', icon: Home },
  { to: '/app/profile',      label: 'Hồ sơ cá nhân',      icon: UserCircle },
  { to: '/app/support',      label: 'Hỗ trợ',             icon: CircleHelp },
];

// Sidebar component — used both in desktop fixed slot and mobile drawer
function SidebarContent({ onNavigate }) {
  return (
    <div className="sidebar">
      {/* Brand */}
      <NavLink to="/app/dashboard" className="brand" onClick={onNavigate} aria-label="FinHome — Trang tổng quan">
        <span className="brand-mark"><Home size={20} strokeWidth={2.2} /></span>
        <span>
          <b>FinHome</b>
          <small>QUẢN LÝ TÀI CHÍNH GIA ĐÌNH</small>
        </span>
      </NavLink>

      {/* Nav section label */}
      <div className="side-caption">Menu chính</div>

      {/* Navigation */}
      <nav className="nav-list" aria-label="Điều hướng chính">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <Icon size={18} strokeWidth={1.8} />
            <span>{label}</span>
            {to === '/app/dashboard' && <span className="nav-dot" aria-hidden="true" />}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="sidebar-bottom">
        <div className="help-card" role="complementary" aria-label="Mẹo tài chính">
          <span className="help-icon"><Sprout size={17} /></span>
          <b>Đang đi đúng hướng!</b>
          <p>Mỗi khoản chi rõ ràng là một bước gần hơn tới mục tiêu tài chính.</p>
          <NavLink to="/app/support" onClick={onNavigate}>Khám phá mẹo hay ↗</NavLink>
        </div>

        <button
          type="button"
          className="nav-link logout-link"
          onClick={onNavigate}
          /* Logout is handled by the parent component via confirm modal */
          data-action="logout"
          aria-label="Đăng xuất khỏi FinHome"
        >
          <LogOut size={18} strokeWidth={1.8} />
          <span>Đăng xuất</span>
        </button>

        <div className="side-foot">FinHome <span>•</span> v2.0</div>
      </div>
    </div>
  );
}

export default function MainLayout({ children }) {
  const [drawer, setDrawer]       = useState(false);
  const [confirm, setConfirm]     = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [familyMenuOpen, setFamilyMenuOpen] = useState(false);
  const [familySearch, setFamilySearch]     = useState('');

  const { user, logout } = useAuth();
  const { families, activeFamily, activeFamilyId, setActiveFamilyId, familiesLoading } = useFamily();
  const location = useLocation();

  const name = user?.fullName || user?.username || 'Người dùng';

  const filteredFamilies = useMemo(() => {
    const q = familySearch.trim().toLocaleLowerCase('vi');
    return q
      ? families.filter((f) => String(f.name || '').toLocaleLowerCase('vi').includes(q))
      : families;
  }, [families, familySearch]);

  const isAllowedWithoutFamily = ['/app/members', '/app/family', '/app/profile'].some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
  );
  const showFamilyWaiting = !familiesLoading && families.length === 0 && !isAllowedWithoutFamily;

  // Handle sidebar nav click — close drawer and intercept logout
  function handleSidebarNavigate(event) {
    const btn = event.target.closest('[data-action="logout"]');
    if (btn) {
      event.preventDefault();
      setConfirm(true);
    }
    setDrawer(false);
  }

  // Current page label for breadcrumb
  const currentPageLabel =
    NAV_ITEMS.find((n) => n.to === location.pathname)?.label ?? 'Tổng quan';

  return (
    <div className="app-shell">
      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <div className="desktop-sidebar" role="navigation" aria-label="Thanh điều hướng">
        <SidebarContent onNavigate={handleSidebarNavigate} />
      </div>

      {/* ── Mobile Drawer ────────────────────────────────────── */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              className="drawer-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: .18 }}
              onClick={() => setDrawer(false)}
              aria-hidden="true"
            />
            <motion.div
              className="mobile-drawer"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              role="dialog"
              aria-modal="true"
              aria-label="Menu điều hướng"
            >
              <button
                className="drawer-close"
                onClick={() => setDrawer(false)}
                aria-label="Đóng menu"
              >
                <X size={17} />
              </button>
              <SidebarContent onNavigate={handleSidebarNavigate} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Area ────────────────────────────────────────── */}
      <main className="app-main">

        {/* Topbar */}
        <header className="topbar" role="banner">
          <div className="topbar-left">
            {/* Mobile hamburger */}
            <button
              type="button"
              className="icon-button mobile-menu"
              onClick={() => setDrawer(true)}
              aria-label="Mở menu"
              aria-expanded={drawer}
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb */}
            <nav className="breadcrumb" aria-label="Vị trí hiện tại">
              <span>Không gian gia đình</span>
              <b aria-hidden="true">/</b>
              <strong>{currentPageLabel}</strong>
            </nav>
          </div>

          <div className="topbar-actions">
            {/* ── Family Picker ── */}
            <div className="family-picker-wrap">
              <button
                type="button"
                className={`family-picker-trigger${familyMenuOpen ? ' is-open' : ''}`}
                onClick={() => { setFamilyMenuOpen((v) => !v); setFamilySearch(''); }}
                aria-expanded={familyMenuOpen}
                aria-haspopup="listbox"
                aria-label="Chọn không gian gia đình"
              >
                <span className="family-avatar"><Home size={15} /></span>
                <span className="family-picker-copy">
                  <small>KHÔNG GIAN HIỆN TẠI</small>
                  <b>{activeFamily?.name || (families.length ? 'Chọn gia đình' : 'Chưa có gia đình')}</b>
                </span>
                <ChevronDown size={14} className={`family-picker-chevron${familyMenuOpen ? ' rotated' : ''}`} />
              </button>

              <AnimatePresence>
                {familyMenuOpen && (
                  <motion.div
                    className="family-picker-popover"
                    role="dialog"
                    aria-label="Chọn không gian gia đình"
                    initial={{ opacity: 0, y: 6, scale: .98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: .98 }}
                    transition={{ duration: .15 }}
                  >
                    <div className="family-picker-heading">
                      <div>
                        <b>Không gian gia đình</b>
                        <small>Chọn nơi bạn muốn làm việc</small>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFamilyMenuOpen(false)}
                        aria-label="Đóng"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {families.length > 3 && (
                      <label className="family-picker-search" aria-label="Tìm gia đình">
                        <Search size={14} aria-hidden="true" />
                        <input
                          type="search"
                          value={familySearch}
                          onChange={(e) => setFamilySearch(e.target.value)}
                          placeholder="Tìm gia đình…"
                          autoFocus
                        />
                      </label>
                    )}

                    <div className="family-picker-list" role="listbox" aria-label="Danh sách gia đình">
                      {familiesLoading ? (
                        <div className="family-picker-empty">Đang tải danh sách…</div>
                      ) : filteredFamilies.length ? (
                        filteredFamilies.map((f) => (
                          <button
                            type="button"
                            key={f.id}
                            role="option"
                            aria-selected={String(f.id) === String(activeFamilyId)}
                            className={`family-picker-option${String(f.id) === String(activeFamilyId) ? ' selected' : ''}`}
                            onClick={() => { setActiveFamilyId(f.id); setFamilyMenuOpen(false); }}
                          >
                            <span className="family-option-icon"><Home size={15} /></span>
                            <span className="family-option-text">
                              <b>{f.name}</b>
                              <small>{{ OWNER: 'Chủ gia đình', MANAGER: 'Quản lý', MEMBER: 'Thành viên' }[f.myRole] || 'Thành viên'}</small>
                            </span>
                            {String(f.id) === String(activeFamilyId) && <Check size={15} aria-hidden="true" />}
                          </button>
                        ))
                      ) : (
                        <div className="family-picker-empty">
                          {families.length ? 'Không tìm thấy gia đình phù hợp.' : 'Bạn chưa tham gia gia đình nào.'}
                        </div>
                      )}
                    </div>

                    <div className="family-picker-footer">
                      <Link to="/app/family" onClick={() => setFamilyMenuOpen(false)}>
                        <Plus size={14} />
                        {families.length ? 'Quản lý không gian gia đình' : 'Tạo gia đình mới'}
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Notification */}
            <button type="button" className="icon-button notification" aria-label="Thông báo" aria-haspopup="true">
              <Bell size={18} />
              <i aria-hidden="true" />
            </button>

            {/* Profile */}
            <div className="profile-wrap">
              <button
                type="button"
                className="profile-button"
                onClick={() => setProfileOpen((v) => !v)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                aria-label={`Tài khoản của ${name}`}
              >
                <span className="avatar" aria-hidden="true">
                  {name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="profile-text">
                  <b>{name}</b>
                  <small>{user?.role === 'ADMIN' ? 'Quản trị viên' : 'Người dùng'}</small>
                </span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>

              {profileOpen && (
                <div
                  className="profile-menu"
                  role="menu"
                  aria-label="Menu tài khoản"
                  onClick={() => setProfileOpen(false)}
                >
                  <NavLink to="/app/profile" role="menuitem">
                    <UserCircle size={15} /> Hồ sơ cá nhân
                  </NavLink>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setConfirm(true)}
                  >
                    <LogOut size={15} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <section className="page-content" key={location.pathname}>
          {showFamilyWaiting ? (
            <motion.div
              className="family-required-state"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: .3 }}
            >
              <div className="family-required-card">
                <span className="family-required-icon"><Users size={24} /></span>
                <span className="family-required-kicker">Bắt đầu cùng FinHome</span>
                <h1>Bạn chưa tham gia gia đình nào</h1>
                <p>
                  Để xem và quản lý dữ liệu tài chính, hãy tạo không gian gia đình
                  mới hoặc chờ lời mời tham gia từ người thân.
                </p>
                <div className="family-required-actions">
                  <Link className="family-required-primary" to="/app/family">
                    <Plus size={16} /> Tạo gia đình mới
                  </Link>
                  <Link className="family-required-secondary" to="/app/members">
                    <Users size={15} /> Xem lời mời
                  </Link>
                </div>
                <div className="family-required-foot">
                  <Sparkles size={13} />
                  Các tính năng sẽ xuất hiện khi bạn tham gia gia đình.
                </div>
              </div>
            </motion.div>
          ) : children}
        </section>
      </main>

      {/* ── Logout Confirm Modal ─────────────────────────────── */}
      <AnimatePresence>
        {confirm && (
          <motion.div
            className="modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: .18 }}
          >
            <motion.div
              className="confirm-modal"
              initial={{ y: 14, scale: .97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 10, scale: .98 }}
              transition={{ duration: .18 }}
            >
              <div className="modal-icon"><LogOut size={21} /></div>
              <h3 id="logout-modal-title">Đăng xuất khỏi FinHome?</h3>
              <p>Phiên làm việc hiện tại sẽ kết thúc. Bạn có thể đăng nhập lại bất cứ lúc nào.</p>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setConfirm(false)}>
                  Ở lại
                </button>
                <button type="button" className="btn-danger" onClick={() => logout()}>
                  Đăng xuất
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
