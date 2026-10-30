import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError, responseData } from '../lib/api';

const AuthContext = createContext(null);
const ACCESS = 'pfm.accessToken';
const REFRESH = 'pfm.refreshToken';
const USER = 'pfm.user';

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem(ACCESS) || sessionStorage.getItem(ACCESS));
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem(USER) || sessionStorage.getItem(USER) || 'null'); } catch { return null; } });
  const [loading, setLoading] = useState(true);
  const isAuthenticated = Boolean(token && user);

  useEffect(() => { setLoading(false); }, []);
  const login = useCallback((nextToken, userData, refreshToken, remember = true) => {
    [localStorage, sessionStorage].forEach((s) => [ACCESS, REFRESH, USER].forEach((key) => s.removeItem(key)));
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(ACCESS, nextToken);
    if (refreshToken) storage.setItem(REFRESH, refreshToken);
    storage.setItem(USER, JSON.stringify(userData || {}));
    setToken(nextToken); setUser(userData || {});
  }, []);
  const logout = useCallback(async (redirect = true) => {
    const refreshToken = localStorage.getItem(REFRESH) || sessionStorage.getItem(REFRESH);
    try { if (token) await api.post('/api/v1/auth/logout', refreshToken ? { refreshToken } : {}); } catch { /* Local logout must work even when API is offline. */ }
    [localStorage, sessionStorage].forEach((s) => [ACCESS, REFRESH, USER].forEach((key) => s.removeItem(key)));
    setToken(null); setUser(null);
    if (redirect) navigate('/login', { replace: true });
  }, [navigate, token]);
  const register = useCallback(async (userData) => {
    try { const response = await api.post('/api/v1/auth/register', userData); return responseData(response); }
    catch (error) { throw apiError(error); }
  }, []);
  const signIn = useCallback(async (identifier, password, remember = true) => {
    try {
      const response = await api.post('/api/v1/auth/login', { usernameOrEmail: identifier, username: identifier, password });
      const data = responseData(response);
      if (!data.accessToken) throw { message: 'API đăng nhập không trả về accessToken. Hãy kiểm tra cấu trúc phản hồi backend.' };
      login(data.accessToken, data.user, data.refreshToken, remember);
      return data;
    } catch (error) { throw error?.message && !error?.response ? error : apiError(error); }
  }, [login]);
  const value = useMemo(() => ({ user, token, loading, isAuthenticated, login, logout, register, signIn }), [user, token, loading, isAuthenticated, login, logout, register, signIn]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used within AuthProvider'); return value; }
