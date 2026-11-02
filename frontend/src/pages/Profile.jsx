import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, CalendarDays, Eye, EyeOff, KeyRound, Lock, Mail, Save, ShieldCheck, UserRound, Users, CheckCircle2 } from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { getErrorMessage, profileApi } from '../services/familyFinanceApi';
import { useToast } from '../context/ToastContext';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const formatDate = (value) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long' }).format(new Date(value)) : 'Chưa có dữ liệu';
const roleName = (role) => role === 'ROLE_ADMIN' || role === 'ADMIN' ? 'Quản trị viên' : 'Người dùng';
const familyRoleName = (role) => ({ OWNER: 'Chủ gia đình', MANAGER: 'Quản lý', MEMBER: 'Thành viên' }[role] || role || 'Thành viên');

function PasswordField({ label, value, onChange, visible, onToggle, autoComplete }) {
  return <label className="block">
    <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
    <span className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-50">
      <Lock size={17} className="text-slate-400"/>
      <input className="min-w-0 flex-1 bg-transparent text-sm outline-none" type={visible ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} required/>
      <button type="button" onClick={onToggle} className="text-slate-400 hover:text-slate-700" aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
    </span>
  </label>;
}

export default function Profile() {
  const { user, login } = useAuth();
  const toast = useToast();
  const { families, familiesLoading, refreshFamilies } = useFamily();
  const [profile, setProfile] = useState({ username: '', fullName: '', email: '', role: '', createdAt: '' });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [visibility, setVisibility] = useState({ current: false, next: false, confirm: false });

  useEffect(() => {
    let alive = true;
    profileApi.get().then((data) => {
      if (!alive) return;
      setProfile({ username: data.username || '', fullName: data.fullName || '', email: data.email || '', role: data.role || user?.role || '', createdAt: data.createdAt || '' });
    }).catch((error) => alive && toast(getErrorMessage(error, 'Không thể tải hồ sơ cá nhân.'), 'error'))
      .finally(() => alive && setProfileLoading(false));
    return () => { alive = false; };
  }, [toast]);

  const strength = useMemo(() => {
    const p = password.newPassword;
    return [p.length >= 8, /[a-z]/.test(p) && /[A-Z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
  }, [password.newPassword]);
  const strengthLabel = ['Chưa có', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'][strength];

  async function saveProfile(event) {
    event.preventDefault();
    const fullName = profile.fullName.trim(); const email = profile.email.trim();
    if (fullName.length < 2) return toast('Họ và tên phải có ít nhất 2 ký tự.', 'error');
    if (!emailPattern.test(email)) return toast('Email chưa đúng định dạng.', 'error');
    setProfileSaving(true);
    try {
      const data = await profileApi.update({ fullName, email });
      const updated = { ...profile, ...data, fullName: data.fullName ?? fullName, email: data.email ?? email };
      setProfile(updated);
      // Keep the global header/avatar in sync without changing the immutable username.
      if (user) {
        const storedToken = localStorage.getItem('pfm.accessToken') || sessionStorage.getItem('pfm.accessToken');
        const storedRefresh = localStorage.getItem('pfm.refreshToken') || sessionStorage.getItem('pfm.refreshToken');
        login(storedToken, { ...user, fullName: updated.fullName, email: updated.email }, storedRefresh, Boolean(localStorage.getItem('pfm.accessToken')));
      }
      toast('Thông tin hồ sơ đã được cập nhật.', 'success');
    } catch (error) { toast(getErrorMessage(error, 'Không thể cập nhật hồ sơ.'), 'error'); }
    finally { setProfileSaving(false); }
  }

  async function changePassword(event) {
    event.preventDefault();
    if (password.newPassword.length < 6) return toast('Mật khẩu mới cần tối thiểu 6 ký tự.', 'error');
    if (password.newPassword !== password.confirmPassword) return toast('Mật khẩu xác nhận không khớp.', 'error');
    setPasswordSaving(true);
    try {
      await profileApi.changePassword(password);
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast('Mật khẩu đã được cập nhật.', 'success');
    } catch (error) { toast(getErrorMessage(error, 'Không thể đổi mật khẩu.'), 'error'); }
    finally { setPasswordSaving(false); }
  }

  if (profileLoading) return <div className="flex min-h-80 items-center justify-center text-sm text-slate-500"><span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"/>Đang tải hồ sơ…</div>;

  return <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl space-y-6">
    <header><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Tài khoản của bạn</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Hồ sơ cá nhân</h1><p className="mt-2 text-sm text-slate-500">Quản lý thông tin đăng nhập và bảo mật tài khoản FinHome.</p></header>

    <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50 p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <UserAvatar name={profile.fullName || profile.username} size="xl" className="rounded-3xl shadow-sm"/>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-extrabold text-slate-900">{profile.fullName || 'Chưa cập nhật họ tên'}</h2><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800"><BadgeCheck size={13} className="mr-1 inline"/>{roleName(profile.role)}</span></div>
          <p className="mt-1 text-sm text-slate-500">@{profile.username || 'unknown'} · {profile.email || 'Chưa có email'}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><CalendarDays size={14}/>Tham gia: {formatDate(profile.createdAt)}</span><span className="inline-flex items-center gap-1.5"><ShieldCheck size={14}/>Tài khoản FinHome</span></div>
        </div>
      </div>
    </section>

    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><UserRound size={19}/></span><div><h3 className="font-bold text-slate-900">Thông tin tài khoản</h3><p className="text-xs text-slate-500">Username không thể thay đổi.</p></div></div>
        <form onSubmit={saveProfile} className="space-y-4">
          <label className="block"><span className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700">Tên đăng nhập <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500"><Lock size={11}/>Đã khóa</span></span><input value={profile.username} readOnly disabled className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-500"/></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Họ và tên</span><input value={profile.fullName} onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))} maxLength={100} required className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"/></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Email</span><span className="relative block"><Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} maxLength={100} required className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"/></span></label>
          <button disabled={profileSaving} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"><Save size={16}/>{profileSaving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><KeyRound size={19}/></span><div><h3 className="font-bold text-slate-900">Đổi mật khẩu</h3><p className="text-xs text-slate-500">Dùng mật khẩu mạnh và không trùng mật khẩu cũ.</p></div></div>
        <form onSubmit={changePassword} className="space-y-4">
          <PasswordField label="Mật khẩu hiện tại" value={password.currentPassword} onChange={(e) => setPassword((p) => ({ ...p, currentPassword: e.target.value }))} visible={visibility.current} onToggle={() => setVisibility((v) => ({ ...v, current: !v.current }))} autoComplete="current-password"/>
          <PasswordField label="Mật khẩu mới" value={password.newPassword} onChange={(e) => setPassword((p) => ({ ...p, newPassword: e.target.value }))} visible={visibility.next} onToggle={() => setVisibility((v) => ({ ...v, next: !v.next }))} autoComplete="new-password"/>
          <div><div className="mb-2 flex items-center justify-between text-xs text-slate-500"><span>Độ mạnh mật khẩu</span><b className="text-slate-700">{strengthLabel}</b></div><div className="grid grid-cols-4 gap-1.5">{[1,2,3,4].map((n) => <span key={n} className={`h-1.5 rounded-full ${strength >= n ? 'bg-emerald-500' : 'bg-slate-100'}`}/>)}</div></div>
          <PasswordField label="Xác nhận mật khẩu mới" value={password.confirmPassword} onChange={(e) => setPassword((p) => ({ ...p, confirmPassword: e.target.value }))} visible={visibility.confirm} onToggle={() => setVisibility((v) => ({ ...v, confirm: !v.confirm }))} autoComplete="new-password"/>
          {password.confirmPassword && <p className={`text-xs ${password.confirmPassword === password.newPassword ? 'text-emerald-700' : 'text-rose-600'}`}>{password.confirmPassword === password.newPassword ? 'Hai mật khẩu khớp nhau.' : 'Mật khẩu xác nhận chưa khớp.'}</p>}
          <button disabled={passwordSaving} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-white px-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-60"><KeyRound size={16}/>{passwordSaving ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}</button>
        </form>
      </section>
    </div>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700"><Users size={19}/></span><div><h3 className="font-bold text-slate-900">Gia đình đang tham gia</h3><p className="text-xs text-slate-500">Vai trò của bạn trong từng không gian.</p></div></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{families.length} gia đình</span></div>
      {familiesLoading ? <p className="py-6 text-center text-sm text-slate-400">Đang tải danh sách gia đình…</p> : families.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">Bạn chưa tham gia gia đình nào.</div> : <div className="grid gap-3 sm:grid-cols-2">{families.map((family) => <div key={family.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Users size={18}/></span><span className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-800">{family.name}</b><small className="text-xs text-slate-500">{familyRoleName(family.myRole)}</small></span></div>)}</div>}
      <button type="button" onClick={() => refreshFamilies().catch(() => {})} className="mt-4 text-xs font-bold text-emerald-700 hover:text-emerald-900">Làm mới danh sách</button>
    </section>
  </motion.div>;
}
