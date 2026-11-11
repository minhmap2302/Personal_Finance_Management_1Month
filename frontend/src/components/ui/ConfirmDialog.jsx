import { AlertTriangle, AlertCircle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'danger',
  busy = false,
  icon: CustomIcon,
}) {
  const Icon = CustomIcon || (variant === 'danger' ? AlertTriangle : AlertCircle);
  const iconColors =
    variant === 'danger'
      ? 'bg-rose-50 text-expense dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40'
      : 'bg-emerald-50 text-primary dark:bg-emerald-950/60 dark:text-primary-dark border border-emerald-200/60 dark:border-emerald-900/40';

  return (
    <Modal isOpen={isOpen} onClose={onClose} locked={busy} showClose={!busy} maxWidth="max-w-md">
      <div className="flex gap-4">
        <div className={`h-11 w-11 rounded-xl grid place-items-center shrink-0 ${iconColors}`}>
          <Icon size={22} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-fin-text dark:text-fin-text-dark">
            {title}
          </h3>
          <p className="text-xs text-fin-secondary dark:text-fin-muted mt-1.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-fin-border/60 dark:border-fin-border-dark/60">
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={onClose}
        >
          {cancelText}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          size="sm"
          loading={busy}
          onClick={onConfirm}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}

