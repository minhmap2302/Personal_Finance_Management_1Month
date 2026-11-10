import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogoMark from '../components/BrandLogoMark';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [show, setShow]             = useState(false);
  const [remember, setRemember]     = useState(true);
  const [busy, setBusy]             = useState(false);
  const [error, setError]           = useState('');

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function submit(e) {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError('Vui lòng nhập tên đăng nhập/email và mật khẩu.');
      return;
    }

    setBusy(true);

    try {
      await signIn(identifier.trim(), password, remember);
      navigate(
        location.state?.from?.pathname || '/app/dashboard',
        { replace: true }
      );
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page relative">
      {/* Top right Theme toggle */}
      <div className="absolute top-5 right-5 z-30">
        <ThemeToggle />
      </div>

      {/* Left visual section */}
      <motion.section
        className="auth-visual"
        aria-label="Giới thiệu FinHome"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link to="/" className="auth-brand" aria-label="FinHome — Trang chủ">
          <BrandLogoMark />
          <span>
            <b>FinHome</b>
            <small>QUẢN LÝ TÀI CHÍNH GIA ĐÌNH</small>
          </span>
        </Link>

        <div className="visual-copy">
          <span className="eyebrow">
            <Sparkles size={13} aria-hidden="true" />
            TÀI CHÍNH THÔNG MINH, SỐNG AN TÂM
          </span>

          <h1>
            Cùng nhau xây dựng
            <br />
            <em>tương lai thịnh vượng.</em>
          </h1>

          <p>
            Mọi mục tiêu lớn đều bắt đầu từ những quyết định
            tài chính nhỏ được ghi nhận mỗi ngày.
          </p>

          <div className="visual-stat-row">
            <div className="visual-stat">
              <span className="stat-icon" aria-hidden="true">
                <Wallet size={18} />
              </span>
              <span>
                <b>Rõ ràng từng khoản chi</b>
                <small>Chủ động quản lý ngân sách tháng</small>
              </span>
            </div>

            <div className="visual-stat">
              <span className="stat-icon" aria-hidden="true">
                <ShieldCheck size={18} />
              </span>
              <span>
                <b>An tâm cùng gia đình</b>
                <small>Minh bạch và bảo vệ sự riêng tư</small>
              </span>
            </div>
          </div>
        </div>

        <div className="visual-orb orb-one" aria-hidden="true" />
        <div className="visual-orb orb-two" aria-hidden="true" />

        <div className="auth-visual-footer">
          © 2026 FinHome
          <span>•</span>
          Tổ ấm vững vàng, tài chính vững chắc
        </div>
      </motion.section>

      {/* Right form section */}
      <section className="auth-form-side" aria-labelledby="login-title">
        <motion.div
          className="auth-form-wrap"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45 }}
        >
          {/* Mobile logo: click to return home */}
          <Link
            to="/"
            className="mobile-auth-brand"
            aria-label="Quay về trang chủ FinHome"
          >
            <BrandLogoMark />
            <b>FinHome</b>
          </Link>

          <span className="form-kicker">
            CHÀO MỪNG BẠN TRỞ LẠI
          </span>

          <h2 id="login-title">Đăng nhập</h2>

          <p className="form-subtitle">
            Tiếp tục hành trình quản lý tài chính gia đình cùng FinHome.
          </p>

          {/* Registration success alert */}
          {location.state?.registered && (
            <div
              className="mb-4 rounded-xl border border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-800/60 dark:bg-emerald-950/40 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2"
              role="status"
            >
              <CheckCircle2 size={16} className="text-primary shrink-0" aria-hidden="true" />
              <span>Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.</span>
            </div>
          )}

          {error && (
            <div className="alert-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="auth-form" aria-label="Form đăng nhập">
            <label htmlFor="identifier">
              Tên đăng nhập hoặc Email
            </label>

            <div className="input-wrap">
              <Mail size={17} aria-hidden="true" />
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                placeholder="Nhập tên đăng nhập hoặc email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>

            <div className="label-row">
              <label htmlFor="password">
                Mật khẩu
              </label>
            </div>

            <div className="input-wrap">
              <LockKeyhole size={17} aria-hidden="true" />
              <input
                id="password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Nhập mật khẩu của bạn"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="input-action"
                onClick={() => setShow(!show)}
                aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            <label className="check-row">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Ghi nhớ phiên đăng nhập</span>
            </label>

            <button
              type="submit"
              className="btn-primary auth-submit"
              disabled={busy}
            >
              {busy ? (
                <>
                  <span className="button-spinner" aria-hidden="true" />
                  <span>Đang đăng nhập…</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập</span>
                  <ArrowRight size={17} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="auth-switch">
            Chưa có tài khoản?{' '}
            <Link to="/register">
              Đăng ký ngay
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </p>

          <div className="secure-note">
            <ShieldCheck size={14} aria-hidden="true" />
            <span>Thông tin của bạn được bảo vệ an toàn</span>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
