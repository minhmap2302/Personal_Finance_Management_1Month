import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { responseData } from '../lib/api';
import { useAuth } from './AuthContext';

const FamilyContext = createContext(null);

export function FamilyProvider({ children }) {
  const { user, token } = useAuth();

  // Lưu gia đình đang chọn riêng theo từng tài khoản.
  const accountId = user?.id ?? user?.userId ?? user?.username ?? user?.email ?? 'unknown';
  const activeFamilyKey = `pfm.activeFamilyId:${String(accountId)}`;

  const [families, setFamilies] = useState([]);
  const [activeFamilyId, setActiveFamilyIdState] = useState(
    () => localStorage.getItem(activeFamilyKey) || ''
  );
  const [familiesLoading, setFamiliesLoading] = useState(true);
  const [familiesError, setFamiliesError] = useState('');

  const setActiveFamilyId = useCallback((id) => {
    const value = id == null ? '' : String(id);
    setActiveFamilyIdState(value);
    if (value) localStorage.setItem(activeFamilyKey, value);
    else localStorage.removeItem(activeFamilyKey);
  }, [activeFamilyKey]);

  // Xóa dữ liệu gia đình trong bộ nhớ khi tài khoản/token thay đổi.
  useEffect(() => {
    setFamilies([]);
    setActiveFamilyIdState(localStorage.getItem(activeFamilyKey) || '');
    setFamiliesError('');
    setFamiliesLoading(true);
  }, [activeFamilyKey, token]);

  const refreshFamilies = useCallback(async () => {
    if (!token) {
      setFamilies([]);
      setActiveFamilyId('');
      setFamiliesLoading(false);
      return [];
    }

    setFamiliesLoading(true);
    setFamiliesError('');
    try {
      const data = responseData(await api.get('/api/v1/families'));
      const list = Array.isArray(data) ? data : data?.content || [];
      setFamilies(list);

      // Chỉ giữ gia đình được API xác nhận thuộc tài khoản hiện tại.
      const storedId = localStorage.getItem(activeFamilyKey) || '';
      const storedFamilyExists = list.some(
        (family) => String(family.id) === String(storedId)
      );

      if (!storedFamilyExists) {
        setActiveFamilyId(list[0]?.id ?? '');
      } else {
        setActiveFamilyIdState(String(storedId));
      }

      return list;
    } catch (error) {
      // Không giữ dữ liệu gia đình cũ nếu tải dữ liệu tài khoản hiện tại thất bại.
      setFamilies([]);
      setActiveFamilyId('');
      const message = error?.response?.data?.message || 'Không thể tải danh sách gia đình.';
      setFamiliesError(message);
      throw error;
    } finally {
      setFamiliesLoading(false);
    }
  }, [activeFamilyKey, setActiveFamilyId, token]);

  useEffect(() => {
    refreshFamilies().catch(() => {});
  }, [refreshFamilies]);

  const activeFamily = useMemo(
    () => families.find((family) => String(family.id) === String(activeFamilyId)) || null,
    [families, activeFamilyId],
  );

  const value = useMemo(() => ({
    families, activeFamily, activeFamilyId, setActiveFamilyId,
    familiesLoading, familiesError, refreshFamilies,
  }), [families, activeFamily, activeFamilyId, setActiveFamilyId, familiesLoading, familiesError, refreshFamilies]);

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useFamily() {
  const value = useContext(FamilyContext);
  if (!value) throw new Error('useFamily must be used within FamilyProvider');
  return value;
}
