import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Search, RefreshCw, Users, UserCheck, UserX, ChevronLeft,
  ChevronRight, Lock, Unlock, Mail, CalendarDays, LogOut
} from 'lucide-react';
import { adminApi, getErrorMessage } from '../services/familyFinanceApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/PfmUI';

const PAGE_SIZE = 10;
const dateText = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN');
};

function StatCard({ icon: Icon, label, value, tone }) {
  return <div className={`admin-stat admin-stat-${tone}`}>
    <span><Icon size={19}/></span>
    <div><small>{label}</small><strong>{value}</strong></div>
  </div>;
}

export default function AdminPage() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [keyword, setKeyword] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [users, setUsers] = useState([]);
  const [pageInfo, setPageInfo] = useState({ totalElements: 0, totalPages: 0, number: 0, size: PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [actionUser, setActionUser] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApi.users({
        keyword: query || undefined,
        page,
        size: PAGE_SIZE,
        sort: 'createdAt,desc',
      });
      const data = response?.content ? response : response?.data?.content ? response.data : response?.data?.data?.content ? response.data.data : {};
      setUsers(Array.isArray(data.content) ? data.content : []);
      setPageInfo({
        totalElements: Number(data.totalElements || 0),
        totalPages: Number(data.totalPages || 0),
        number: Number(data.number ?? page),
        size: Number(data.size || PAGE_SIZE),
      });
    } catch (error) {
      toast(getErrorMessage(error, 'Không thể tải danh sách người dùng.'), 'error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [query, page, toast]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const activeCount = useMemo(() => users.filter((item) => item.enabled).length, [users]);
  const lockedCount = useMemo(() => users.filter((item) => !item.enabled).length, [users]);

  function submitSearch(event) {
    event.preventDefault();
    setPage(0);
    setQuery(keyword.trim());
  }

  async function confirmStatusChange() {
    if (!actionUser) return;
    setBusy(true);
    try {
      if (actionUser.enabled) {
        await adminApi.lock(actionUser.id);
        toast(`Đã khóa tài khoản ${actionUser.username}.`, 'success');
      } else {
        await adminApi.unlock(actionUser.id);
        toast(`Đã mở khóa tài khoản ${actionUser.username}.`, 'success');
      }
      setActionUser(null);
      await loadUsers();
    } catch (error) {
      toast(getErrorMessage(error, 'Không thể thay đổi trạng thái tài khoản.'), 'error');
    } finally {
      setBusy(false);
    }
  }

  const start = pageInfo.totalElements === 0 ? 0 : page * PAGE_SIZE + 1;
  const end = Math.min((page + 1) * PAGE_SIZE, pageInfo.totalElements);

  return <motion.div className="admin-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
    <div className="admin-header">
      <div>
        <div className="admin-eyebrow"><ShieldCheck size={15}/> FINHOME SYSTEM ADMINISTRATION</div>
        <h1>Quản lý người dùng</h1>
        <p>Tìm kiếm, theo dõi trạng thái và quản lý quyền truy cập tài khoản.</p>
      </div>
      <div className="admin-session">
        <span className="admin-session-avatar">{(user?.fullName || user?.username || 'A').slice(0,1).toUpperCase()}</span>
        <span><b>{user?.fullName || user?.username || 'Administrator'}</b><small>Quản trị viên hệ thống</small></span>
        <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            title="Đăng xuất"
            aria-label="Đăng xuất"
        >
          <LogOut size={17}/>
        </button>
      </div>
    </div>

    <div className="admin-stats">
      <StatCard icon={Users} label="Tổng tài khoản" value={pageInfo.totalElements.toLocaleString('vi-VN')} tone="blue"/>
      <StatCard icon={UserCheck} label="Đang hoạt động · trang này" value={activeCount} tone="green"/>
      <StatCard icon={UserX} label="Đang khóa · trang này" value={lockedCount} tone="rose"/>
    </div>

    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div><h2>Danh sách tài khoản</h2><p>Tìm theo tên đăng nhập hoặc email. Mỗi trang hiển thị {PAGE_SIZE} người dùng.</p></div>
        <button className="admin-refresh" type="button" onClick={loadUsers} disabled={loading}><RefreshCw size={16} className={loading ? 'admin-spin' : ''}/> Làm mới</button>
      </div>

      <form className="admin-search" onSubmit={submitSearch}>
        <label><Search size={17}/><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm username hoặc email..." /></label>
        <button type="submit">Tìm kiếm</button>
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Người dùng</th><th>Email</th><th>Vai trò</th><th>Ngày tạo</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan="6"><div className="admin-table-state"><RefreshCw size={18} className="admin-spin"/> Đang tải danh sách người dùng...</div></td></tr>
              : users.length === 0 ? <tr><td colSpan="6"><div className="admin-table-state">Không tìm thấy người dùng phù hợp.</div></td></tr>
              : users.map((item) => <tr key={item.id}>
                <td><div className="admin-user"><span className="admin-user-avatar">{(item.fullName || item.username || '?').trim().slice(0,1).toUpperCase()}</span><span><b>{item.fullName || item.username}</b><small>@{item.username} · ID #{item.id}</small></span></div></td>
                <td><span className="admin-email"><Mail size={14}/>{item.email}</span></td>
                <td><span className={`admin-role ${item.role === 'ADMIN' ? 'admin-role-admin' : 'admin-role-user'}`}>{item.role === 'ADMIN' ? 'ADMIN' : 'USER'}</span></td>
                <td><span className="admin-date"><CalendarDays size={14}/>{dateText(item.createdAt)}</span></td>
                <td><span className={`admin-status ${item.enabled ? 'is-enabled' : 'is-locked'}`}><i/>{item.enabled ? 'Đang hoạt động' : 'Đã khóa'}</span></td>
                <td><button type="button" className={`admin-action ${item.enabled ? 'do-lock' : 'do-unlock'}`} onClick={() => setActionUser(item)} disabled={item.role === 'ADMIN'} title={item.role === 'ADMIN' ? 'Không thể khóa tài khoản quản trị' : item.enabled ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}>{item.enabled ? <><Lock size={15}/> Khóa</> : <><Unlock size={15}/> Mở khóa</>}</button></td>
              </tr>)}
          </tbody>
        </table>
      </div>

      <div className="admin-pagination">
        <span>Hiển thị <b>{start}–{end}</b> trong <b>{pageInfo.totalElements}</b> tài khoản</span>
        <div>
          <button type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page <= 0 || loading} aria-label="Trang trước"><ChevronLeft size={17}/></button>
          <span>Trang <b>{pageInfo.totalPages ? page + 1 : 0}</b> / {pageInfo.totalPages}</span>
          <button type="button" onClick={() => setPage((value) => Math.min(pageInfo.totalPages - 1, value + 1))} disabled={loading || page + 1 >= pageInfo.totalPages} aria-label="Trang sau"><ChevronRight size={17}/></button>
        </div>
      </div>
    </section>

    <div className="admin-security-note"><ShieldCheck size={18}/><span><b>Kiểm soát an toàn</b> — Khóa tài khoản sẽ thu hồi refresh token hiện tại và chặn đăng nhập mới. Tài khoản ADMIN không thể bị khóa từ màn hình này.</span></div>

    {actionUser && <ConfirmDialog
      onCancel={() => !busy && setActionUser(null)}
      onConfirm={confirmStatusChange}
      title={actionUser.enabled ? 'Khóa tài khoản này?' : 'Mở khóa tài khoản này?'}
      description={actionUser.enabled
        ? `Bạn sắp khóa tài khoản ${actionUser.username}. Người dùng sẽ bị chặn đăng nhập và các refresh token sẽ bị thu hồi. Nếu họ đang là chủ gia đình, Backend sẽ xử lý bàn giao quyền sở hữu trước khi khóa.`
        : `Bạn sắp mở khóa tài khoản ${actionUser.username}. Người dùng có thể đăng nhập lại sau khi thao tác thành công.`}
      confirmText={actionUser.enabled ? 'Xác nhận khóa' : 'Mở khóa tài khoản'}
      busy={busy}
    />}
    {showLogoutConfirm && (
        <ConfirmDialog
            title="Xác nhận đăng xuất?"
            description="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản quản trị viên? Phiên làm việc hiện tại sẽ kết thúc và bạn cần đăng nhập lại để tiếp tục quản trị hệ thống."
            onCancel={() => setShowLogoutConfirm(false)}
            onConfirm={() => {
              setShowLogoutConfirm(false);
              logout();
            }}
            confirmText="Đăng xuất"
            busy={false}
        />
    )}
  </motion.div>;
}
