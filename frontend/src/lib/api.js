import axios from 'axios';

const ACCESS = 'pfm.accessToken';
const REFRESH = 'pfm.refreshToken';
const USER = 'pfm.user';

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
    [ACCESS, REFRESH, USER, 'pfm.activeFamilyId'].forEach((key) => {
      storage.removeItem(key);
    });
  });
  window.dispatchEvent(new CustomEvent('pfm:auth-expired'));
}

async function refreshAccessToken() {
  const storage = getStorage();
  const refreshToken = storage.getItem(REFRESH);

  if (!refreshToken) {
    clearStoredSession();
    throw new Error('Không tìm thấy Refresh Token. Vui lòng đăng nhập lại.');
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

        // Backend xoay vòng cả Access Token và Refresh Token.
        storage.setItem(ACCESS, data.accessToken);
        storage.setItem(REFRESH, data.refreshToken);
        return data.accessToken;
      })
      .catch((error) => {
        // Chỉ xóa phiên khi Backend xác nhận Refresh Token không còn hợp lệ.
        // Lỗi mạng/timeout/5xx không đồng nghĩa với việc phiên đã hết hạn.
        if (error?.response?.status === 401) {
          clearStoredSession();
        }
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
