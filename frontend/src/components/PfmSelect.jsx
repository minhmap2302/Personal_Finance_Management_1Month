import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/** Select menu tùy chỉnh: bo góc cả trigger, popup và từng lựa chọn. */
export default function PfmSelect({ value, onChange, options = [], placeholder = 'Chọn...', ariaLabel, disabled = false, className = '' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();
  const selected = options.find(option => String(option.value) === String(value));

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = event => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className={`pfm-select-custom ${open ? 'is-open' : ''} ${className}`} ref={rootRef}>
      <button
        type="button"
        className="pfm-select-trigger"
        aria-label={ariaLabel || placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen(current => !current)}
      >
        <span className={selected ? '' : 'is-placeholder'}>{selected?.label || placeholder}</span>
        <ChevronDown size={16} className="pfm-select-chevron" />
      </button>
      {open && (
        <div className="pfm-select-menu" id={listId} role="listbox" aria-label={ariaLabel || placeholder}>
          {options.map(option => {
            const active = String(option.value) === String(value);
            return (
              <button
                type="button"
                role="option"
                aria-selected={active}
                key={String(option.value)}
                className={`pfm-select-option ${active ? 'selected' : ''}`}
                onClick={() => { onChange(option.value); setOpen(false); }}
              >
                <span>{option.label}</span>
                {active && <Check size={15} />}
              </button>
            );
          })}
          {!options.length && <div className="pfm-select-empty">Không có lựa chọn</div>}
        </div>
      )}
    </div>
  );
}
