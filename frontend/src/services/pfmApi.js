import api, { responseData } from '../lib/api';

const unwrap = async (request) => responseData(await request);
const familyPath = (familyId) => `/api/v1/families/${familyId}`;

export const dashboardApi = {
  get: (familyId, params = {}) => unwrap(api.get(`${familyPath(familyId)}/dashboard`, { params })),
};

export const transactionApi = {
  list: (familyId, params = {}) => unwrap(api.get(`${familyPath(familyId)}/transactions`, { params })),
  create: (familyId, payload) => unwrap(api.post(`${familyPath(familyId)}/transactions`, payload)),
  update: (familyId, id, payload) => unwrap(api.put(`${familyPath(familyId)}/transactions/${id}`, payload)),
  remove: (familyId, id) => unwrap(api.delete(`${familyPath(familyId)}/transactions/${id}`)),
  uploadReceipt: (familyId, id, file) => {
    const form = new FormData(); form.append('file', file);
    return unwrap(api.post(`${familyPath(familyId)}/transactions/${id}/receipt`, form, { headers: { 'Content-Type': 'multipart/form-data' } }));
  },
};

export const budgetApi = {
  list: (familyId, params = {}) => unwrap(api.get(`${familyPath(familyId)}/budgets`, { params })),
  current: (familyId, date) => unwrap(api.get(`${familyPath(familyId)}/budgets/current`, { params: date ? { date } : {} })),
  get: (familyId, id) => unwrap(api.get(`${familyPath(familyId)}/budgets/${id}`)),
  create: (familyId, payload) => unwrap(api.post(`${familyPath(familyId)}/budgets`, payload)),
  update: (familyId, id, payload) => unwrap(api.put(`${familyPath(familyId)}/budgets/${id}`, payload)),
  remove: (familyId, id) => unwrap(api.delete(`${familyPath(familyId)}/budgets/${id}`)),
  createSub: (familyId, budgetId, payload) => unwrap(api.post(`${familyPath(familyId)}/budgets/${budgetId}/sub-budgets`, payload)),
  updateSub: (familyId, budgetId, subId, payload) => unwrap(api.put(`${familyPath(familyId)}/budgets/${budgetId}/sub-budgets/${subId}`, payload)),
  removeSub: (familyId, budgetId, subId) => unwrap(api.delete(`${familyPath(familyId)}/budgets/${budgetId}/sub-budgets/${subId}`)),
};

export const savingApi = {
  list: (familyId, params = {}) => unwrap(api.get(`${familyPath(familyId)}/saving-goals`, { params })),
  create: (familyId, payload) => unwrap(api.post(`${familyPath(familyId)}/saving-goals`, payload)),
  update: (familyId, id, payload) => unwrap(api.put(`${familyPath(familyId)}/saving-goals/${id}`, payload)),
  cancel: (familyId, id) => unwrap(api.delete(`${familyPath(familyId)}/saving-goals/${id}`)),
  contributions: (familyId, goalId, params = {}) => unwrap(api.get(`${familyPath(familyId)}/saving-goals/${goalId}/contributions`, { params })),
  contribute: (familyId, goalId, payload) => unwrap(api.post(`${familyPath(familyId)}/saving-goals/${goalId}/contributions`, payload)),
  updateContribution: (familyId, goalId, id, payload) => unwrap(api.put(`${familyPath(familyId)}/saving-goals/${goalId}/contributions/${id}`, payload)),
  removeContribution: (familyId, goalId, id) => unwrap(api.delete(`${familyPath(familyId)}/saving-goals/${goalId}/contributions/${id}`)),
};

export const supportApi = {
  chat: (familyId, message) => unwrap(api.post(`${familyPath(familyId)}/chatbot/chat`, { message })),
};

export const categoryApi = {
  list: (familyId, type) => unwrap(api.get('/api/v1/categories', { params: { familyId, type, page: 0, size: 200, sort: 'name,asc' } })),
};

export function asList(data) { return Array.isArray(data) ? data : data?.content || []; }
export function money(value) {
  const n = Number(value || 0);
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n)} ₫`;
}
export function numberValue(value) { return Number(String(value ?? '').replace(/[^\d]/g, '') || 0); }
export function formatInput(value) { return new Intl.NumberFormat('vi-VN').format(numberValue(value)); }
export function percent(value) { return Math.max(0, Number(value || 0)); }
export function dateLabel(value) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN') : '—'; }
export function alertTone(status, pct) {
  const key = String(status || '').toUpperCase();
  if (key === 'EXCEEDED' || pct > 100) return 'danger';
  if (key === 'WARNING' || pct >= 80) return 'warning';
  return 'success';
}
