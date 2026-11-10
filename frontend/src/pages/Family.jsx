import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  Home,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
  Database,
  ArrowRight,
  Shield,
  Crown,
  UserCheck,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { Button, Badge, Card, Input, Modal } from '../components/ui';
import { useFamily } from '../context/FamilyContext';
import { familyApi, getErrorMessage } from '../services/familyFinanceApi';
import { useToast } from '../context/ToastContext';

const roleMeta = {
  OWNER: { label: 'Chủ gia đình', variant: 'amber', icon: Crown },
  MANAGER: { label: 'Quản lý', variant: 'sky', icon: Shield },
  MEMBER: { label: 'Thành viên', variant: 'slate', icon: null },
};

const dateLabel = (date) =>
  date
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(date))
    : '—';

function ImpactRow({ icon: Icon, title, description, retained = false }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`mt-0.5 h-8 w-8 shrink-0 grid place-items-center rounded-lg ${
          retained
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
        }`}
      >
        <Icon size={16} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {title}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function Family() {
  const {
    families,
    activeFamily,
    activeFamilyId,
    setActiveFamilyId,
    refreshFamilies,
    familiesLoading,
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
    [activeFamily?.createdAt]
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
      toast('Đã tạo không gian gia đình mới.', 'success');
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
    )
      return;

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
          'info'
        );
      }

      toast(
        deleting
          ? 'Đã giải tán gia đình. Tài khoản cá nhân của các thành viên vẫn được giữ lại.'
          : 'Bạn đã rời khỏi gia đình.',
        'success'
      );
    } catch (error) {
      toast(
        getErrorMessage(
          error,
          deleting
            ? 'Không thể giải tán gia đình.'
            : 'Không thể rời khỏi gia đình.'
        ),
        'error'
      );
    } finally {
      setDangerBusy(false);
    }
  }

  const isDeleteModal = modal === 'delete';
  const canConfirmDanger =
    confirmName.trim() === activeName && activeName.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Tiêu đề trang */}
      <PageHeader
        title="Không gian Gia đình"
        subtitle="Chọn không gian làm việc, xem vai trò và quản lý các thiết lập gia đình"
        breadcrumbs={[{ label: 'Cài đặt' }, { label: 'Gia đình' }]}
        badge="FinHome V3"
        action={
          <Button
            variant="primary"
            icon={Plus}
            size="sm"
            onClick={() => {
              setName('');
              setModal('create');
            }}
          >
            Tạo gia đình mới
          </Button>
        }
      />

      {/* Danh sách không gian gia đình */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Không gian gia đình của bạn
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Chọn một gia đình để làm việc trong các phân hệ quản lý tài chính.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={() =>
              refreshFamilies().catch((error) =>
                toast(
                  getErrorMessage(error, 'Không thể tải danh sách gia đình.'),
                  'error'
                )
              )
            }
          >
            Làm mới danh sách
          </Button>
        </div>

        {familiesLoading ? (
          <div className="py-12 text-center text-sm text-slate-400">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mb-2" />
            <p>Đang tải danh sách gia đình…</p>
          </div>
        ) : families.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-slate-50/50 dark:bg-slate-900/40">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center mx-auto mb-3">
              <Home size={24} />
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              Bạn chưa có không gian gia đình
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Hãy tạo một không gian mới hoặc chấp nhận lời mời từ thành viên khác ở trang Thành viên.
            </p>
            <div className="mt-4">
              <Button
                variant="primary"
                icon={Plus}
                size="sm"
                onClick={() => {
                  setName('');
                  setModal('create');
                }}
              >
                Tạo gia đình đầu tiên
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2">
            {families.map((family) => {
              const active = String(family.id) === String(activeFamilyId);
              const meta = roleMeta[family.myRole] || roleMeta.MEMBER;

              return (
                <div
                  key={family.id}
                  onClick={() => setActiveFamilyId(family.id)}
                  className={`group relative cursor-pointer rounded-2xl border p-4.5 transition-all text-left ${
                    active
                      ? 'border-emerald-500/80 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm ring-2 ring-emerald-500/20 dark:ring-emerald-500/30'
                      : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-11 w-11 rounded-xl grid place-items-center shrink-0 transition-colors ${
                          active
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-emerald-50 group-hover:text-emerald-700 dark:group-hover:bg-emerald-950/40 dark:group-hover:text-emerald-400'
                        }`}
                      >
                        <Home size={20} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                            {family.name}
                          </h4>
                          {active && (
                            <Badge variant="emerald" size="sm" dot>
                              Đang hoạt động
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1">
                          <Badge
                            variant={meta.variant}
                            size="sm"
                            icon={meta.icon}
                          >
                            {meta.label}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {active && (
                      <div className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center shrink-0 border border-emerald-500/30">
                        <Check size={14} />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={14} className="text-slate-400" />
                      {family.memberCount ?? 0} thành viên
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400" />
                      {dateLabel(family.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Chi tiết và Quản trị Gia đình đang hoạt động */}
      {activeFamily && (
        <Card className="border-emerald-200/60 dark:border-emerald-900/40 bg-gradient-to-br from-white via-emerald-50/15 to-white dark:from-slate-900 dark:via-emerald-950/10 dark:to-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Gia đình đang hoạt động
                </span>
                <Badge variant="emerald" size="sm" dot>
                  Được chọn
                </Badge>
              </div>
              <h3 className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {activeName}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Khởi tạo ngày {createdLabel} • {activeFamily.memberCount ?? 0} thành viên đồng hành
              </p>
            </div>

            <Badge
              variant={
                roleMeta[activeFamily.myRole]?.variant || 'slate'
              }
              size="md"
              icon={roleMeta[activeFamily.myRole]?.icon}
            >
              {roleMeta[activeFamily.myRole]?.label || activeFamily.myRole}
            </Badge>
          </div>

          {/* Thiết lập đổi tên (chỉ dành cho OWNER và MANAGER) */}
          {canManage && (
            <div className="mt-6 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/60 p-4.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Tên không gian gia đình
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Tên hiển thị chung cho tất cả các thành viên trong gia đình.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setName(activeName);
                    setModal('edit');
                  }}
                >
                  Đổi tên gia đình
                </Button>
              </div>
            </div>
          )}

          {/* Vùng thao tác quan trọng (Danger Zone) */}
          <div className="mt-6 pt-5 border-t border-slate-200/70 dark:border-slate-800/80">
            <div className="mb-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Vùng thao tác quan trọng
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isOwner
                  ? 'Thao tác giải tán xóa toàn bộ dữ liệu tài chính của gia đình và không thể hoàn tác.'
                  : 'Rời gia đình sẽ làm bạn mất quyền truy cập vào dữ liệu thu chi chung.'}
              </p>
            </div>

            <div className="rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <b className="text-sm font-bold text-rose-800 dark:text-rose-300">
                  {isOwner ? 'Giải tán gia đình' : 'Rời khỏi gia đình'}
                </b>
                <p className="mt-1 text-xs text-rose-700/90 dark:text-rose-300/80 leading-relaxed max-w-xl">
                  {isOwner
                    ? 'Giải tán sẽ xóa không gian gia đình và tất cả dữ liệu thu chi, ngân sách, mục tiêu chung. Tài khoản cá nhân của các thành viên được giữ nguyên.'
                    : 'Bạn sẽ rời khỏi không gian gia đình này và không thể xem lại các giao dịch chung trừ khi được mời lại.'}
                </p>
              </div>

              <Button
                variant="danger"
                size="sm"
                icon={isOwner ? Trash2 : X}
                onClick={() => {
                  setConfirmName('');
                  setModal(isOwner ? 'delete' : 'leave');
                }}
              >
                {isOwner ? 'Giải tán gia đình' : 'Rời gia đình'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Modal Tạo gia đình mới */}
      <Modal
        isOpen={modal === 'create'}
        onClose={closeModal}
        locked={creating}
        title="Tạo gia đình mới"
        description="Khởi tạo không gian tài chính mới cho gia đình bạn"
      >
        <form onSubmit={createFamily} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tên gia đình <span className="text-rose-500">*</span>
            </label>
            <Input
              autoFocus
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ví dụ: Gia đình Nguyễn, Tổ ấm nhỏ…"
              icon={Home}
            />
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
            💡 Sau khi tạo thành công, hệ thống sẽ tự động gán bạn làm <strong>Chủ gia đình (OWNER)</strong> để bạn có toàn quyền quản trị và mời thành viên.
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={creating}
              onClick={closeModal}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={creating}
              disabled={creating || !name.trim()}
            >
              {creating ? 'Đang tạo…' : 'Tạo gia đình'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Đổi tên gia đình */}
      <Modal
        isOpen={modal === 'edit'}
        onClose={closeModal}
        locked={saving}
        title="Đổi tên gia đình"
        description="Cập nhật tên hiển thị của không gian gia đình"
      >
        <form onSubmit={saveFamily} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tên mới của gia đình <span className="text-rose-500">*</span>
            </label>
            <Input
              autoFocus
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nhập tên mới…"
              icon={Home}
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={closeModal}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={saving}
              disabled={saving || !name.trim()}
            >
              {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Xác nhận Nguy hiểm (Delete / Leave) */}
      <Modal
        isOpen={modal === 'delete' || modal === 'leave'}
        onClose={closeModal}
        locked={dangerBusy}
        maxWidth="max-w-lg"
        title={isDeleteModal ? 'Giải tán gia đình?' : 'Rời khỏi gia đình?'}
      >
        <div className="space-y-4">
          {isDeleteModal ? (
            <>
              <div className="flex items-start gap-3 rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 p-3.5">
                <AlertTriangle
                  size={20}
                  className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400"
                />
                <div>
                  <p className="text-sm font-bold text-rose-800 dark:text-rose-300">
                    Cảnh báo: Hành động này không thể hoàn tác
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-rose-700/90 dark:text-rose-300/90">
                    Không gian gia đình <strong>{activeName}</strong> sẽ bị xóa vĩnh viễn khỏi hệ thống. Tất cả thành viên sẽ lập tức mất quyền truy cập.
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Dữ liệu bị xóa cùng gia đình
                </p>
                <div className="space-y-2.5 rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/50">
                  <ImpactRow
                    icon={Database}
                    title="Dữ liệu tài chính gia đình"
                    description="Toàn bộ giao dịch thu chi, ngân sách, danh mục và mục tiêu tiết kiệm thuộc gia đình này."
                  />
                  <ImpactRow
                    icon={Users}
                    title="Liên kết thành viên & lời mời"
                    description="Mọi lời mời đang chờ và liên kết thành viên với không gian này sẽ bị hủy bỏ."
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/40 p-3.5 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
              <AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                Bạn sẽ rời khỏi không gian <strong>{activeName}</strong>. Không gian và dữ liệu thu chi vẫn được giữ lại cho các thành viên khác trong gia đình.
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Để xác nhận, vui lòng nhập chính xác tên gia đình:{' '}
              <span className="font-extrabold text-rose-600 dark:text-rose-400">
                {activeName}
              </span>
            </label>
            <Input
              autoFocus
              value={confirmName}
              onChange={(event) => setConfirmName(event.target.value)}
              disabled={dangerBusy}
              placeholder="Nhập chính xác tên gia đình…"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={dangerBusy}
              onClick={closeModal}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              icon={Trash2}
              loading={dangerBusy}
              disabled={
                dangerBusy || !canConfirmDanger || (isDeleteModal && !isOwner)
              }
              onClick={runDangerAction}
            >
              {dangerBusy
                ? 'Đang xử lý…'
                : isDeleteModal
                ? 'Xác nhận giải tán'
                : 'Xác nhận rời gia đình'}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
