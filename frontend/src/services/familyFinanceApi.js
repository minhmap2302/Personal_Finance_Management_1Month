import api, { responseData } from '../lib/api';

const unwrap = async (promise) => responseData(await promise);

export const profileApi = {
  get: () => unwrap(api.get('/api/v1/users/me')),
  update: (payload) => unwrap(api.put('/api/v1/users/me', payload)),
  changePassword: (payload) => unwrap(api.put('/api/v1/users/me/password', payload)),
};

export const familyApi = {
  list: () => unwrap(api.get('/api/v1/families')),
  get: (familyId) => unwrap(api.get(`/api/v1/families/${familyId}`)),
  create: (payload) => unwrap(api.post('/api/v1/families', payload)),
  update: (familyId, payload) => unwrap(api.put(`/api/v1/families/${familyId}`, payload)),
  delete: (familyId) => unwrap(api.delete(`/api/v1/families/${familyId}`)),
  leave: (familyId) => unwrap(api.post(`/api/v1/families/${familyId}/leave`)),
  members: (familyId, params = {}) => unwrap(api.get(`/api/v1/families/${familyId}/members`, { params })),
  updateMemberRole: (familyId, userId, role) => unwrap(api.put(`/api/v1/families/${familyId}/members/${userId}/role`, { role })),
  transferOwnership: (familyId, newOwnerUserId) => unwrap(api.post(`/api/v1/families/${familyId}/transfer-ownership`, { newOwnerUserId })),
  removeMember: (familyId, userId) => unwrap(api.delete(`/api/v1/families/${familyId}/members/${userId}`)),
  searchUsers: (familyId, username) => unwrap(api.get(`/api/v1/families/${familyId}/invitations/search-users`, { params: { username } })),
  sendInvitation: (familyId, userId) => unwrap(api.post(`/api/v1/families/${familyId}/invitations`, { userId })),
  myInvitations: (status = 'PENDING') => unwrap(api.get('/api/v1/invitations', { params: { status } })),
  acceptInvitation: (id) => unwrap(api.post(`/api/v1/invitations/${id}/accept`)),
  declineInvitation: (id) => unwrap(api.post(`/api/v1/invitations/${id}/decline`)),
};

export const categoryApi = {
  list: (params = {}) => unwrap(api.get('/api/v1/categories', { params })),
  create: (familyId, payload) => unwrap(api.post(`/api/v1/categories/families/${familyId}`, payload)),
  update: (id, familyId, payload) => unwrap(api.put(`/api/v1/categories/${id}`, payload, { params: { familyId } })),
  archive: (id, familyId) => unwrap(api.delete(`/api/v1/categories/${id}`, { params: { familyId } })),
  restore: (id, familyId) => unwrap(api.patch(`/api/v1/categories/${id}/restore`, null, { params: { familyId } })),
};

export function getErrorMessage(error, fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.') {
  return error?.response?.data?.message || error?.message || fallback;
}
