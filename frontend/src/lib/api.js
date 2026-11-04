import axios from 'axios';

api.interceptors.request.use((config) => {
  return config;
});
export function apiError(error) {
  const status = error?.response?.status;
  const body = error?.response?.data;
  return { status, message };
}
export default api;