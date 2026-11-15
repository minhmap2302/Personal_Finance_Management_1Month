
import { useEffect } from 'react';
import {
  AlertTriangle,
  Info,
  LoaderCircle,
  X,
} from 'lucide-react';

/**
 * Hiển thị skeleton loading khi đang tải dữ liệu.
 *
 * @param {number} rows - Số lượng dòng skeleton.
 */
export function PageLoading({ rows = 5 }) {
  const rowCount = Math.max(1, Number(rows) || 5);

  return (
      <div
          className="pfm-skeleton-list"
          aria-label="Đang tải dữ liệu"
          role="status"
          aria-live="polite"
      >
        {Array.from({ length: rowCount }, (_, index) => (
            <div
                className="pfm-skeleton"
                key={index}
            />
        ))}
      </div>
  );
}

/**
 * Hiển thị trạng thái khi danh sách không có dữ liệu.
 */
export function EmptyState({
                             title = 'Chưa có dữ liệu',
                             description = 'Dữ liệu sẽ xuất hiện tại đây khi có phát sinh.',
                           }) {
  return (
      <div className="pfm-empty" role="status">
        <Info size={24} aria-hidden="true" />

        <b>{title}</b>

        <span>{description}</span>
      </div>
  );
}

/**
 * Hộp thoại xác nhận thao tác.
 *
 * @param {string} title - Tiêu đề hộp thoại.
 * @param {string} description - Nội dung xác nhận.
 * @param {Function} onCancel - Hàm đóng hộp thoại.
 * @param {Function} onConfirm - Hàm xác nhận thao tác.
 * @param {boolean} busy - Trạng thái đang xử lý.
 * @param {string} confirmText - Nội dung nút xác nhận.
 */
export function ConfirmDialog({
                                title = 'Xác nhận thao tác',
                                description = 'Bạn có chắc chắn muốn thực hiện thao tác này?',
                                onCancel,
                                onConfirm,
                                busy = false,
                                confirmText = 'Xác nhận',
                              }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) {
        onCancel?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel, busy]);

  return (
      <div
          className="pfm-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
                event.target === event.currentTarget &&
                !busy
            ) {
              onCancel?.();
            }
          }}
      >
        <section
            className="pfm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="pfm-confirm-title"
            aria-describedby="pfm-confirm-description"
        >
        <span className="pfm-dialog-icon">
          <AlertTriangle aria-hidden="true" />
        </span>

          <h2 id="pfm-confirm-title">
            {title}
          </h2>

          <p id="pfm-confirm-description">
            {description}
          </p>

          <div className="pfm-dialog-actions">
            <button
                type="button"
                className="pfm-btn pfm-btn-light"
                onClick={onCancel}
                disabled={busy}
            >
              Hủy
            </button>

            <button
                type="button"
                className="pfm-btn pfm-btn-danger"
                onClick={onConfirm}
                disabled={busy}
            >
              {busy && (
                  <LoaderCircle
                      className="pfm-spin"
                      size={16}
                      aria-hidden="true"
                  />
              )}

              {busy ? 'Đang xử lý...' : confirmText}
            </button>
          </div>
        </section>
      </div>
  );
}

/**
 * Modal dùng chung cho các trang.
 */
export function Modal({
                        title,
                        onClose,
                        children,
                        wide = false,
                      }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
      <div
          className="pfm-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              onClose?.();
            }
          }}
      >
        <section
            className={`pfm-dialog pfm-modal ${
                wide ? 'pfm-modal-wide' : ''
            }`}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Hộp thoại'}
        >
          <header className="pfm-modal-head">
            <h2>{title}</h2>

            <button
                type="button"
                className="pfm-icon-btn"
                onClick={onClose}
                aria-label="Đóng"
            >
              <X size={19} aria-hidden="true" />
            </button>
          </header>

          {children}
        </section>
      </div>
  );
}

/**
 * Component hiển thị label, input và gợi ý.
 */
export function Field({
                        label,
                        children,
                        hint,
                      }) {
  return (
      <label className="pfm-field">
        <span>{label}</span>

        {children}

        {hint && (
            <small>{hint}</small>
        )}
      </label>
  );
}

/**
 * Thanh tiến độ.
 *
 * @param {number} value - Phần trăm hoàn thành.
 * @param {string} status - Trạng thái CSS.
 */
export function Progress({
                           value = 0,
                           status = 'success',
                         }) {
  const progressValue = Math.max(
      0,
      Math.min(100, Number(value) || 0)
  );

  return (
      <div
          className={`pfm-progress pfm-${status}`}
          role="progressbar"
          aria-valuenow={progressValue}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Tiến độ hoàn thành"
      >
      <span
          style={{
            width: `${progressValue}%`,
          }}
      />
      </div>
  );
}
