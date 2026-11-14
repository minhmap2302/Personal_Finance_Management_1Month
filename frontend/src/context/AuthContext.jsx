import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError, responseData } from '../lib/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);
const ACCESS = 'pfm.accessToken';
const REFRESH = 'pfm.refreshToken';
const USER = 'pfm.user';
const SESSION_EXPIRES_AT = 'pfm.sessionExpiresAt';
const SESSION_DURATION_DAYS = Number(
    import.meta.env.VITE_SESSION_DURATION_DAYS || 1
);

const SESSION_DURATION_MS =
    Number.isFinite(SESSION_DURATION_DAYS) && SESSION_DURATION_DAYS > 0
        ? SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;
const LEGACY_ACTIVE_FAMILY = 'pfm.activeFamilyId';

function getStoredValue(key) {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

function clearStoredSession() {
  [localStorage, sessionStorage].forEach((storage) => {
    [ACCESS, REFRESH, USER, SESSION_EXPIRES_AT, LEGACY_ACTIVE_FAMILY].forEach((key) => {
      storage.removeItem(key);
    });
  });
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const showToast = useToast();

  const [token, setToken] = useState(() => getStoredValue(ACCESS));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(getStoredValue(USER) || 'null');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const isAuthenticated = Boolean(token && user);

  const finishExpiredSession = useCallback((showMessage = true) => {
    clearStoredSession();
    setToken(null);
    setUser(null);

    if (showMessage) {
      showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'warning', 4500);
    }

    navigate('/login', { replace: true });
  }, [navigate, showToast]);

  // Khi tải/reload trang, không khôi phục phiên đã quá hạn.
  useEffect(() => {
    const storedToken = getStoredValue(ACCESS);
    const expiresAt = Number(getStoredValue(SESSION_EXPIRES_AT) || 0);

    if (storedToken && (!expiresAt || Date.now() >= expiresAt)) {
      finishExpiredSession(Boolean(expiresAt));
    }

    setLoading(false);
  }, [finishExpiredSession]);

  // Nhận tín hiệu hết phiên từ Axios interceptor.
  useEffect(() => {
    const handleExpired = () => finishExpiredSession(true);
    window.addEventListener('pfm:auth-expired', handleExpired);
    return () => window.removeEventListener('pfm:auth-expired', handleExpired);
  }, [finishExpiredSession]);

  // Timer tuyệt đối: không bị kéo dài khi Access/Refresh Token được xoay vòng.
  useEffect(() => {
    if (!token) return undefined;

    const expiresAt = Number(getStoredValue(SESSION_EXPIRES_AT) || 0);
    if (!expiresAt) return undefined;

    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      finishExpiredSession(true);
      return undefined;
    }

    const timeoutId = window.setTimeout(
      () => finishExpiredSession(true),
      remaining
    );

    return () => window.clearTimeout(timeoutId);
  }, [token, finishExpiredSession]);

  // Đồng bộ đăng xuất khi người dùng đăng xuất/hết hạn ở tab khác.
  useEffect(() => {
    const handleStorage = (event) => {
      if (
        event.key === ACCESS ||
        event.key === SESSION_EXPIRES_AT ||
        event.key === null
      ) {
        const currentToken = getStoredValue(ACCESS);
        const expiresAt = Number(getStoredValue(SESSION_EXPIRES_AT) || 0);

        if (!currentToken || !expiresAt || Date.now() >= expiresAt) {
          if (token) finishExpiredSession(false);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [token, finishExpiredSession]);

  const login = useCallback((nextToken, userData, refreshToken, remember = true) => {
    clearStoredSession();

    const storage = remember ? localStorage : sessionStorage;
    const expiresAt = Date.now() + SESSION_DURATION_MS;

    storage.setItem(ACCESS, nextToken);
    if (refreshToken) storage.setItem(REFRESH, refreshToken);
    storage.setItem(USER, JSON.stringify(userData || {}));
    storage.setItem(SESSION_EXPIRES_AT, String(expiresAt));

    setToken(nextToken);
    setUser(userData || {});
    showToast('Đăng nhập thành công. Chào mừng bạn quay trở lại!', 'success', 3500);
  }, [showToast]);

  const logout = useCallback(async (redirect = true) => {
    const refreshToken = getStoredValue(REFRESH);

    try {
      if (token) {
        await api.post('/api/v1/auth/logout', refreshToken ? { refreshToken } : {});
      }
    } catch {
      // Luôn hoàn tất đăng xuất cục bộ dù Backend không khả dụng.
    }

    clearStoredSession();
    setToken(null);
    setUser(null);
    showToast('Bạn đã đăng xuất khỏi FinHome.', 'success', 3500);

    if (redirect) {
      navigate('/login', { replace: true });
    }
  }, [navigate, token, showToast]);

  const register = useCallback(async (userData) => {
    try {
      const response = await api.post('/api/v1/auth/register', userData);
      showToast('Đăng ký tài khoản thành công. Hãy đăng nhập để tiếp tục.', 'success', 3800);
      return responseData(response);
    } catch (error) {
      throw apiError(error);
    }
  }, [showToast]);

  const signIn = useCallback(async (identifier, password, remember = true) => {
    try {
      const response = await api.post('/api/v1/auth/login', {
        usernameOrEmail: identifier,
        username: identifier,
        password,
      });

      const data = responseData(response);
      if (!data.accessToken || !data.refreshToken) {
        throw {
          message: 'API đăng nhập không trả về đủ accessToken và refreshToken.',
        };
      }

      login(data.accessToken, data.user, data.refreshToken, remember);
      return data;
    } catch (error) {
      throw error?.message && !error?.response ? error : apiError(error);
    }
  }, [login]);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated,
    login,
    logout,
    register,
    signIn,
  }), [user, token, loading, isAuthenticated, login, logout, register, signIn]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
