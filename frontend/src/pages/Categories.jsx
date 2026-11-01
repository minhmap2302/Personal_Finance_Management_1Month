import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Archive, BriefcaseBusiness, Bus, Coffee, GraduationCap, HeartPulse, Home, Lightbulb, Pencil, Plus, Search, ShoppingBag, ShoppingCart, Tag, Trash2, Wallet, X } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { useToast } from '../context/ToastContext';
import { categoryApi, getErrorMessage } from '../services/familyFinanceApi';

const COLORS = ['#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#f43f5e', '#14b8a6', '#6366f1', '#f97316', '#64748b', '#84cc16'];
const ICONS = [
  ['Tag', Tag], ['ShoppingCart', ShoppingCart], ['ShoppingBag', ShoppingBag], ['Home', Home],
  ['Coffee', Coffee], ['Bus', Bus], ['Wallet', Wallet], ['GraduationCap', GraduationCap],
  ['HeartPulse', HeartPulse], ['Lightbulb', Lightbulb], ['BriefcaseBusiness', BriefcaseBusiness],
];
const iconMap = Object.fromEntries(ICONS);
const typeLabel = (type) => type === 'INCOME' ? 'Thu nhập' : 'Chi tiêu';
const readPage = (data) => Array.isArray(data) ? data : data?.content || [];
const readVisuals = (familyId) => {
  try { return JSON.parse(localStorage.getItem(`pfm.category.visual.${familyId}`) || '{}'); }
  catch { return {}; }
};

