import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { responseData } from '../lib/api';

const FamilyContext = createContext(null);
const ACTIVE_FAMILY_KEY = 'pfm.activeFamilyId';

export function FamilyProvider({ children }) {
  const [families, setFamilies] = useState([]);
  const [activeFamilyId, setActiveFamilyIdState] = useState(() => localStorage.getItem(ACTIVE_FAMILY_KEY) || '');
  const [familiesLoading, setFamiliesLoading] = useState(true);
  const [familiesError, setFamiliesError] = useState('');

  const setActiveFamilyId = useCallback((id) => {
    const value = id == null ? '' : String(id);
    setActiveFamilyIdState(value);
    if (value) localStorage.setItem(ACTIVE_FAMILY_KEY, value);
    else localStorage.removeItem(ACTIVE_FAMILY_KEY);
  }, []);

  const refreshFamilies = useCallback(async () => {
    setFamiliesLoading(true);
    setFamiliesError('');
    try {
      const data = responseData(await api.get('/api/v1/families'));
      const list = Array.isArray(data) ? data : data?.content || [];
      setFamilies(list);

      // Keep the selected family when it still belongs to the user.
      // Otherwise select the first available family, or clear the selection.
      const storedId = localStorage.getItem(ACTIVE_FAMILY_KEY) || '';
      const currentId = activeFamilyId || storedId;
      const currentExists = list.some((family) => String(family.id) === String(currentId));
      if (!currentExists) setActiveFamilyId(list[0]?.id ?? '');
      return list;
    } catch (error) {
      const message = error?.response?.data?.message || 'Không thể tải danh sách gia đình.';
      setFamiliesError(message);
      throw error;
    } finally {
      setFamiliesLoading(false);
    }
  }, [activeFamilyId, setActiveFamilyId]);

  useEffect(() => { refreshFamilies().catch(() => {}); }, [refreshFamilies]);

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
