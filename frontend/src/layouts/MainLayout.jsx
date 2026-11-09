import { useEffect, useMemo, useRef, useState } from 'react';
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
import BrandLogoMark from '../components/BrandLogoMark';
import UserAvatar from '../components/UserAvatar';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';

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

// Sidebar content component — reused in desktop fixed slot and mobile drawer
function SidebarContent({ onNavigate }) {
  return (
    <div className="sidebar">
      {/* Brand */}
      <NavLink
        to="/app/dashboard"
        className="brand"
        onClick={onNavigate}
        aria-label="FinHome — Trang tổng quan"
      >
        <BrandLogoMark />
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
          <span className="help-icon" aria-hidden="true">
            <Sprout size={17} />
          </span>
          <b>Đang đi đúng hướng!</b>
          <p>Mỗi khoản chi rõ ràng là một bước gần hơn tới mục tiêu tài chính.</p>
          <NavLink to="/app/support" onClick={onNavigate}>
            Khám phá mẹo hay ↗
          </NavLink>
        </div>

        <button
          type="button"
          className="nav-link logout-link"
          onClick={onNavigate}
          data-action="logout"
          aria-label="Đăng xuất khỏi FinHome"
        >
          <LogOut size={18} strokeWidth={1.8} />
          <span>Đăng xuất</span>
        </button>

        <div className="side-foot">
          FinHome <span>•</span> v3.0
        </div>
      </div>
    </div>
  );
}