function CategoryModal({ initial, onClose, onSave, busy }) {
  const [name, setName] = useState(initial?.name || '');
  const [type, setType] = useState(initial?.type || 'EXPENSE');
  const [color, setColor] = useState(COLORS[0]);
  const [iconName, setIconName] = useState('Tag');
  const editing = Boolean(initial);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"><form onSubmit={(e) => { e.preventDefault(); onSave({ name: name.trim(), type }, { color, iconName }); }} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-extrabold text-slate-900">{editing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}</h2><p className="mt-1 text-xs text-slate-500">Danh mục tùy chỉnh thuộc gia đình đang hoạt động.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button></div>
    {!editing && <div className="mb-4 grid grid-cols-2 gap-2">{[['EXPENSE', 'Khoản chi tiêu'], ['INCOME', 'Khoản thu nhập']].map(([value, label]) => <button type="button" key={value} onClick={() => setType(value)} className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${type === value ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-500'}`}>{label}</button>)}</div>}
    <label className="mb-5 block"><span className="mb-2 block text-sm font-semibold text-slate-700">Tên danh mục</span><input autoFocus required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder={type === 'INCOME' ? 'Ví dụ: Lương thưởng' : 'Ví dụ: Tiền chợ'} className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"/></label>
    <div className="mb-5"><span className="mb-2 block text-sm font-semibold text-slate-700">Màu nhận diện <small className="font-normal text-slate-400">(lưu cục bộ trên giao diện)</small></span><div className="flex flex-wrap gap-2">{COLORS.map((value) => <button type="button" key={value} aria-label={`Chọn màu ${value}`} onClick={() => setColor(value)} className={`h-8 w-8 rounded-full border-2 ${color === value ? 'scale-110 border-slate-800 ring-2 ring-slate-200' : 'border-white'}`} style={{ backgroundColor: value }}/>)}</div></div>
    <div className="mb-6"><span className="mb-2 block text-sm font-semibold text-slate-700">Biểu tượng <small className="font-normal text-slate-400">(lưu cục bộ trên giao diện)</small></span><div className="grid grid-cols-6 gap-2">{ICONS.map(([key, Icon]) => <button type="button" key={key} onClick={() => setIconName(key)} className={`grid h-10 place-items-center rounded-xl border ${iconName === key ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`} aria-label={key}><Icon size={18}/></button>)}</div></div>
    <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Hủy</button><button disabled={busy || !name.trim()} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo danh mục'}</button></div>
  </form></div>;
}

function ConfirmModal({ category, onClose, onConfirm, busy }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-rose-600"><Archive size={20}/></div><h3 className="mt-4 text-lg font-extrabold text-slate-900">Lưu trữ danh mục?</h3><p className="mt-2 text-sm leading-6 text-slate-500">Danh mục <b className="text-slate-800">{category.name}</b> sẽ không còn được chọn cho giao dịch mới. Dữ liệu giao dịch cũ được giữ nguyên. Backend sử dụng xóa mềm (active=false).</p><div className="mt-6 flex justify-end gap-2"><button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Hủy</button><button disabled={busy} onClick={onConfirm} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Đang lưu trữ…' : 'Xác nhận lưu trữ'}</button></div></div></div>;
}

export default function Categories() {
  const { activeFamilyId, activeFamily } = useFamily();
  const [type, setType] = useState('EXPENSE');
  const [keyword, setKeyword] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const currentRole = activeFamily?.myRole;
  const canManage = currentRole === 'OWNER' || currentRole === 'MANAGER';

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await categoryApi.list({ familyId: activeFamilyId || undefined, type, keyword: keyword.trim(), includeArchived, page: 0, size: 100, sort: 'name,asc' });
      setCategories(readPage(data));
    } catch (error) { toast(getErrorMessage(error, 'Không thể tải danh mục.'), 'error'); }
    finally { setLoading(false); }
  }, [activeFamilyId, type, keyword, includeArchived, toast]);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const visibleCategories = useMemo(() => categories, [categories]);
  async function saveCategory(payload, visualMeta) {
    if (!activeFamilyId) { toast('Bạn cần chọn gia đình trước khi tạo danh mục tùy chỉnh.', 'error'); return; }
    setBusy(true);
    try {
      // Chặn trùng tên danh mục hệ thống trước khi gửi request.
      // So sánh không phân biệt hoa thường và dấu tiếng Việt.
      const allCategoriesData = await categoryApi.list({
        familyId: activeFamilyId, type: payload.type, keyword: '',
        includeArchived: true, page: 0, size: 500, sort: 'name,asc'
      });
      const allCategories = readPage(allCategoriesData);
      const normalizeName = (value) => String(value || '').normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('vi');
      const duplicateSystem = allCategories.some((item) => {
        const isSystem = item.system === true || item.familyId == null;
        const isSameRecord = modal?.id && String(item.id) === String(modal.id);
        return isSystem && !isSameRecord && item.type === payload.type &&
          normalizeName(item.name) === normalizeName(payload.name);
      });
      if (duplicateSystem) {
        toast(`Tên “${payload.name}” đã được sử dụng bởi danh mục hệ thống. Vui lòng chọn tên khác.`, 'error');
        return;
      }
      let savedCategory;
      if (modal?.id) savedCategory = await categoryApi.update(modal.id, activeFamilyId, payload);
      else savedCategory = await categoryApi.create(activeFamilyId, payload);
      // Backend Category entity has no icon/color columns. Visual selections are intentionally stored locally.
      const visualKey = `pfm.category.visual.${activeFamilyId}`;
      const current = readVisuals(activeFamilyId);
      const targetId = modal?.id || savedCategory?.id;
      if (targetId) current[targetId] = visualMeta;
      localStorage.setItem(visualKey, JSON.stringify(current));
      setModal(null); toast(modal?.id ? 'Đã cập nhật danh mục.' : 'Đã tạo danh mục tùy chỉnh.', 'success'); await loadCategories();
    } catch (error) { toast(getErrorMessage(error, 'Không thể lưu danh mục.'), 'error'); }
    finally { setBusy(false); }
  }
  async function archiveCategory() {
    if (!archiveTarget || !activeFamilyId) return;
    setBusy(true);
    try { await categoryApi.archive(archiveTarget.id, activeFamilyId); setArchiveTarget(null); toast('Danh mục đã được lưu trữ.', 'success'); await loadCategories(); }
    catch (error) { toast(getErrorMessage(error, 'Không thể lưu trữ danh mục.'), 'error'); }
    finally { setBusy(false); }
  }
  async function restoreCategory(category) {
    setBusy(true);
    try { await categoryApi.restore(category.id, activeFamilyId); toast('Đã khôi phục danh mục.', 'success'); await loadCategories(); }
    catch (error) { toast(getErrorMessage(error, 'Không thể khôi phục danh mục.'), 'error'); }
    finally { setBusy(false); }
  }

  return <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Phân loại dòng tiền · {activeFamily?.name || 'Chưa chọn gia đình'}</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Danh mục thu / chi</h1><p className="mt-2 text-sm text-slate-500">Danh mục hệ thống chỉ xem; danh mục gia đình có thể được quản lý theo vai trò.</p></div>{canManage && <button disabled={!activeFamilyId} onClick={() => setModal({})} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"><Plus size={17}/>Thêm danh mục mới</button>}</header>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1"><button onClick={() => setType('EXPENSE')} className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${type === 'EXPENSE' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500'}`}>Khoản chi tiêu</button><button onClick={() => setType('INCOME')} className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${type === 'INCOME' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Khoản thu nhập</button></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Tìm danh mục…" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-emerald-400 sm:w-64"/></label><label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600"><input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} className="accent-emerald-600"/>Hiện danh mục đã lưu trữ</label></div></div></section>
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-extrabold text-slate-900">{typeLabel(type)} <span className="ml-1 text-sm font-medium text-slate-400">({visibleCategories.length})</span></h2><p className="text-xs text-slate-400">SYSTEM: dùng chung · CUSTOM: thuộc gia đình hiện tại</p></div>
    {loading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><div className="h-28 animate-pulse rounded-2xl bg-slate-100"/><div className="h-28 animate-pulse rounded-2xl bg-slate-100"/><div className="h-28 animate-pulse rounded-2xl bg-slate-100"/></div> : visibleCategories.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><Tag size={28} className="mx-auto text-slate-300"/><h3 className="mt-3 font-bold text-slate-800">Chưa có danh mục phù hợp</h3><p className="mt-1 text-sm text-slate-500">Thử từ khóa khác hoặc tạo danh mục tùy chỉnh cho gia đình.</p>{canManage && <button onClick={() => setModal({})} className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white">Thêm danh mục</button>}</div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleCategories.map((category) => {
      const system = category.system === true || category.familyId == null;
      const archived = category.active === false;
      const savedVisuals = readVisuals(activeFamilyId);
      const meta = savedVisuals[category.id] || {};
      const Icon = iconMap[meta.iconName] || Tag;
      const color = meta.color || (type === 'INCOME' ? '#10b981' : '#f59e0b');
      return <article key={category.id} className={`group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${archived ? 'border-slate-200 opacity-70' : 'border-slate-200 hover:border-emerald-200'}`}><div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ color, backgroundColor: `${color}1c` }}><Icon size={21}/></span><div className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-900">{category.name}</b><div className="mt-1.5 flex flex-wrap gap-1.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${system ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>{system ? 'Hệ thống' : 'Tùy chỉnh'}</span>{archived && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">Đã lưu trữ</span>}</div></div></div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-xs text-slate-400">{typeLabel(category.type)}</span>{!system && canManage && <div className="flex gap-1">{archived ? <button disabled={busy} onClick={() => restoreCategory(category)} title="Khôi phục" className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50"><Archive size={15}/></button> : <><button onClick={() => setModal(category)} title="Sửa danh mục" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-emerald-700"><Pencil size={15}/></button><button onClick={() => setArchiveTarget(category)} title="Lưu trữ danh mục" className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"><Trash2 size={15}/></button></>}</div>}</div>
      </article>;
    })}</div>}
    {!canManage && <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">Vai trò hiện tại chỉ được xem và sử dụng danh mục. OWNER/MANAGER mới có quyền thêm, sửa hoặc lưu trữ danh mục gia đình.</p>}

    {modal && <CategoryModal initial={modal.id ? modal : null} onClose={() => setModal(null)} onSave={saveCategory} busy={busy}/>}
    {archiveTarget && <ConfirmModal category={archiveTarget} onClose={() => setArchiveTarget(null)} onConfirm={archiveCategory} busy={busy}/>}
  </motion.div>;
}
