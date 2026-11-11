import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-md',
  locked = false,
  showClose = true,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !locked) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, locked, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-slate-950/60 dark:bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => !locked && onClose()}
            aria-hidden="true"
          />

          {/* Dialog Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={description ? 'modal-description' : undefined}
            className={`relative z-10 w-full ${maxWidth} rounded-2xl bg-surface dark:bg-surface-dark border border-fin-border dark:border-fin-border-dark p-6 shadow-2xl dark:shadow-card-dark overflow-hidden`}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          >
            {(title || showClose) && (
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  {title && (
                    <h3
                      id="modal-title"
                      className="text-lg font-bold text-fin-text dark:text-fin-text-dark tracking-tight"
                    >
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p
                      id="modal-description"
                      className="text-xs text-fin-secondary dark:text-fin-muted mt-1 leading-relaxed"
                    >
                      {description}
                    </p>
                  )}
                </div>

                {showClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={locked}
                    aria-label="Đóng hộp thoại"
                    className="rounded-lg p-1.5 text-fin-muted hover:text-fin-text hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

