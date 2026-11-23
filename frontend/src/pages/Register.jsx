import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Eye, EyeOff, Home, LockKeyhole, Mail, UserRound, ShieldCheck } from 'lucide-react';
import api, { apiError } from '../lib/api';

export default function Register() {
  const [form, setForm] = useState({ username: '', fullName: '', email: '', password: '', confirm: '' });
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [show, setShow] = useState(false);
  const [terms, setTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown > 0]);

  const formatCooldown = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  const set = (key, value) => setForm(old => ({ ...old, [key]: value }));
  const strength = useMemo(() => {
    const p = form.password;
    return [p.length >= 8, /[A-Z]/.test(p) && /[a-z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
  }, [form.password]);
  const strengthLabel = ['Chưa có', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'];

  function validateRegistration() {
    if (!/^[a-zA-Z0-9._-]{3,50}$/.test(form.username)) return 'Tên đăng nhập cần 3–50 ký tự, chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.';
    if (form.fullName.trim().length < 2) return 'Họ và tên phải có ít nhất 2 ký tự.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Email chưa đúng định dạng.';
    if (form.password.length < 6) return 'Mật khẩu cần tối thiểu 6 ký tự.';
    if (form.password !== form.confirm) return 'Mật khẩu xác nhận chưa khớp.';
    if (!terms) return 'Vui lòng đồng ý với điều khoản sử dụng.';
    return '';
  }

  async function sendOrResendOtp() {
    setError(''); setNotice('');
    if (cooldown > 0 || busy) return;
    const validationError = validateRegistration();
    if (validationError) return setError(validationError);
    setBusy(true);
    try {
      const email = form.email.trim().toLowerCase();
      if (!otpSent) {
        await api.post('/api/v1/auth/register', {
          username: form.username.trim(), fullName: form.fullName.trim(), email, password: form.password
        });
        setOtpSent(true);
        setNotice(`Mã xác thực đã được gửi đến ${email}.`);
      } else {
        await api.post('/api/v1/auth/register/resend', { email });
        setNotice('Đã gửi lại mã xác thực. Mã OTP trước đó không còn hiệu lực.');
        setOtp('');
      }
      setCooldown(300);
    } catch (err) { setError(apiError(err).message); }
    finally { setBusy(false); }
  }

  async function verifyOtp(e) {
    e.preventDefault(); setError(''); setNotice('');
    if (!otpSent) return setError('Vui lòng gửi mã xác thực đến email trước.');
    if (!/^\d{6}$/.test(otp)) return setError('Vui lòng nhập đúng mã OTP gồm 6 chữ số.');
    setBusy(true);
    try {
      await api.post('/api/v1/auth/register/verify', { email: form.email.trim().toLowerCase(), otp });
      setNotice('Xác thực email và tạo tài khoản thành công. Đang chuyển tới đăng nhập…');
      setTimeout(() => navigate('/login', { replace: true, state: { registered: true } }), 900);
    } catch (err) { setError(apiError(err).message); }
    finally { setBusy(false); }
  }


  return (
    <div className="auth-page register-page">
      <motion.section className="auth-visual" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}>
        <Link to="/" className="auth-brand"><span className="brand-mark"><Home size={22}/></span><span><b>FinHome</b><small>QUẢN LÝ CHI TIÊU GIA ĐÌNH</small></span></Link>
        <div className="visual-copy">
          <span className="eyebrow">BẮT ĐẦU TỪ HÔM NAY</span>
          <h1>Một gia đình.<br/><em>Chung mục tiêu.</em></h1>
          <p>Tạo thói quen tài chính tốt hơn, vun đắp những kế hoạch lớn cùng những người bạn yêu thương.</p>
          <div className="visual-quote"><span>“</span><p>Không phải bạn kiếm được bao nhiêu, mà là gia đình bạn cùng nhau xây dựng được điều gì.</p></div>
        </div>
        <div className="visual-orb orb-one"/><div className="visual-orb orb-two"/>
        <div className="auth-visual-footer">© 2026 FinHome <span>•</span> Cùng nhau vun đắp tương lai</div>
      </motion.section>

      <section className="auth-form-side">
        <motion.div className="auth-form-wrap register-form-wrap" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/" className="mobile-auth-brand"><span className="brand-mark"><Home size={21}/></span><b>FinHome</b></Link>
          <span className="form-kicker">TẠO KHÔNG GIAN TÀI CHÍNH RIÊNG</span>
          <h2>Tạo tài khoản</h2>
          <p className="form-subtitle">Chỉ mất một phút để bắt đầu.</p>
          {error && <div className="alert-error" role="alert">{error}</div>}
          {notice && <div className="auth-otp-notice" role="status">{notice}</div>}

          {(
            <form className="auth-form" onSubmit={verifyOtp}>
              <label htmlFor="username">Tên đăng nhập</label>
              <div className="input-wrap"><UserRound size={18}/><input id="username" autoComplete="username" placeholder="Ví dụ: nguyenvana" value={form.username} onChange={e => set('username', e.target.value)}/></div>
              <label htmlFor="fullName">Họ và tên</label>
              <div className="input-wrap"><UserRound size={18}/><input id="fullName" autoComplete="name" placeholder="Tên hiển thị của bạn" value={form.fullName} onChange={e => set('fullName', e.target.value)}/></div>
              <label htmlFor="email">Email</label>
              <div className="input-wrap"><Mail size={18}/><input id="email" type="email" autoComplete="email" placeholder="ban@example.com" value={form.email} onChange={e => set('email', e.target.value)}/></div>
              <label htmlFor="registerOtp">Mã xác thực</label>
              <div className="register-otp-row">
                <div className="input-wrap"><ShieldCheck size={18}/><input id="registerOtp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Nhập mã OTP gồm 6 chữ số" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}/></div>
                <button type="button" className="register-send-otp" disabled={busy || cooldown > 0} onClick={sendOrResendOtp}>{busy ? 'Đang gửi…' : cooldown > 0 ? `Gửi lại (${formatCooldown(cooldown)})` : otpSent ? 'Gửi lại mã' : 'Gửi mã'}</button>
              </div>
              {otpSent && <p className="register-email-hint"><ShieldCheck size={14}/> Mã xác thực đã được gửi. Nếu chưa nhận được, hãy kiểm tra mục Thư rác (Spam) hoặc Quảng cáo trong Gmail.</p>}
              <label htmlFor="newPassword">Mật khẩu</label>
              <div className="input-wrap"><LockKeyhole size={18}/><input id="newPassword" type={show ? 'text' : 'password'} autoComplete="new-password" placeholder="Tối thiểu 6 ký tự" value={form.password} onChange={e => set('password', e.target.value)}/><button type="button" className="input-action" onClick={() => setShow(!show)} aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
              <div className="strength-row"><div className="strength-bars">{[1,2,3,4].map(i => <span key={i} className={strength >= i ? 'filled' : ''}/>)}</div><small>Độ mạnh: <b>{strengthLabel[strength]}</b></small></div>
              <label htmlFor="confirm">Xác nhận mật khẩu</label>
              <div className="input-wrap"><LockKeyhole size={18}/><input id="confirm" type={show ? 'text' : 'password'} autoComplete="new-password" placeholder="Nhập lại mật khẩu" value={form.confirm} onChange={e => set('confirm', e.target.value)}/>{form.confirm && <span className={`match-icon ${form.confirm === form.password ? 'match' : 'mismatch'}`}>{form.confirm === form.password ? <Check size={17}/> : '!'}</span>}</div>
              <label className="check-row terms-row">
                <input
                    type="checkbox"
                    checked={terms}
                    onChange={e => setTerms(e.target.checked)}
                />

                <span>
    Tôi đồng ý với{' '}
                  <button
                      type="button"
                      className="terms-link"
                      onClick={() => setTermsOpen(true)}
                  >
      điều khoản sử dụng
    </button>
                  {' '}của FinHome.
  </span>
              </label>              <button className="btn-primary auth-submit" disabled={busy || !otpSent || otp.length !== 6}>{busy ? <><span className="button-spinner"/>Đang xác thực…</> : <>Xác nhận đăng ký <ArrowRight size={18}/></>}</button>
            </form>
          )}
          <p className="auth-switch">Đã có tài khoản? <Link to="/login">Đăng nhập <ArrowRight size={15}/></Link></p>
          {termsOpen && (
              <div
                  className="terms-modal-backdrop"
                  role="presentation"
                  onMouseDown={e => {
                    if (e.target === e.currentTarget) {
                      setTermsOpen(false);
                    }
                  }}
              >
                <motion.div
                    className="terms-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="terms-modal-title"
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                >
                  <div className="terms-modal-heading">
                    <h3 id="terms-modal-title">
                      Điều khoản sử dụng
                    </h3>

                    <button
                        type="button"
                        onClick={() => setTermsOpen(false)}
                        aria-label="Đóng điều khoản"
                    >
                      ×
                    </button>
                  </div>

                  <p>
                    Điều khoản sử dụng: sử dụng tài khoản đúng mục đích và chỉ nhập dữ liệu tài chính mà bạn có quyền quản lý
                  </p>

                  <div className="terms-modal-actions">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setTermsOpen(false)}
                    >
                      Đóng
                    </button>

                    <button
                        type="button"
                        className="btn-primary"
                        onClick={() => {
                          setTerms(true);
                          setTermsOpen(false);
                        }}
                    >
                      Tôi đồng ý
                    </button>
                  </div>
                </motion.div>
              </div>
          )}
        </motion.div>
      </section>
    </div>
  );
}
