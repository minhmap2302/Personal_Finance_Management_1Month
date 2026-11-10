import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  CalendarDays,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Home,
  Crown,
  Shield,
  Sparkles,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import UserAvatar from '../components/UserAvatar';
import { Button, Badge, Card, Input } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { getErrorMessage, profileApi } from '../services/familyFinanceApi';
import { useToast } from '../context/ToastContext';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long' }).format(
        new Date(value)
      )
    : 'Chưa có dữ liệu';

const roleName = (role) =>
  role === 'ROLE_ADMIN' || role === 'ADMIN' ? 'Quản trị viên' : 'Người dùng';

const familyRoleMeta = {
  OWNER: { label: 'Chủ gia đình', variant: 'amber', icon: Crown },
  MANAGER: { label: 'Quản lý', variant: 'sky', icon: Shield },
  MEMBER: { label: 'Thành viên', variant: 'slate', icon: null },
};

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
  placeholder = '••••••••',
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          icon={Lock}
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none transition-colors"
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, login } = useAuth();
  const toast = useToast();
  const { families, familiesLoading, refreshFamilies } = useFamily();

  const [profile, setProfile] = useState({
    username: '',
    fullName: '',
    email: '',
    role: '',
    createdAt: '',
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [password, setPassword] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [visibility, setVisibility] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  useEffect(() => {
    let alive = true;
    profileApi
      .get()
      .then((data) => {
        if (!alive) return;
        setProfile({
          username: data.username || '',
          fullName: data.fullName || '',
          email: data.email || '',
          role: data.role || user?.role || '',
          createdAt: data.createdAt || '',
        });
      })
      .catch((error) =>
        alive && toast(getErrorMessage(error, 'Không thể tải hồ sơ cá nhân.'), 'error')
      )
      .finally(() => alive && setProfileLoading(false));

    return () => {
      alive = false;
    };
  }, [toast, user?.role]);

  const strength = useMemo(() => {
    const p = password.newPassword;
    return [
      p.length >= 8,
      /[a-z]/.test(p) && /[A-Z]/.test(p),
      /\d/.test(p),
      /[^A-Za-z0-9]/.test(p),
    ].filter(Boolean).length;
  }, [password.newPassword]);

  const strengthLabels = ['Chưa có', 'Yếu', 'Trung bình', 'Khá', 'Rất mạnh'];
  const strengthColors = [
    'bg-slate-200 dark:bg-slate-700',
    'bg-rose-500',
    'bg-amber-500',
    'bg-sky-500',
    'bg-emerald-500',
  ];

  async function saveProfile(event) {
    event.preventDefault();
    const fullName = profile.fullName.trim();
    const email = profile.email.trim();

    if (fullName.length < 2)
      return toast('Họ và tên phải có ít nhất 2 ký tự.', 'error');
    if (!emailPattern.test(email))
      return toast('Email chưa đúng định dạng.', 'error');

    setProfileSaving(true);
    try {
      const data = await profileApi.update({ fullName, email });
      const updated = {
        ...profile,
        ...data,
        fullName: data.fullName ?? fullName,
        email: data.email ?? email,
      };
      setProfile(updated);

      // Đồng bộ thông tin user trong context để Header/Avatar cập nhật ngay
      if (user) {
        const storedToken =
          localStorage.getItem('pfm.accessToken') ||
          sessionStorage.getItem('pfm.accessToken');
        const storedRefresh =
          localStorage.getItem('pfm.refreshToken') ||
          sessionStorage.getItem('pfm.refreshToken');
        login(
          storedToken,
          { ...user, fullName: updated.fullName, email: updated.email },
          storedRefresh,
          Boolean(localStorage.getItem('pfm.accessToken'))
        );
      }
      toast('Thông tin hồ sơ đã được cập nhật thành công.', 'success');
    } catch (error) {
      toast(getErrorMessage(error, 'Không thể cập nhật hồ sơ.'), 'error');
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    if (password.newPassword.length < 6)
      return toast('Mật khẩu mới cần tối thiểu 6 ký tự.', 'error');
    if (password.newPassword !== password.confirmPassword)
      return toast('Mật khẩu xác nhận không khớp.', 'error');

    setPasswordSaving(true);
    try {
      await profileApi.changePassword(password);
      setPassword({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      toast('Mật khẩu đã được thay đổi thành công.', 'success');
    } catch (error) {
      toast(getErrorMessage(error, 'Không thể đổi mật khẩu.'), 'error');
    } finally {
      setPasswordSaving(false);
    }
  }

  if (profileLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p>Đang tải dữ liệu hồ sơ cá nhân…</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Tiêu đề trang */}
      <PageHeader
        title="Hồ sơ cá nhân"
        subtitle="Quản lý thông tin tài khoản, cài đặt bảo mật và các không gian gia đình của bạn"
        breadcrumbs={[{ label: 'Tài khoản' }, { label: 'Hồ sơ cá nhân' }]}
        badge="FinHome V3"
      />

      {/* Hero Profile Banner */}
      <Card className="border-emerald-200/70 dark:border-emerald-900/50 bg-gradient-to-br from-white via-emerald-50/25 to-white dark:from-slate-900 dark:via-emerald-950/15 dark:to-slate-900">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative">
            <UserAvatar
              name={profile.fullName || profile.username}
              size="xl"
              className="ring-4 ring-emerald-500/20 dark:ring-emerald-500/30"
            />
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 text-white grid place-items-center ring-2 ring-white dark:ring-slate-900">
              <ShieldCheck size={14} />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {profile.fullName || 'Chưa cập nhật họ tên'}
              </h2>
              <Badge variant="emerald" size="sm" icon={BadgeCheck} dot>
                {roleName(profile.role)}
              </Badge>
            </div>

            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-mono">
              @{profile.username || 'unknown'} •{' '}
              <span className="font-sans text-slate-600 dark:text-slate-300">
                {profile.email || 'Chưa có email'}
              </span>
            </p>

            <div className="mt-3.5 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={14} className="text-slate-400" />
                Tham gia: {formatDate(profile.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                Bảo vệ bởi FinHome Security
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Grid 2 cột: Cập nhật thông tin & Đổi mật khẩu */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cột 1: Thông tin tài khoản */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 grid place-items-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/40">
              <UserRound size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Thông tin cá nhân
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cập nhật họ tên hiển thị và địa chỉ email nhận thông báo.
              </p>
            </div>
          </div>

          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tên đăng nhập
                </label>
                <Badge variant="slate" size="sm" icon={Lock}>
                  Cố định
                </Badge>
              </div>
              <Input
                value={profile.username}
                readOnly
                disabled
                icon={Lock}
                className="opacity-75 cursor-not-allowed bg-slate-50 dark:bg-slate-800/70 font-mono"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Tên đăng nhập là định danh cố định trong hệ thống và không thể thay đổi.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Họ và tên hiển thị <span className="text-rose-500">*</span>
              </label>
              <Input
                value={profile.fullName}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, fullName: e.target.value }))
                }
                maxLength={100}
                required
                icon={UserRound}
                placeholder="Nhập đầy đủ họ và tên…"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Địa chỉ Email <span className="text-rose-500">*</span>
              </label>
              <Input
                type="email"
                value={profile.email}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, email: e.target.value }))
                }
                maxLength={100}
                required
                icon={Mail}
                placeholder="user@example.com"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                icon={Save}
                loading={profileSaving}
                disabled={profileSaving}
              >
                {profileSaving ? 'Đang lưu…' : 'Lưu thay đổi'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Cột 2: Đổi mật khẩu */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-400 grid place-items-center shrink-0 border border-violet-200/50 dark:border-violet-800/40">
              <KeyRound size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Bảo mật & Đổi mật khẩu
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tối thiểu 6 ký tự, khuyến nghị kết hợp chữ hoa, chữ thường và số.
              </p>
            </div>
          </div>

          <form onSubmit={changePassword} className="space-y-4">
            <PasswordField
              label="Mật khẩu hiện tại"
              value={password.currentPassword}
              onChange={(e) =>
                setPassword((p) => ({ ...p, currentPassword: e.target.value }))
              }
              visible={visibility.current}
              onToggle={() =>
                setVisibility((v) => ({ ...v, current: !v.current }))
              }
              autoComplete="current-password"
            />

            <PasswordField
              label="Mật khẩu mới"
              value={password.newPassword}
              onChange={(e) =>
                setPassword((p) => ({ ...p, newPassword: e.target.value }))
              }
              visible={visibility.next}
              onToggle={() =>
                setVisibility((v) => ({ ...v, next: !v.next }))
              }
              autoComplete="new-password"
            />

            {/* Thước đo độ mạnh mật khẩu */}
            {password.newPassword && (
              <div className="space-y-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Độ an toàn:
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {strengthLabels[strength]}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((tier) => (
                    <div
                      key={tier}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        strength >= tier
                          ? strengthColors[strength]
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            <PasswordField
              label="Xác nhận mật khẩu mới"
              value={password.confirmPassword}
              onChange={(e) =>
                setPassword((p) => ({ ...p, confirmPassword: e.target.value }))
              }
              visible={visibility.confirm}
              onToggle={() =>
                setVisibility((v) => ({ ...v, confirm: !v.confirm }))
              }
              autoComplete="new-password"
            />

            {password.confirmPassword && (
              <div className="text-xs">
                {password.confirmPassword === password.newPassword ? (
                  <p className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 size={14} />
                    Mật khẩu xác nhận trùng khớp
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                    <AlertCircle size={14} />
                    Mật khẩu xác nhận chưa khớp
                  </p>
                )}
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                icon={KeyRound}
                loading={passwordSaving}
                disabled={passwordSaving}
              >
                {passwordSaving ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Card: Các không gian gia đình đang tham gia */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-400 grid place-items-center shrink-0 border border-sky-200/50 dark:border-sky-800/40">
              <Users size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Không gian gia đình đang tham gia
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Các gia đình bạn đang góp mặt và vai trò của bạn trong từng không gian.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="sky" size="md">
              {families.length} gia đình
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={() => refreshFamilies().catch(() => {})}
            >
              Làm mới
            </Button>
          </div>
        </div>

        {familiesLoading ? (
          <div className="py-8 text-center text-sm text-slate-400">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent mb-2" />
            <p>Đang tải danh sách gia đình…</p>
          </div>
        ) : families.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-8 text-center text-sm text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/40">
            <Home size={24} className="mx-auto text-slate-400 mb-2" />
            <p className="font-medium text-slate-700 dark:text-slate-300">
              Bạn chưa tham gia không gian gia đình nào
            </p>
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                icon={ArrowRight}
                onClick={() => {
                  window.location.href = '/app/family';
                }}
              >
                Tạo hoặc tham gia gia đình
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {families.map((family) => {
              const meta =
                familyRoleMeta[family.myRole] || familyRoleMeta.MEMBER;

              return (
                <div
                  key={family.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 grid place-items-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/40">
                      <Home size={16} />
                    </div>
                    <div className="min-w-0">
                      <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {family.name}
                      </h5>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {family.memberCount ?? 0} thành viên
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant={meta.variant}
                    size="sm"
                    icon={meta.icon}
                  >
                    {meta.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
