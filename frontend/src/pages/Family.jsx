import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, Check, Home, Plus, RefreshCw, ShieldAlert,
  Trash2, Users, X, Database, Image as ImageIcon, UserRound,
} from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { familyApi, getErrorMessage } from '../services/familyFinanceApi';
import { useToast } from '../context/ToastContext';

const roleLabel = (role) => ({
  OWNER: 'Chủ gia đình',
  MANAGER: 'Quản lý',
  MEMBER: 'Thành viên',
}[role] || role || 'Thành viên');

const dateLabel = (date) => date
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(date))
    : '—';

function Modal({ title, children, onClose, locked = false }) {
  return (
      <AnimatePresence>
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (!locked && event.target === event.currentTarget) onClose();
            }}
        >
          <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="family-modal-title"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 id="family-modal-title" className="text-lg font-extrabold text-slate-900">{title}</h2>
              <button
                  type="button"
                  disabled={locked}
                  onClick={onClose}
                  aria-label="Đóng hộp thoại"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      </AnimatePresence>
  );
}

function ImpactRow({ icon: Icon, title, description, retained = false }) {
  return (
      <div className="flex items-start gap-3">
      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${retained ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
        <Icon size={16} />
      </span>
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
  );
}

export default function Family() {
  const {
    families, activeFamily, activeFamilyId, setActiveFamilyId,
    refreshFamilies, familiesLoading,
  } = useFamily();

  const [modal, setModal] = useState('');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dangerBusy, setDangerBusy] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const toast = useToast();

  const isOwner = activeFamily?.myRole === 'OWNER';
  const canManage = isOwner || activeFamily?.myRole === 'MANAGER';
  const activeName = activeFamily?.name || '';
  const createdLabel = useMemo(
      () => dateLabel(activeFamily?.createdAt),
      [activeFamily?.createdAt],
  );

  function closeModal() {
    if (dangerBusy || creating || saving) return;
    setModal('');
    setConfirmName('');
  }

  async function createFamily(event) {
    event.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      const data = await familyApi.create({ name: name.trim() });
      await refreshFamilies();
      if (data?.id) setActiveFamilyId(data.id);
      setName('');
      setModal('');
      toast('Đã tạo gia đình mới.', 'success');
    } catch (error) {
      toast(getErrorMessage(error, 'Không thể tạo gia đình.'), 'error');
    } finally {
      setCreating(false);
    }
  }

  async function saveFamily(event) {
    event.preventDefault();
    if (!activeFamilyId || !name.trim()) return;

    setSaving(true);
    try {
      await familyApi.update(activeFamilyId, { name: name.trim() });
      await refreshFamilies();
      setModal('');
      toast('Đã cập nhật tên gia đình.', 'success');
    } catch (error) {
      toast(getErrorMessage(error, 'Không thể cập nhật gia đình.'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function runDangerAction() {
    if (
        !activeFamilyId ||
        confirmName.trim() !== activeName ||
        dangerBusy
    ) return;

    const deleting = modal === 'delete';
    const familyIdToProcess = activeFamilyId;

    setDangerBusy(true);
    try {
      if (deleting) {
        if (!isOwner) {
          toast('Chỉ chủ gia đình mới có quyền giải tán gia đình.', 'error');
          return;
        }
        await familyApi.delete(familyIdToProcess);
      } else {
        await familyApi.leave(familyIdToProcess);
      }

      // Clear the deleted/left family before refreshing the remaining list.
      setActiveFamilyId(null);
      setModal('');
      setConfirmName('');

      try {
        await refreshFamilies();
      } catch {
        // The server action has succeeded; a failed list refresh must not be
        // reported as a failed deletion.
        toast(
            'Thao tác đã hoàn tất. Không tải lại được danh sách; hãy bấm “Làm mới danh sách”.',
            'info',
        );
      }

      toast(
          deleting
              ? 'Đã giải tán gia đình. Tài khoản cá nhân của các thành viên vẫn được giữ lại.'
              : 'Bạn đã rời khỏi gia đình.',
          'success',
      );
    } catch (error) {
      toast(
          getErrorMessage(
              error,
              deleting ? 'Không thể giải tán gia đình.' : 'Không thể rời khỏi gia đình.',
          ),
          'error',
      );
    } finally {
      setDangerBusy(false);
    }
  }

  const isDeleteModal = modal === 'delete';
  const canConfirmDanger = confirmName.trim() === activeName && activeName.length > 0;

  return (
      <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-6xl space-y-6"
      >
        <header>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Không gian chung</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Gia đình</h1>
          <p className="mt-2 text-sm text-slate-500">Chọn không gian làm việc, xem vai trò và quản lý thiết lập gia đình.</p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Không gian gia đình của bạn</h2>
              <p className="mt-1 text-xs text-slate-500">Chọn một gia đình để dùng cho các phân hệ liên quan.</p>
            </div>
            <button
                type="button"
                onClick={() => { setName(''); setModal('create'); }}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800"
            >
              <Plus size={16} />Tạo gia đình mới
            </button>
          </div>

          {familiesLoading ? (
              <div className="py-12 text-center text-sm text-slate-400">Đang tải danh sách gia đình…</div>
          ) : families.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-12 text-center">
                <Home size={28} className="mx-auto text-slate-300" />
                <h3 className="mt-3 font-bold text-slate-800">Bạn chưa có không gian gia đình</h3>
                <p className="mt-1 text-sm text-slate-500">Tạo gia đình mới hoặc chấp nhận lời mời từ thành viên khác.</p>
                <button
                    type="button"
                    onClick={() => { setName(''); setModal('create'); }}
                    className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white"
                >
                  Tạo gia đình đầu tiên
                </button>
              </div>
          ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {families.map((family) => {
                  const active = String(family.id) === String(activeFamilyId);
                  return (
                      <button
                          type="button"
                          key={family.id}
                          onClick={() => setActiveFamilyId(family.id)}
                          className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${active ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        <div className="flex items-start gap-3">
                    <span className={`grid h-11 w-11 place-items-center rounded-xl ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      <Home size={20} />
                    </span>
                          <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <b className="truncate text-sm text-slate-900">{family.name}</b>
                        {active && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">Đang hoạt động</span>}
                      </span>
                      <small className="mt-1 block text-xs text-slate-500">{roleLabel(family.myRole)}</small>
                    </span>
                          {active && <Check size={18} className="text-emerald-700" />}
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-slate-200/70 pt-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1.5"><Users size={14} />{family.memberCount ?? 0} thành viên</span>
                          <span>Ngày tạo: {dateLabel(family.createdAt)}</span>
                        </div>
                      </button>
                  );
                })}
              </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
                type="button"
                onClick={() => refreshFamilies().catch((error) => toast(getErrorMessage(error, 'Không thể tải danh sách gia đình.'), 'error'))}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-700"
            >
              <RefreshCw size={14} />Làm mới danh sách
            </button>
          </div>
        </section>

        {activeFamily && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Gia đình đang hoạt động</p>
                  <h2 className="mt-2 text-xl font-extrabold text-slate-900">{activeName}</h2>
                  <p className="mt-1 text-sm text-slate-500">Tạo ngày {createdLabel} · {activeFamily.memberCount ?? 0} thành viên</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">{roleLabel(activeFamily.myRole)}</span>
              </div>

              {canManage && (
                  <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
                    <div className="mb-4">
                      <h3 className="font-bold text-slate-900">Cài đặt gia đình</h3>
                      <p className="mt-1 text-xs text-slate-500">Thông tin gia đình hiện chỉ quản lý tên và thành viên.</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <b className="text-sm text-slate-800">Tên gia đình</b>
                        <p className="mt-1 text-xs text-slate-500">Chỉ OWNER/MANAGER được thao tác theo phân quyền.</p>
                      </div>
                      <button
                          type="button"
                          onClick={() => { setName(activeName); setModal('edit'); }}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
                      >
                        Đổi tên gia đình
                      </button>
                    </div>
                  </div>
              )}

              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="mb-3">
                  <h3 className="font-bold text-slate-900">Vùng thao tác quan trọng</h3>
                  <p className="mt-1 text-xs text-slate-500">Thao tác giải tán chỉ dành cho OWNER; thành viên khác chỉ có thể rời gia đình.</p>
                </div>
                <div className="flex flex-col justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 p-4 sm:flex-row sm:items-center">
                  <div>
                    <b className="text-sm text-rose-800">{isOwner ? 'Giải tán gia đình' : 'Rời khỏi gia đình'}</b>
                    <p className="mt-1 max-w-xl text-xs leading-5 text-rose-700">
                      {isOwner
                          ? 'Giải tán sẽ xóa không gian gia đình và dữ liệu nghiệp vụ thuộc gia đình. Tài khoản cá nhân của các thành viên không bị xóa.'
                          : 'Bạn sẽ mất quyền truy cập vào không gian gia đình này sau khi rời đi.'}
                    </p>
                  </div>
                  <button
                      type="button"
                      onClick={() => { setConfirmName(''); setModal(isOwner ? 'delete' : 'leave'); }}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100"
                  >
                    {isOwner ? <Trash2 size={15} /> : <X size={15} />}
                    {isOwner ? 'Giải tán gia đình' : 'Rời gia đình'}
                  </button>
                </div>
              </div>
            </section>
        )}

        {modal === 'create' && (
            <Modal title="Tạo gia đình mới" onClose={closeModal} locked={creating}>
              <form onSubmit={createFamily} className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Tên gia đình <span className="text-rose-500">*</span></span>
                  <input autoFocus required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Gia đình Nguyễn" className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50" />
                </label>
                <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">Sau khi tạo thành công, backend tự gán bạn làm OWNER.</p>
                <div className="flex justify-end gap-2">
                  <button type="button" disabled={creating} onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Hủy</button>
                  <button disabled={creating || !name.trim()} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{creating ? 'Đang tạo…' : 'Tạo gia đình'}</button>
                </div>
              </form>
            </Modal>
        )}

        {modal === 'edit' && (
            <Modal title="Đổi tên gia đình" onClose={closeModal} locked={saving}>
              <form onSubmit={saveFamily} className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Tên mới</span>
                  <input autoFocus required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50" />
                </label>
                <div className="flex justify-end gap-2">
                  <button type="button" disabled={saving} onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Hủy</button>
                  <button disabled={saving || !name.trim()} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
                </div>
              </form>
            </Modal>
        )}

        {(modal === 'delete' || modal === 'leave') && (
            <Modal
                title={isDeleteModal ? 'Giải tán gia đình?' : 'Rời khỏi gia đình?'}
                onClose={closeModal}
                locked={dangerBusy}
            >
              {isDeleteModal ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
                      <AlertTriangle size={20} className="mt-0.5 shrink-0 text-rose-600" />
                      <div>
                        <p className="text-sm font-bold text-rose-800">Đây là thao tác không thể hoàn tác</p>
                        <p className="mt-1 text-xs leading-5 text-rose-700">
                          Gia đình <b>{activeName}</b> sẽ bị xóa khỏi hệ thống. Các thành viên sẽ không còn truy cập được không gian này.
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Dữ liệu bị xóa cùng gia đình</p>
                      <div className="space-y-3 rounded-xl border border-slate-200 p-3">
                        <ImpactRow icon={Database} title="Dữ liệu tài chính gia đình" description="Giao dịch, ngân sách, danh mục do gia đình tạo, mục tiêu tiết kiệm và các khoản đóng góp." />
                        <ImpactRow icon={Users} title="Thông tin không gian chung" description="Danh sách thành viên, lời mời và liên kết thành viên với gia đình." />
                      </div>
                    </div>
                  </div>
              ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                    Bạn sẽ rời khỏi <b>{activeName}</b> và không còn quyền truy cập dữ liệu của gia đình này. Không gian gia đình vẫn tồn tại cho các thành viên còn lại.
                  </div>
              )}

              <div className="mt-5">
                <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Để xác nhận, nhập chính xác tên gia đình: <b className="text-slate-900">{activeName}</b>
              </span>
                  <input
                      autoFocus
                      value={confirmName}
                      onChange={(event) => setConfirmName(event.target.value)}
                      disabled={dangerBusy}
                      placeholder="Nhập tên gia đình"
                      className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50 disabled:bg-slate-100"
                  />
                </label>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button type="button" disabled={dangerBusy} onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Hủy</button>
                  <button
                      type="button"
                      disabled={dangerBusy || !canConfirmDanger || (isDeleteModal && !isOwner)}
                      onClick={runDangerAction}
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={15} />
                    {dangerBusy ? 'Đang xử lý…' : isDeleteModal ? 'Xác nhận giải tán' : 'Xác nhận rời gia đình'}
                  </button>
                </div>
              </div>
            </Modal>
        )}
      </motion.div>
  );
}