export default function MainLayout({ children }) {
  const [drawer, setDrawer]                 = useState(false);
  const [confirm, setConfirm]               = useState(false);
  const [profileOpen, setProfileOpen]       = useState(false);
  const [familyMenuOpen, setFamilyMenuOpen] = useState(false);
  const [familySearch, setFamilySearch]     = useState('');

  const familyPickerRef = useRef(null);
  const profileMenuRef  = useRef(null);

  const { user, logout } = useAuth();
  const { families, activeFamily, activeFamilyId, setActiveFamilyId, familiesLoading } = useFamily();
  const location = useLocation();

  const name = user?.fullName || user?.username || 'Người dùng';

  // Click outside to close menus & Escape to close all overlays
  useEffect(() => {
    function handleClickOutside(event) {
      if (familyPickerRef.current && !familyPickerRef.current.contains(event.target)) {
        setFamilyMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setFamilyMenuOpen(false);
        setProfileOpen(false);
        setDrawer(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
              transition={{ duration: 0.18 }}
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
                type="button"
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
            <div className="family-picker-wrap" ref={familyPickerRef}>
              <button
                type="button"
                className={`family-picker-trigger${familyMenuOpen ? ' is-open' : ''}`}
                onClick={() => {
                  setFamilyMenuOpen((v) => !v);
                  setFamilySearch('');
                }}
                aria-expanded={familyMenuOpen}
                aria-haspopup="listbox"
                aria-label="Chọn không gian gia đình"
              >
                <span className="family-avatar" aria-hidden="true">
                  <Home size={15} />
                </span>
                <span className="family-picker-copy">
                  <small>KHÔNG GIAN HIỆN TẠI</small>
                  <b>{activeFamily?.name || (families.length ? 'Chọn gia đình' : 'Chưa có gia đình')}</b>
                </span>
                <ChevronDown
                  size={14}
                  className={`family-picker-chevron${familyMenuOpen ? ' rotated' : ''}`}
                  aria-hidden="true"
                />
              </button>

              <AnimatePresence>
                {familyMenuOpen && (
                  <motion.div
                    className="family-picker-popover"
                    role="dialog"
                    aria-label="Chọn không gian gia đình"
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="family-picker-heading">
                      <div>
                        <b>Không gian gia đình</b>
                        <small>Chọn nơi bạn muốn theo dõi tài chính</small>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFamilyMenuOpen(false)}
                        aria-label="Đóng"
                        className="p-1 rounded-md text-fin-muted hover:text-fin-text hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
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
                          placeholder="Tìm kiếm gia đình…"
                          autoFocus
                        />
                      </label>
                    )}

                    <div className="family-picker-list" role="listbox" aria-label="Danh sách gia đình">
                      {familiesLoading ? (
                        <div className="family-picker-empty">Đang tải danh sách…</div>
                      ) : filteredFamilies.length ? (
                        filteredFamilies.map((f) => {
                          const isSelected = String(f.id) === String(activeFamilyId);
                          const roleMeta = {
                            OWNER:   { label: 'Chủ gia đình', variant: 'amber' },
                            MANAGER: { label: 'Quản lý',       variant: 'sky' },
                            MEMBER:  { label: 'Thành viên',    variant: 'slate' },
                          }[f.myRole] || { label: 'Thành viên', variant: 'slate' };

                          return (
                            <button
                              type="button"
                              key={f.id}
                              role="option"
                              aria-selected={isSelected}
                              className={`family-picker-option${isSelected ? ' selected' : ''}`}
                              onClick={() => {
                                setActiveFamilyId(f.id);
                                setFamilyMenuOpen(false);
                              }}
                            >
                              <span className="family-option-icon" aria-hidden="true">
                                <Home size={15} />
                              </span>
                              <span className="family-option-text">
                                <b>{f.name}</b>
                                <Badge variant={roleMeta.variant} size="sm" className="mt-0.5 w-fit">
                                  {roleMeta.label}
                                </Badge>
                              </span>
                              {isSelected && (
                                <Check size={16} className="text-primary shrink-0 ml-auto" aria-hidden="true" />
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="family-picker-empty">
                          {families.length ? 'Không tìm thấy gia đình phù hợp.' : 'Bạn chưa tham gia gia đình nào.'}
                        </div>
                      )}
                    </div>

                    <div className="family-picker-footer">
                      <Link
                        to="/app/family"
                        onClick={() => setFamilyMenuOpen(false)}
                        className="flex items-center gap-2"
                      >
                        <Plus size={14} />
                        <span>{families.length ? 'Quản lý không gian gia đình' : 'Tạo gia đình mới'}</span>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Notification */}
            <button
              type="button"
              className="icon-button notification"
              aria-label="Thông báo"
              title="Thông báo"
            >
              <Bell size={18} />
              <i aria-hidden="true" />
            </button>

            {/* Profile Menu */}
            <div className="profile-wrap" ref={profileMenuRef}>
              <button
                type="button"
                className="profile-button"
                onClick={() => setProfileOpen((v) => !v)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                aria-label={`Tài khoản của ${name}`}
              >
                <UserAvatar
                  name={name}
                  seed={user?.id || user?.email || name}
                  size="sm"
                  title={name}
                />
                <span className="profile-text">
                  <b>{name}</b>
                  <small>{user?.role === 'ADMIN' ? 'Quản trị viên' : 'Người dùng'}</small>
                </span>
                <ChevronDown
                  size={14}
                  className={`text-fin-muted transition-transform duration-150 ${profileOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    className="profile-menu"
                    role="menu"
                    aria-label="Menu tài khoản"
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* User info banner */}
                    <div className="px-3 py-2.5 mb-1 border-b border-fin-border/60 dark:border-fin-border-dark/60">
                      <p className="text-xs font-bold text-fin-text dark:text-fin-text-dark truncate">
                        {name}
                      </p>
                      {user?.email && (
                        <p className="text-[11px] text-fin-muted truncate mt-0.5">
                          {user.email}
                        </p>
                      )}
                      <div className="mt-1.5">
                        <Badge variant={user?.role === 'ADMIN' ? 'violet' : 'emerald'} size="sm">
                          {user?.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
                        </Badge>
                      </div>
                    </div>

                    <NavLink
                      to="/app/profile"
                      role="menuitem"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-fin-secondary hover:text-fin-text hover:bg-app dark:hover:bg-sidebar-dark transition-colors"
                    >
                      <UserCircle size={15} className="text-primary" />
                      <span>Hồ sơ cá nhân</span>
                    </NavLink>

                    <NavLink
                      to="/app/family"
                      role="menuitem"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-fin-secondary hover:text-fin-text hover:bg-app dark:hover:bg-sidebar-dark transition-colors"
                    >
                      <Home size={15} className="text-primary" />
                      <span>Không gian gia đình</span>
                    </NavLink>

                    <div className="my-1 border-t border-fin-border/60 dark:border-fin-border-dark/60" />

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfileOpen(false);
                        setConfirm(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <LogOut size={15} />
                      <span>Đăng xuất</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
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
              transition={{ duration: 0.3 }}
            >
              <div className="family-required-card">
                <span className="family-required-icon" aria-hidden="true">
                  <Users size={24} />
                </span>
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
                  <Sparkles size={13} className="text-primary" />
                  Các tính năng sẽ xuất hiện khi bạn tham gia gia đình.
                </div>
              </div>
            </motion.div>
          ) : (
            children
          )}
        </section>
      </main>

      {/* ── Logout Confirm Dialog (Reusable Phase 1 Component) ── */}
      <ConfirmDialog
        isOpen={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => logout()}
        title="Đăng xuất khỏi FinHome?"
        description="Phiên làm việc hiện tại sẽ kết thúc. Bạn có thể đăng nhập lại bất cứ lúc nào."
        confirmText="Đăng xuất"
        cancelText="Ở lại"
        variant="danger"
        icon={LogOut}
      />
    </div>
  );
}
