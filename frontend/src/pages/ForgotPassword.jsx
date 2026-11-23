import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Home, Mail, ShieldCheck, Shield, LockKeyhole, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import api, { apiError, responseData } from '../lib/api';

export default function ForgotPassword() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();

  async function sendOtp(e) {
    e.preventDefault(); setError(''); setNotice('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Vui lòng nhập địa chỉ Gmail hợp lệ.');
    setBusy(true);
    try {
      await api.post('/api/v1/auth/password/forgot', { email: email.trim().toLowerCase() });
      setStep('otp');
      setNotice('Nếu email đã đăng ký, mã OTP 6 chữ số sẽ được gửi tới hộp thư của bạn. Mã có hiệu lực trong 10 phút.');
    } catch (err) { setError(apiError(err).message); }
    finally { setBusy(false); }
  }

  async function verifyOtp(e) {
    e.preventDefault(); setError(''); setNotice('');
    if (!/^\d{6}$/.test(otp)) return setError('Mã OTP phải gồm đúng 6 chữ số.');
    setBusy(true);
    try {
      const data = responseData(await api.post('/api/v1/auth/password/verify', { email: email.trim().toLowerCase(), otp }));
      if (!data.resetToken) throw new Error('Máy chủ không trả về mã đặt lại mật khẩu.');
      setResetToken(data.resetToken); setStep('reset');
      setNotice('Email đã được xác thực. Hãy tạo mật khẩu mới.');
    } catch (err) { setError(err?.response ? apiError(err).message : err.message || 'Không thể xác thực OTP.'); }
    finally { setBusy(false); }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setError('');
    setNotice('');

    if (password.length < 6) {
      return setError('Mật khẩu cần tối thiểu 6 ký tự.');
    }

    if (password !== confirm) {
      return setError('Mật khẩu xác nhận chưa khớp.');
    }

    setBusy(true);

    try {
      await api.post('/api/v1/auth/password/reset', {
        resetToken,
        newPassword: password
      });

      setStep('done');
      setNotice('Mật khẩu đã được thay đổi thành công. Đang chuyển hướng về trang đăng nhập…');

      // Tự động chuyển về trang đăng nhập sau 1,8 giây
      window.setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { passwordReset: true }
        });
      }, 1800);

    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setBusy(false);
    }
  }

  return (
      <div className={`auth-page auth-otp-page ${step === 'done' ? 'auth-reset-complete-page' : ''}`}>
      <motion.section className="auth-visual" initial={{opacity:0,x:-24}} animate={{opacity:1,x:0}}>
        <Link to="/" className="auth-brand"><span className="brand-mark"><Home size={22}/></span><span><b>FinHome</b><small>QUẢN LÝ CHI TIÊU GIA ĐÌNH</small></span></Link>
        <div className="visual-copy"><span className="eyebrow">BẢO MẬT TÀI KHOẢN</span><h1>Khôi phục quyền truy cập.<br/><em>An tâm tiếp tục.</em></h1><p>Chúng tôi sẽ xác minh địa chỉ email trước khi cho phép bạn tạo mật khẩu mới.</p><div className="visual-stat-row"><div className="visual-stat"><span className="stat-icon"><ShieldCheck size={18}/></span><span><b>Xác thực bằng OTP</b><small>Mã 6 chữ số gửi qua email</small></span></div></div></div>
        <div className="visual-orb orb-one"/><div className="visual-orb orb-two"/>
        <div className="auth-visual-footer">© 2026 FinHome <span>•</span> Bảo vệ tài khoản của bạn</div>
      </motion.section>
      <section className="auth-form-side"><motion.div className="auth-form-wrap" initial={{opacity:0,y:18}} animate={{opacity:1,y:0}}>
        <Link to="/" className="mobile-auth-brand"><span className="brand-mark"><Home size={21}/></span><b>FinHome</b></Link>

        {step !== 'done' && (
            <>
              <span className="form-kicker">KHÔI PHỤC TÀI KHOẢN</span>

              <h2>
                {step === 'email' ? 'Quên mật khẩu?' :
                    step === 'otp' ? 'Xác thực email' :
                        'Tạo mật khẩu mới'}
              </h2>

              <p className="form-subtitle">
                {step === 'email'
                    ? 'Nhập Gmail đã đăng ký để nhận mã OTP.'
                    : step === 'otp'
                        ? `Nhập mã 6 chữ số được gửi tới ${email}.`
                        : 'Chọn mật khẩu mới để tiếp tục sử dụng FinHome.'}
              </p>

              {error && <div className="alert-error" role="alert">{error}</div>}

              {notice && step !== 'done' && (
                  <div className="auth-otp-notice" role="status">
                    {notice}
                  </div>
              )}

              {step === 'email' && (
                  <form className="auth-form" onSubmit={sendOtp}>
                    <label htmlFor="forgotEmail">Địa chỉ Gmail</label>
                    <div className="input-wrap">
                      <Mail size={18}/>
                      <input
                          id="forgotEmail"
                          type="email"
                          autoComplete="email"
                          placeholder="ban@gmail.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                      />
                    </div>
                    <button className="btn-primary auth-submit" disabled={busy}>
                      {busy ? 'Đang gửi mã…' : <>Gửi mã OTP <ArrowRight size={18}/></>}
                    </button>
                  </form>
              )}

              {step === 'otp' && (
                  <form className="auth-form" onSubmit={verifyOtp}>
                    <label htmlFor="forgotOtp">Mã OTP (6 chữ số)</label>
                    <div className="input-wrap">
                      <ShieldCheck size={18}/>
                      <input
                          id="forgotOtp"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          placeholder="Nhập mã trong email"
                          value={otp}
                          onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      />
                    </div>
                    <button className="btn-primary auth-submit" disabled={busy || otp.length !== 6}>
                      {busy ? 'Đang xác thực…' : <>Xác nhận OTP <ArrowRight size={18}/></>}
                    </button>
                    <button
                        type="button"
                        className="auth-otp-text-button"
                        onClick={() => {
                          setStep('email');
                          setOtp('');
                          setError('');
                          setNotice('');
                        }}
                    >
                      Đổi địa chỉ email
                    </button>
                  </form>
              )}

              {step === 'reset' && (
                  <form className="auth-form" onSubmit={resetPassword}>
                    <label htmlFor="newPassword">Mật khẩu mới</label>
                    <div className="input-wrap">
                      <LockKeyhole size={18}/>
                      <input
                          id="newPassword"
                          type={show ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="Tối thiểu 6 ký tự"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                      />
                      <button
                          type="button"
                          className="input-action"
                          onClick={() => setShow(!show)}
                          aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {show ? <EyeOff size={18}/> : <Eye size={18}/>}
                      </button>
                    </div>

                    <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
                    <div className="input-wrap">
                      <LockKeyhole size={18}/>
                      <input
                          id="confirmPassword"
                          type={show ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="Nhập lại mật khẩu"
                          value={confirm}
                          onChange={e => setConfirm(e.target.value)}
                      />
                    </div>

                    <button className="btn-primary auth-submit" disabled={busy}>
                      {busy ? 'Đang cập nhật…' : <>Đặt lại mật khẩu <ArrowRight size={18}/></>}
                    </button>
                  </form>
              )}
            </>
        )}

        {step === 'done' && (
            <motion.div
                className="auth-reset-success-card"
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
            >
              <div className="auth-reset-shield">
                <div className="auth-reset-shield-glow">
                  <Shield
                      className="auth-reset-shield-outline"
                      size={70}
                      strokeWidth={1.5}
                  />

                  <LockKeyhole
                      className="auth-reset-lock"
                      size={29}
                      strokeWidth={1.8}
                  />
                </div>
              </div>

              <span className="auth-reset-success-label">
      THAY ĐỔI MẬT KHẨU THÀNH CÔNG
    </span>

              <h2>Mật khẩu đã được cập nhật!</h2>

              <p className="auth-reset-description">
                Mật khẩu mới của bạn đã được lưu an toàn.
                Bây giờ bạn có thể đăng nhập và tiếp tục sử dụng FinHome.
              </p>

              <button
                  type="button"
                  className="auth-reset-login-button"
                  onClick={() => navigate('/login', {
                    replace: true,
                    state: { passwordReset: true }
                  })}
              >
                Về trang đăng nhập
                <ArrowRight size={19}/>
              </button>

              <div className="auth-reset-redirect">
                <span className="auth-reset-redirect-dot"/>
                Đang tự động chuyển hướng về trang đăng nhập...
              </div>

              <div className="auth-reset-progress">
                <span/>
              </div>
            </motion.div>
        )}

        {step !== 'done' && (
            <p className="auth-switch">
              <Link to="/login">
                <ArrowLeft size={15}/> Quay lại đăng nhập
              </Link>
            </p>
        )}
      </motion.div></section>
    </div>
  );
}
