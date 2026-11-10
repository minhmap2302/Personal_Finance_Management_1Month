import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Archive, BriefcaseBusiness, Bus, Coffee, GraduationCap,
  HeartPulse, Home, Lightbulb, Pencil, Plus, Search,
  ShoppingBag, ShoppingCart, Tag, Trash2, Wallet, X,
} from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { useToast } from '../context/ToastContext';
import { categoryApi, getErrorMessage } from '../services/familyFinanceApi';
import PageHeader from '../components/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const COLORS = [
  '#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#f43f5e',
  '#14b8a6', '#6366f1', '#f97316', '#64748b', '#84cc16',
];

const ICONS = [
  ['Tag', Tag],
  ['ShoppingCart', ShoppingCart],
  ['ShoppingBag', ShoppingBag],
  ['Home', Home],
  ['Coffee', Coffee],
  ['Bus', Bus],
  ['Wallet', Wallet],
  ['GraduationCap', GraduationCap],
  ['HeartPulse', HeartPulse],
  ['Lightbulb', Lightbulb],
  ['BriefcaseBusiness', BriefcaseBusiness],
];

const iconMap = Object.fromEntries(ICONS);
const typeLabel = (type) => (type === 'INCOME' ? 'Thu nhập' : 'Chi tiêu');
const readPage = (data) => (Array.isArray(data) ? data : data?.content || []);
const readVisuals = (familyId) => {
  try {
    return JSON.parse(localStorage.getItem(`pfm.category.visual.${familyId}`) || '{}');
  } catch {
    return {};
  }
};

