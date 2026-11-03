import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Search, Pencil, Trash2, CalendarDays, Filter, ReceiptText, X, LoaderCircle, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { useToast } from '../context/ToastContext';
import { categoryApi, transactionApi, asList, money, numberValue, formatInput, dateLabel } from '../services/pfmApi';
import { ConfirmDialog, EmptyState, Field, Modal, PageLoading } from '../components/PfmUI';
import { familyApi } from '../services/familyFinanceApi';

const readUserId = (user) => user?.id ?? user?.userId;
const localDate = (date) => { const d = new Date(date); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const shiftDate = (date, days) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + days); return localDate(d); };
const dateRangeFor = (preset) => {
  const today = localDate(new Date());
  if (preset === 'yesterday') { const y = shiftDate(today, -1); return { startDate: y, endDate: y }; }
  if (preset === '7days') return { startDate: shiftDate(today, -6), endDate: today };
  if (preset === '30days') return { startDate: shiftDate(today, -29), endDate: today };
  if (preset === 'thisMonth') return { startDate: `${today.slice(0, 7)}-01`, endDate: today };
  if (preset === 'lastMonth') { const first = new Date(`${today.slice(0, 7)}-01T12:00:00`); first.setMonth(first.getMonth() - 1); const startDate = localDate(first); const end = new Date(`${today.slice(0, 7)}-01T12:00:00`); end.setDate(0); return { startDate, endDate: localDate(end) }; }
  return { startDate: '', endDate: '' };
}
function readPage(data) { return { items: asList(data), totalPages: data?.totalPages || 1, number: data?.number || 0, totalElements: data?.totalElements ?? asList(data).length }; }
export default function Transactions() {
  const { user } = useAuth(); const { activeFamily, activeFamilyId } = useFamily(); const toast = useToast();
  const role = activeFamily?.myRole || activeFamily?.role || 'MEMBER'; const canManageAll = role === 'OWNER' || role === 'MANAGER'; const me = readUserId(user);
  const [rows, setRows] = useState([]); const [categories, setCategories] = useState([]); const [members, setMembers] = useState([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [page, setPage] = useState(0); const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ keyword: '', type: '', categoryId: '', startDate: '', endDate: '', userId: '' }); const [datePreset, setDatePreset] = useState('all'); const [form, setForm] = useState(null); const [deleteTarget, setDeleteTarget] = useState(null); const [amountText, setAmountText] = useState(''); const [receipt, setReceipt] = useState(null);
  const loadMembers = useCallback(async () => {
    if (!activeFamilyId || !canManageAll) { setMembers([]); return; }
    try {
      const data = await familyApi.members(activeFamilyId, { page: 0, size: 100 });
      const list = Array.isArray(data) ? data : (data?.content || data?.items || []);
      setMembers(list.filter(member => member?.userId != null));
    } catch (error) {
      setMembers([]);
      toast(error?.response?.data?.message || 'Không thể tải danh sách thành viên.', 'error');
    }
  }, [activeFamilyId, canManageAll, toast]);
  useEffect(() => { loadMembers(); }, [loadMembers]);
  const load = useCallback(async () => {
    if (!activeFamilyId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    try {
      const params = { page, size: 12, sort: 'transactionDate,desc', keyword: filters.keyword || undefined, type: filters.type || undefined, categoryId: filters.categoryId || undefined, startDate: filters.startDate || undefined, endDate: filters.endDate || undefined, userId: canManageAll ? (filters.userId || undefined) : undefined };
      const [tx, cats] = await Promise.all([transactionApi.list(activeFamilyId, params), categoryApi.list(activeFamilyId)]);
      const result = readPage(tx); setRows(result.items); setTotalPages(result.totalPages); setCategories(asList(cats));
    } catch (e) { toast(e?.response?.data?.message || 'Không thể tải giao dịch.', 'error'); }
    finally { setLoading(false); }
  }, [activeFamilyId, page, filters, canManageAll, toast]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const visible = useMemo(() => rows, [rows]);
  const allowed = (tx) => canManageAll || String(tx.userId) === String(me);
  function openCreate() { setForm({}); setAmountText(''); setReceipt(null); }
  function openEdit(tx) { if (!allowed(tx)) return; setForm(tx); setAmountText(formatInput(tx.amount)); setReceipt(null); }
  async function save(e) {
    e.preventDefault(); if (!activeFamilyId) return;
    const payload = { categoryId: Number(form.categoryId), amount: numberValue(amountText), transactionDate: form.transactionDate, description: form.description || '' };
    if (!payload.categoryId || !payload.amount || !payload.transactionDate) { toast('Vui lòng nhập danh mục, số tiền và ngày giao dịch hợp lệ.', 'error'); return; }
    setBusy(true);
    try {
      const saved = form.id ? await transactionApi.update(activeFamilyId, form.id, payload) : await transactionApi.create(activeFamilyId, payload);
      if (receipt && saved?.id) await transactionApi.uploadReceipt(activeFamilyId, saved.id, receipt);
      toast(form.id ? 'Đã cập nhật giao dịch.' : 'Đã thêm giao dịch.', 'success'); setForm(null); await load();
    } catch (e) { toast(e?.response?.data?.message || 'Không thể lưu giao dịch.', 'error'); }
    finally { setBusy(false); }
  }
  async function remove() { setBusy(true); try { await transactionApi.remove(activeFamilyId, deleteTarget.id); toast('Đã xóa giao dịch.', 'success'); setDeleteTarget(null); await load(); } catch (e) { toast(e?.response?.data?.message || 'Không thể xóa giao dịch.', 'error'); } finally { setBusy(false); } }
  const selectedCategory = categories.find(c => String(c.id) === String(form?.categoryId));
  return <motion.div className="pfm-page" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
    <div className="pfm-page-heading"><div><div className="pfm-eyebrow">DÒNG TIỀN GIA ĐÌNH · {activeFamily?.name || 'CHƯA CHỌN GIA ĐÌNH'}</div><h1>Giao dịch</h1><p>Quản lý mọi khoản thu và chi được ghi nhận trong gia đình.</p></div><button className="pfm-btn pfm-btn-primary" onClick={openCreate} disabled={!activeFamilyId}><Plus size={17}/> Thêm giao dịch</button></div>
    <section className="pfm-panel pfm-filter-panel"><div className="pfm-filter-heading"><div><b><Filter size={16}/> Bộ lọc giao dịch</b><span>Thu hẹp kết quả theo nhu cầu của bạn</span></div><button type="button" className="pfm-filter-reset" onClick={()=>{setPage(0);setFilters({keyword:'',type:'',categoryId:'',startDate:'',endDate:'',userId:''});setDatePreset('all');}}>Xóa bộ lọc <X size={14}/></button></div><div className="pfm-filter-grid"><label className="pfm-search"><Search size={17}/><input placeholder="Tìm kiếm giao dịch..." value={filters.keyword} onChange={e=>{setPage(0);setFilters(f=>({...f,keyword:e.target.value}));}}/></label><label className="pfm-select"><span className="pfm-filter-label">Loại</span><select value={filters.type} onChange={e=>{setPage(0);setFilters(f=>({...f,type:e.target.value}));}}><option value="">Tất cả</option><option value="INCOME">Thu nhập</option><option value="EXPENSE">Chi tiêu</option></select></label><label className="pfm-select"><span className="pfm-filter-label">Danh mục</span><select value={filters.categoryId} onChange={e=>{setPage(0);setFilters(f=>({...f,categoryId:e.target.value}));}}><option value="">Tất cả danh mục</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="pfm-select pfm-date-preset"><span className="pfm-filter-label">Khoảng thời gian</span><select value={datePreset} onChange={e=>{const preset=e.target.value;setDatePreset(preset);setPage(0);if(preset!=='custom')setFilters(f=>({...f,...dateRangeFor(preset)}));else setFilters(f=>({...f,startDate:'',endDate:''}));}}><option value="all">Tất cả thời gian</option><option value="yesterday">Hôm qua</option><option value="7days">7 ngày qua</option><option value="30days">30 ngày qua</option><option value="thisMonth">Tháng này</option><option value="lastMonth">Tháng trước</option><option value="custom">Tùy chỉnh ngày</option></select></label>{datePreset==='custom'&&<><label className="pfm-date pfm-date-filter"><span className="pfm-filter-label">Từ ngày</span><input aria-label="Từ ngày" type="date" value={filters.startDate} max={filters.endDate||undefined} onChange={e=>{setPage(0);setFilters(f=>({...f,startDate:e.target.value}));}}/></label><label className="pfm-date pfm-date-filter"><span className="pfm-filter-label">Đến ngày</span><input aria-label="Đến ngày" type="date" value={filters.endDate} min={filters.startDate||undefined} onChange={e=>{setPage(0);setFilters(f=>({...f,endDate:e.target.value}));}}/></label></> }{canManageAll&&<label className="pfm-select"><span className="pfm-filter-label">Thành viên</span><select value={filters.userId} onChange={e=>{setPage(0);setFilters(f=>({...f,userId:e.target.value}));}}><option value="">Tất cả thành viên</option>{members.map(member=><option key={member.userId} value={member.userId}>{member.fullName || member.username || `Thành viên ${member.userId}`}</option>)}</select></label>}</div></section>
    <section className="pfm-panel pfm-table-panel"><div className="pfm-panel-title"><div><h2>Lịch sử giao dịch</h2><span>{rows.length} giao dịch trên trang này</span></div><span className="pfm-chip">{activeFamily?.myRole || 'MEMBER'}</span></div>
      {loading?<PageLoading/>:visible.length===0?<EmptyState title="Chưa có giao dịch" description="Thay đổi bộ lọc hoặc thêm giao dịch đầu tiên của gia đình."/>:<><div className="pfm-table-wrap"><table className="pfm-table"><thead><tr><th>Ngày</th><th>Danh mục</th><th>Mô tả</th><th>Người ghi nhận</th><th className="right">Số tiền</th><th className="right">Thao tác</th></tr></thead><tbody>{visible.map(tx=>{const income=tx.categoryType==='INCOME';return <tr key={tx.id}><td>{dateLabel(tx.transactionDate)}</td><td><span className={`pfm-category-dot ${income?'income':'expense'}`}/>{tx.categoryName}</td><td><b>{tx.description || 'Không có ghi chú'}</b>{tx.receiptImage&&<a className="pfm-receipt-link" href={tx.receiptImage} target="_blank" rel="noreferrer"> · Hóa đơn</a>}</td><td>{tx.userFullName || tx.username || '—'}</td><td className={`right pfm-money ${income?'positive':'negative'}`}>{income?'+':'−'}{money(tx.amount)}</td><td><div className="pfm-row-actions">{allowed(tx)?<><button title="Sửa" onClick={()=>openEdit(tx)}><Pencil size={16}/></button><button title="Xóa" className="danger" onClick={()=>setDeleteTarget(tx)}><Trash2 size={16}/></button></>:<span className="pfm-muted">Chỉ xem</span>}</div></td></tr>})}</tbody></table></div><div className="pfm-mobile-cards">{visible.map(tx=>{const income=tx.categoryType==='INCOME';return <article className="pfm-tx-card" key={`mobile-${tx.id}`}><div className="pfm-tx-card-top"><span className={`pfm-category-dot ${income?'income':'expense'}`}/><b>{tx.categoryName}</b><time>{dateLabel(tx.transactionDate)}</time></div><strong>{tx.description||'Không có ghi chú'}</strong><div className="pfm-tx-card-bottom"><b className={income?'positive':'negative'}>{income?'+':'−'}{money(tx.amount)}</b><span>{tx.userFullName||tx.username||'—'}</span><div className="pfm-row-actions">{allowed(tx)&&<><button onClick={()=>openEdit(tx)}><Pencil size={15}/></button><button className="danger" onClick={()=>setDeleteTarget(tx)}><Trash2 size={15}/></button></>}</div></div></article>})}</div><div className="pfm-pagination"><span>Trang {page+1} / {totalPages}</span><div><button disabled={page<=0} onClick={()=>setPage(p=>p-1)}>Trước</button><button disabled={page+1>=totalPages} onClick={()=>setPage(p=>p+1)}>Tiếp</button></div></div></>}
    </section>
    {form&&<Modal title={form.id?'Chỉnh sửa giao dịch':'Thêm giao dịch'} onClose={()=>setForm(null)}><form className="pfm-form" onSubmit={save}><Field label="Danh mục"><select required value={form.categoryId||''} onChange={e=>setForm(f=>({...f,categoryId:e.target.value}))}><option value="">Chọn danh mục</option>{categories.filter(c=>c.active!==false).map(c=><option key={c.id} value={c.id}>{c.type==='INCOME'?'Thu · ':'Chi · '}{c.name}</option>)}</select></Field><Field label="Số tiền (VND)"><input required inputMode="numeric" value={amountText} onChange={e=>setAmountText(formatInput(e.target.value))} placeholder="1.000.000"/></Field><Field label="Ngày giao dịch"><input required type="date" value={form.transactionDate||''} onChange={e=>setForm(f=>({...f,transactionDate:e.target.value}))}/></Field><Field label="Mô tả / ghi chú"><textarea maxLength={255} rows={3} value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Ví dụ: tiền chợ, tiền lương…"/></Field><Field label="Ảnh hóa đơn (không bắt buộc)"><input type="file" accept="image/*" onChange={e=>setReceipt(e.target.files?.[0]||null)}/></Field><p className="pfm-help">Loại giao dịch được xác định theo loại danh mục ({selectedCategory?.type==='INCOME'?'Thu nhập':selectedCategory?.type==='EXPENSE'?'Chi tiêu':'chưa chọn danh mục'}), không gửi thuộc tính type.</p><div className="pfm-form-actions"><button type="button" className="pfm-btn pfm-btn-light" onClick={()=>setForm(null)}>Hủy</button><button className="pfm-btn pfm-btn-primary" disabled={busy}>{busy&&<LoaderCircle className="pfm-spin" size={16}/>}Lưu giao dịch</button></div></form></Modal>}
    {deleteTarget&&<ConfirmDialog title="Xóa giao dịch?" description={`Bạn sắp xóa giao dịch “${deleteTarget.description||deleteTarget.categoryName}” trị giá ${money(deleteTarget.amount)}. Thao tác này không thể hoàn tác.`} onCancel={()=>setDeleteTarget(null)} onConfirm={remove} busy={busy} confirmText="Xóa giao dịch"/>}
  </motion.div>;
}
