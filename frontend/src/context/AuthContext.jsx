import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError, responseData } from '../lib/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);
const ACCESS = 'pfm.accessToken';
const REFRESH = 'pfm.refreshToken';
const USER = 'pfm.user';
const LEGACY_ACTIVE_FAMILY = 'pfm.activeFamilyId';

function getStoredValue(key) {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

function clearStoredSession() {
  [localStorage, sessionStorage].forEach((storage) => {
    [ACCESS, REFRESH, USER, LEGACY_ACTIVE_FAMILY].forEach((key) => {
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

  // Khôi phục phiên đã lưu. Backend là nơi quyết định token còn hợp lệ hay không.
  useEffect(() => {
    const storedToken = getStoredValue(ACCESS);

    if (!storedToken) {
      const storedUser = getStoredValue(USER);
      if (storedUser) clearStoredSession();
      setToken(null);
      setUser(null);
    }

    setLoading(false);
  }, []);

  // Nhận tín hiệu hết phiên từ Axios interceptor khi Refresh Token không còn hợp lệ.
  useEffect(() => {
    const handleExpired = () => finishExpiredSession(true);
    window.addEventListener('pfm:auth-expired', handleExpired);
    return () => window.removeEventListener('pfm:auth-expired', handleExpired);
  }, [finishExpiredSession]);

  // Đồng bộ đăng xuất giữa các tab, không tự đặt thời hạn phiên ở Frontend.
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === ACCESS || event.key === null) {
        const currentToken = getStoredValue(ACCESS);
        if (!currentToken && token) {
          finishExpiredSession(false);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [token, finishExpiredSession]);

  const login = useCallback((nextToken, userData, refreshToken, remember = true) => {
    clearStoredSession();

    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(ACCESS, nextToken);
    if (refreshToken) storage.setItem(REFRESH, refreshToken);
    storage.setItem(USER, JSON.stringify(userData || {}));

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