/* ── Category Create / Edit Modal ────────────────────────────── */
function CategoryModal({ initial, onClose, onSave, busy }) {
  const [name, setName]         = useState(initial?.name || '');
  const [type, setType]         = useState(initial?.type || 'EXPENSE');
  const [color, setColor]       = useState(COLORS[0]);
  const [iconName, setIconName] = useState('Tag');

  const editing = Boolean(initial);

  return (
    <Modal
      isOpen
      onClose={onClose}
      locked={busy}
      title={editing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
      description="Danh mục tùy chỉnh thuộc không gian gia đình đang hoạt động."
      maxWidth="max-w-lg"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ name: name.trim(), type }, { color, iconName });
        }}
        className="space-y-4 pt-1"
      >
        {/* Type toggle: Only when creating new */}
        {!editing && (
          <div>
            <label className="block text-xs font-bold text-fin-text dark:text-fin-text-dark mb-1.5">
              Loại danh mục
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-app dark:bg-sidebar-dark border border-fin-border dark:border-fin-border-dark">
              {[
                ['EXPENSE', 'Khoản chi tiêu'],
                ['INCOME', 'Khoản thu nhập'],
              ].map(([value, label]) => {
                const isSelected = type === value;
                return (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setType(value)}
                    className={`rounded-lg py-2 text-xs font-bold transition-all ${
                      isSelected
                        ? value === 'INCOME'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-rose-600 text-white shadow-sm'
                        : 'text-fin-secondary hover:text-fin-text'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Category name input */}
        <div>
          <label htmlFor="category-name" className="block text-xs font-bold text-fin-text dark:text-fin-text-dark mb-1.5">
            Tên danh mục <span className="text-expense">*</span>
          </label>
          <input
            id="category-name"
            autoFocus
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === 'INCOME' ? 'Ví dụ: Lương thưởng, Đầu tư' : 'Ví dụ: Tiền chợ, Điện nước'}
            className="h-11 w-full rounded-input border border-fin-border dark:border-fin-border-dark bg-surface dark:bg-surface-dark px-3.5 text-sm text-fin-text dark:text-fin-text-dark placeholder:text-fin-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        {/* Color picker */}
        <div>
          <span className="block text-xs font-bold text-fin-text dark:text-fin-text-dark mb-2">
            Màu nhận diện <small className="font-normal text-fin-muted">(lưu trữ trên giao diện)</small>
          </span>
          <div className="flex flex-wrap gap-2.5">
            {COLORS.map((value) => {
              const isSelected = color === value;
              return (
                <button
                  type="button"
                  key={value}
                  aria-label={`Chọn màu ${value}`}
                  onClick={() => setColor(value)}
                  className={`h-7 w-7 rounded-full border-2 transition-transform duration-150 ${
                    isSelected
                      ? 'scale-110 border-white ring-2 ring-primary shadow-sm'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: value }}
                />
              );
            })}
          </div>
        </div>

        {/* Icon picker */}
        <div>
          <span className="block text-xs font-bold text-fin-text dark:text-fin-text-dark mb-2">
            Biểu tượng <small className="font-normal text-fin-muted">(lưu trữ trên giao diện)</small>
          </span>
          <div className="grid grid-cols-6 gap-2">
            {ICONS.map(([key, Icon]) => {
              const isSelected = iconName === key;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setIconName(key)}
                  className={`grid h-10 place-items-center rounded-xl border transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary dark:text-primary-dark font-bold ring-1 ring-primary/40'
                      : 'border-fin-border dark:border-fin-border-dark text-fin-secondary hover:bg-app dark:hover:bg-sidebar-dark'
                  }`}
                  aria-label={key}
                >
                  <Icon size={17} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal actions */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-fin-border/60 dark:border-fin-border-dark/60">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={busy}
            disabled={!name.trim()}
          >
            {editing ? 'Lưu thay đổi' : 'Tạo danh mục'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Main Categories Component ───────────────────────────────── */
export default function Categories() {
  const { activeFamilyId, activeFamily } = useFamily();
  const [type, setType]                   = useState('EXPENSE');
  const [keyword, setKeyword]             = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [categories, setCategories]       = useState([]);
  const [loading, setLoading]             = useState(false);
  const [busy, setBusy]                   = useState(false);
  const toast                             = useToast();

  const [modal, setModal]                 = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);

  const currentRole = activeFamily?.myRole;
  const canManage   = currentRole === 'OWNER' || currentRole === 'MANAGER';

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await categoryApi.list({
        familyId: activeFamilyId || undefined,
        type,
        keyword: keyword.trim(),
        includeArchived,
        page: 0,
        size: 100,
        sort: 'name,asc',
      });
      setCategories(readPage(data));
    } catch (error) {
      toast(getErrorMessage(error, 'Không thể tải danh mục.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, type, keyword, includeArchived, toast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const visibleCategories = useMemo(() => categories, [categories]);

  async function saveCategory(payload, visualMeta) {
    if (!activeFamilyId) {
      toast('Bạn cần chọn gia đình trước khi tạo danh mục tùy chỉnh.', 'error');
      return;
    }
    setBusy(true);
    try {
      // Chặn trùng tên danh mục hệ thống trước khi gửi request.
      const allCategoriesData = await categoryApi.list({
        familyId: activeFamilyId,
        type: payload.type,
        keyword: '',
        includeArchived: true,
        page: 0,
        size: 500,
        sort: 'name,asc',
      });
      const allCategories = readPage(allCategoriesData);
      const normalizeName = (value) =>
        String(value || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toLocaleLowerCase('vi');

      const duplicateSystem = allCategories.some((item) => {
        const isSystem     = item.system === true || item.familyId == null;
        const isSameRecord = modal?.id && String(item.id) === String(modal.id);
        return (
          isSystem &&
          !isSameRecord &&
          item.type === payload.type &&
          normalizeName(item.name) === normalizeName(payload.name)
        );
      });

      if (duplicateSystem) {
        toast(`Tên “${payload.name}” đã được sử dụng bởi danh mục hệ thống. Vui lòng chọn tên khác.`, 'error');
        return;
      }

      let savedCategory;
      if (modal?.id) {
        savedCategory = await categoryApi.update(modal.id, activeFamilyId, payload);
      } else {
        savedCategory = await categoryApi.create(activeFamilyId, payload);
      }

      // Visual selections stored locally
      const visualKey = `pfm.category.visual.${activeFamilyId}`;
      const current   = readVisuals(activeFamilyId);
      const targetId  = modal?.id || savedCategory?.id;
      if (targetId) current[targetId] = visualMeta;
      localStorage.setItem(visualKey, JSON.stringify(current));

      setModal(null);
      toast(modal?.id ? 'Đã cập nhật danh mục.' : 'Đã tạo danh mục tùy chỉnh.', 'success');
      await loadCategories();
    } catch (error) {
      toast(getErrorMessage(error, 'Không thể lưu danh mục.'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function archiveCategory() {
    if (!archiveTarget || !activeFamilyId) return;
    setBusy(true);
    try {
      await categoryApi.archive(archiveTarget.id, activeFamilyId);
      setArchiveTarget(null);
      toast('Danh mục đã được lưu trữ.', 'success');
      await loadCategories();
    } catch (error) {
      toast(getErrorMessage(error, 'Không thể lưu trữ danh mục.'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function restoreCategory(category) {
    setBusy(true);
    try {
      await categoryApi.restore(category.id, activeFamilyId);
      toast('Đã khôi phục danh mục.', 'success');
      await loadCategories();
    } catch (error) {
      toast(getErrorMessage(error, 'Không thể khôi phục danh mục.'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-6xl space-y-6"
    >
      {/* ── Page Header ────────────────────────────────────── */}
      <PageHeader
        title="Danh mục thu / chi"
        description="Quản lý và phân loại các khoản thu nhập và chi tiêu của gia đình."
        icon={Tag}
        badge={`Gia đình: ${activeFamily?.name || 'Chưa chọn'}`}
        actions={
          canManage && (
            <Button
              variant="primary"
              size="md"
              disabled={!activeFamilyId}
              onClick={() => setModal({})}
              icon={Plus}
            >
              Thêm danh mục mới
            </Button>
          )
        }
      />

      {/* ── Filter Toolbar ─────────────────────────────────── */}
      <section className="rounded-2xl border border-fin-border dark:border-fin-border-dark bg-surface dark:bg-surface-dark p-4 shadow-card dark:shadow-card-dark transition-colors">
        <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
          {/* Income / Expense Tabs */}
          <div className="grid grid-cols-2 rounded-xl bg-app dark:bg-sidebar-dark p-1 border border-fin-border/60 dark:border-fin-border-dark/60">
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`rounded-lg px-5 py-2 text-xs font-bold transition-all ${
                type === 'EXPENSE'
                  ? 'bg-surface dark:bg-surface-dark text-expense shadow-sm'
                  : 'text-fin-secondary hover:text-fin-text'
              }`}
            >
              Khoản chi tiêu
            </button>
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`rounded-lg px-5 py-2 text-xs font-bold transition-all ${
                type === 'INCOME'
                  ? 'bg-surface dark:bg-surface-dark text-income shadow-sm'
                  : 'text-fin-secondary hover:text-fin-text'
              }`}
            >
              Khoản thu nhập
            </button>
          </div>

          {/* Search & Archived Toggle */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <label className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-fin-muted pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm danh mục…"
                className="h-10 w-full sm:w-64 rounded-input border border-fin-border dark:border-fin-border-dark bg-surface dark:bg-surface-dark pl-9 pr-3 text-xs text-fin-text dark:text-fin-text-dark placeholder:text-fin-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </label>

            <label className="flex h-10 items-center gap-2 rounded-input border border-fin-border dark:border-fin-border-dark bg-surface dark:bg-surface-dark px-3 text-xs font-semibold text-fin-secondary select-none cursor-pointer">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="accent-primary"
              />
              <span>Hiện mục đã lưu trữ</span>
            </label>
          </div>
        </div>
      </section>

      {/* ── Subtitle & Count ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-bold text-fin-text dark:text-fin-text-dark">
          {typeLabel(type)}{' '}
          <span className="font-normal text-fin-muted font-tabular">
            ({visibleCategories.length})
          </span>
        </h2>
        <p className="text-xs text-fin-muted">
          Hệ thống: Dùng chung toàn app · Tùy chỉnh: Thuộc gia đình hiện tại
        </p>
      </div>

      {/* ── Grid List / Skeleton / Empty ─────────────────────── */}
      {loading ? (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl bg-app dark:bg-sidebar-dark border border-fin-border/60 dark:border-fin-border-dark/60"
            />
          ))}
        </div>
      ) : visibleCategories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-fin-border dark:border-fin-border-dark bg-surface dark:bg-surface-dark px-6 py-14 text-center">
          <Tag size={28} className="mx-auto text-fin-muted opacity-60" aria-hidden="true" />
          <h3 className="mt-3 font-bold text-fin-text dark:text-fin-text-dark">
            Chưa có danh mục phù hợp
          </h3>
          <p className="mt-1 text-xs text-fin-secondary dark:text-fin-muted">
            Thử từ khóa khác hoặc tạo thêm danh mục tùy chỉnh cho gia đình.
          </p>
          {canManage && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setModal({})}
              className="mt-4"
              icon={Plus}
            >
              Thêm danh mục
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCategories.map((category) => {
            const system       = category.system === true || category.familyId == null;
            const archived     = category.active === false;
            const savedVisuals = readVisuals(activeFamilyId);
            const meta         = savedVisuals[category.id] || {};
            const Icon         = iconMap[meta.iconName] || Tag;
            const color        = meta.color || (type === 'INCOME' ? '#10b981' : '#f59e0b');

            return (
              <article
                key={category.id}
                className={`group rounded-2xl border bg-surface dark:bg-surface-dark p-4 shadow-card dark:shadow-card-dark transition-all duration-200 hover:-translate-y-0.5 ${
                  archived
                    ? 'border-fin-border/60 dark:border-fin-border-dark/60 opacity-65'
                    : 'border-fin-border dark:border-fin-border-dark hover:border-primary/40 dark:hover:border-primary/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105"
                    style={{ color, backgroundColor: `${color}18` }}
                    aria-hidden="true"
                  >
                    <Icon size={20} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-sm font-bold text-fin-text dark:text-fin-text-dark">
                      {category.name}
                    </b>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge variant={system ? 'violet' : 'emerald'} size="sm">
                        {system ? 'Hệ thống' : 'Tùy chỉnh'}
                      </Badge>
                      {archived && (
                        <Badge variant="slate" size="sm">
                          Đã lưu trữ
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 flex items-center justify-between border-t border-fin-border/60 dark:border-fin-border-dark/60 pt-3">
                  <span className="text-xs text-fin-muted font-medium">
                    {typeLabel(category.type)}
                  </span>

                  {!system && canManage && (
                    <div className="flex items-center gap-1">
                      {archived ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => restoreCategory(category)}
                          title="Khôi phục danh mục"
                          className="rounded-lg p-1.5 text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Archive size={15} />
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setModal(category)}
                            title="Sửa danh mục"
                            className="rounded-lg p-1.5 text-fin-muted hover:text-primary hover:bg-app dark:hover:bg-sidebar-dark transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setArchiveTarget(category)}
                            title="Lưu trữ danh mục"
                            className="rounded-lg p-1.5 text-fin-muted hover:text-expense hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Role permission notice */}
      {!canManage && (
        <div className="rounded-xl border border-fin-border dark:border-fin-border-dark bg-app dark:bg-sidebar-dark px-4 py-3 text-xs text-fin-secondary dark:text-fin-muted">
          💡 Vai trò hiện tại của bạn chỉ được xem và sử dụng danh mục. Chủ gia đình (OWNER) hoặc Quản lý (MANAGER) mới có quyền thêm, sửa hoặc lưu trữ danh mục.
        </div>
      )}

      {/* Modal: Category Create/Edit */}
      {modal && (
        <CategoryModal
          initial={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSave={saveCategory}
          busy={busy}
        />
      )}

      {/* ConfirmDialog: Archive Category */}
      <ConfirmDialog
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={archiveCategory}
        title="Lưu trữ danh mục?"
        description={`Danh mục "${archiveTarget?.name}" sẽ không còn được chọn cho giao dịch mới. Dữ liệu giao dịch cũ được giữ nguyên (xóa mềm).`}
        confirmText="Xác nhận lưu trữ"
        cancelText="Hủy"
        variant="danger"
        busy={busy}
        icon={Archive}
      />
    </motion.div>
  );
}
