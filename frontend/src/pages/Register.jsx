import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogoMark from '../components/BrandLogoMark';
import ThemeToggle from '../components/ThemeToggle';

export default function Register() {
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    confirm: '',
  });

  const [show, setShow]     = useState(false);
  const [terms, setTerms]   = useState(false);
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState('');

  const navigate = useNavigate();
  const { register } = useAuth();

  const set = (key, value) => {
    setForm((old) => ({
      ...old,
      [key]: value,
    }));
  };

  const strength = useMemo(() => {
    const p = form.password;
    let n = 0;

    if (p.length >= 8) n++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) n++;
    if (/\d/.test(p)) n++;
    if (/[^A-Za-z0-9]/.test(p)) n++;

    return n;
  }, [form.password]);

  const strengthMeta = [
    { label: 'Chưa có',   color: 'var(--text-muted)' },
    { label: 'Yếu',       color: 'var(--color-danger)' },
    { label: 'Trung bình', color: 'var(--color-warning)' },
    { label: 'Khá',       color: 'var(--color-info)' },
    { label: 'Mạnh',      color: 'var(--color-income)' },
  ][strength];

  async function submit(e) {
    e.preventDefault();
    setError('');

    // Validate username
    if (!/^[a-zA-Z0-9._-]{3,50}$/.test(form.username)) {
      setError(
        'Tên đăng nhập cần 3–50 ký tự, chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.'
      );
      return;
    }

    // Validate full name
    if (!form.fullName.trim()) {
      setError('Vui lòng nhập họ và tên.');
      return;
    }

    if (form.fullName.trim().length < 2) {
      setError('Họ và tên phải có ít nhất 2 ký tự.');
      return;
    }

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Email chưa đúng định dạng.');
      return;
    }

    // Validate password
    if (form.password.length < 6) {
      setError('Mật khẩu cần tối thiểu 6 ký tự.');
      return;
    }

    if (form.password !== form.confirm) {
      setError('Mật khẩu xác nhận chưa khớp.');
      return;
    }

    // Validate terms
    if (!terms) {
      setError('Vui lòng đồng ý với điều khoản sử dụng.');
      return;
    }

    setBusy(true);

    try {
      await register({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
      });

      navigate('/login', {
        replace: true,
        state: { registered: true },
      });
    } catch (err) {
      setError(err.message || 'Không thể tạo tài khoản.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page register-page relative">
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
            BẮT ĐẦU TỪ HÔM NAY
          </span>

          <h1>
            Một gia đình.
            <br />
            <em>Chung mục tiêu.</em>
          </h1>

          <p>
            Tạo thói quen tài chính tốt hơn, vun đắp những
            kế hoạch lớn cùng những người bạn yêu thương.
          </p>

          <div className="visual-quote">
            <span>“</span>
            <p>
              Không phải bạn kiếm được bao nhiêu, mà là gia
              đình bạn cùng nhau xây dựng được điều gì.
            </p>
          </div>
        </div>

        <div className="visual-orb orb-one" aria-hidden="true" />
        <div className="visual-orb orb-two" aria-hidden="true" />

        <div className="auth-visual-footer">
          © 2026 FinHome
          <span>•</span>
          Cùng nhau vun đắp tương lai
        </div>
      </motion.section>

      {/* Right form section */}
      <section className="auth-form-side" aria-labelledby="register-title">
        <motion.div
          className="auth-form-wrap register-form-wrap"
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
            TẠO KHÔNG GIAN TÀI CHÍNH RIÊNG
          </span>

          <h2 id="register-title">Tạo tài khoản</h2>

          <p className="form-subtitle">
            Chỉ mất một phút để bắt đầu quản lý tài chính cùng gia đình.
          </p>

          {error && (
            <div className="alert-error" role="alert">
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={submit} aria-label="Form đăng ký tài khoản">
            {/* Username */}
            <label htmlFor="username">
              Tên đăng nhập
            </label>

            <div className="input-wrap">
              <UserRound size={17} aria-hidden="true" />
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="Ví dụ: nguyenvana"
                value={form.username}
                onChange={(e) => set('username', e.target.value)}
                required
              />
            </div>

            {/* Full name */}
            <label htmlFor="fullName">
              Họ và tên
            </label>

            <div className="input-wrap">
              <UserRound size={17} aria-hidden="true" />
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder="Tên hiển thị của bạn"
                value={form.fullName}
                onChange={(e) => set('fullName', e.target.value)}
                required
              />
            </div>

            {/* Email */}
            <label htmlFor="email">
              Email
            </label>

            <div className="input-wrap">
              <Mail size={17} aria-hidden="true" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="ban@example.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <label htmlFor="newPassword">
              Mật khẩu
            </label>

            <div className="input-wrap">
              <LockKeyhole size={17} aria-hidden="true" />
              <input
                id="newPassword"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Tối thiểu 6 ký tự"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
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

            {/* Password strength */}
            <div className="strength-row" aria-live="polite">
              <div className="strength-bars" aria-hidden="true">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={strength >= i ? 'filled' : ''}
                    style={{
                      background: strength >= i ? strengthMeta.color : undefined,
                    }}
                  />
                ))}
              </div>

              <small>
                Độ mạnh:{' '}
                <b style={{ color: strengthMeta.color }}>
                  {strengthMeta.label}
                </b>
              </small>
            </div>

            {/* Confirm password */}
            <label htmlFor="confirm">
              Xác nhận mật khẩu
            </label>

            <div className="input-wrap">
              <LockKeyhole size={17} aria-hidden="true" />
              <input
                id="confirm"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu"
                value={form.confirm}
                onChange={(e) => set('confirm', e.target.value)}
                required
              />

              {form.confirm && (
                <span
                  className={`match-icon ${
                    form.confirm === form.password ? 'match' : 'mismatch'
                  }`}
                  aria-label={form.confirm === form.password ? 'Mật khẩu khớp' : 'Mật khẩu chưa khớp'}
                >
                  {form.confirm === form.password ? (
                    <Check size={16} />
                  ) : (
                    <span>!</span>
                  )}
                </span>
              )}
            </div>

            {form.confirm && form.confirm !== form.password && (
              <small className="field-error" role="status" aria-live="polite">
                Mật khẩu xác nhận chưa khớp.
              </small>
            )}

            {/* Terms */}
            <label className="check-row terms-row">
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
              />
              <span>
                Tôi đồng ý với{' '}
                <a
                  href="#terms"
                  onClick={(e) => {
                    e.preventDefault();
                    setError(
                      'Điều khoản sử dụng: Sử dụng tài khoản đúng mục đích và chỉ nhập dữ liệu tài chính mà bạn có quyền quản lý.'
                    );
                  }}
                >
                  điều khoản sử dụng
                </a>{' '}
                của FinHome.
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              className="btn-primary auth-submit"
              disabled={busy}
            >
              {busy ? (
                <>
                  <span className="button-spinner" aria-hidden="true" />
                  <span>Đang tạo tài khoản…</span>
                </>
              ) : (
                <>
                  <span>Tạo tài khoản</span>
                  <ArrowRight size={17} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="auth-switch">
            Đã có tài khoản?{' '}
            <Link to="/login">
              Đăng nhập
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </p>

          <div className="secure-note">
            <ShieldCheck size={14} aria-hidden="true" />
            <span>Thông tin của bạn được mã hóa và bảo mật</span>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
