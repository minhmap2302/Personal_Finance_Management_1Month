import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token =
      localStorage.getItem('pfm.accessToken') ||
      sessionStorage.getItem('pfm.accessToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

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
              : 'Không thể kết nối máy chủ. Vui lòng thử lại.');

  return { status, message };
}

export default api;