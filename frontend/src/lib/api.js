import axios from 'axios';

const ACCESS = 'pfm.accessToken';
const REFRESH = 'pfm.refreshToken';
const USER = 'pfm.user';
const SESSION_EXPIRES_AT = 'pfm.sessionExpiresAt';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise = null;

function getStorage() {
  return localStorage.getItem(ACCESS) ? localStorage : sessionStorage;
}

function clearStoredSession() {
  [localStorage, sessionStorage].forEach((storage) => {
    [ACCESS, REFRESH, USER, SESSION_EXPIRES_AT, 'pfm.activeFamilyId'].forEach((key) => {
      storage.removeItem(key);
    });
  });
  window.dispatchEvent(new CustomEvent('pfm:auth-expired'));
}

async function refreshAccessToken() {
  const storage = getStorage();
  const refreshToken = storage.getItem(REFRESH);
  const expiresAt = Number(storage.getItem(SESSION_EXPIRES_AT) || 0);

  // Không refresh nếu phiên Frontend đã hết hạn theo cấu hình môi trường.
  if (!refreshToken || !expiresAt || Date.now() >= expiresAt) {
    clearStoredSession();
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  if (!refreshPromise) {
    refreshPromise = axios.post(
      `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/auth/refresh`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } }
    )
      .then((response) => {
        const data = response?.data?.data ?? response?.data ?? {};
        if (!data.accessToken || !data.refreshToken) {
          throw new Error('Phản hồi làm mới phiên đăng nhập không hợp lệ.');
        }

        // Chỉ thay token; tuyệt đối không gia hạn SESSION_EXPIRES_AT.
        storage.setItem(ACCESS, data.accessToken);
        storage.setItem(REFRESH, data.refreshToken);
        return data.accessToken;
      })
      .catch((error) => {
        clearStoredSession();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const storage = getStorage();
  const expiresAt = Number(storage.getItem(SESSION_EXPIRES_AT) || 0);

  if (storage.getItem(ACCESS) && (!expiresAt || Date.now() >= expiresAt)) {
    clearStoredSession();
    return Promise.reject(new Error('Phiên đăng nhập đã hết hạn.'));
  }

  const token = storage.getItem(ACCESS);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || '';
    const isAuthEndpoint = /\/api\/v1\/auth\/(login|register|logout|refresh)/.test(url);

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthEndpoint
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshAccessToken();
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);

export function responseData(response) {
  return response?.data?.data ?? response?.data ?? {};
}

export function apiError(error) {
  const status = error?.response?.status;
  const body = error?.response?.data;

  const message =
    body?.message ||
    body?.error ||
    (status === 401
      ? 'Thông tin đăng nhập không chính xác hoặc phiên đã hết hạn.'
      : status === 400
        ? 'Dữ liệu chưa hợp lệ hoặc tài khoản đã tồn tại.'
        : error?.message || 'Không thể kết nối máy chủ. Vui lòng thử lại.');

  return { status, message };
}

export default api;
