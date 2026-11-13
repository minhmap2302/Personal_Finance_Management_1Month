import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Dropdown tùy biến để kiểm soát được bo góc, hover và vùng bấm mũi tên.
 * Toàn bộ nút trigger (bao gồm icon mũi tên) đều mở danh sách lựa chọn.
 */
export default function PfmSelect({
  value = '',
  onChange,
  options = [],
  ariaLabel = 'Chọn một mục',
  placeholder,
  required = false,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();
  const normalized = useMemo(
    () => options.map(option => ({
      value: String(option.value ?? ''),
      label: option.label ?? String(option.value ?? ''),
      disabled: Boolean(option.disabled),
    })),
    [options]
  );
  const selected = normalized.find(option => option.value === String(value ?? ''));
  const display = selected?.label || placeholder || normalized[0]?.label || 'Chọn một mục';

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = event => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const choose = option => {
    if (option.disabled) return;
    onChange?.(option.value);
    setOpen(false);
  };

  return (
    <div className={`pfm-combo ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`} ref={rootRef}>
      {required && (
        <select
          tabIndex={-1}
          aria-hidden="true"
          required
          value={String(value ?? '')}
          onChange={() => {}}
          className="pfm-combo-validation"
        >
          <option value=""> </option>
          <option value={String(value ?? '')}>{display}</option>
        </select>
      )}
      <button
        type="button"
        className="pfm-combo-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen(current => !current)}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
            requestAnimationFrame(() => rootRef.current?.querySelector('.pfm-combo-option:not(:disabled)')?.focus());
          }
        }}
      >
        <span className={!selected && !value ? 'is-placeholder' : ''}>{display}</span>
        <ChevronDown size={17} className="pfm-combo-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="pfm-combo-menu" id={listId} role="listbox" aria-label={ariaLabel}>
          {normalized.map((option, index) => {
            const active = option.value === String(value ?? '');
            return (
              <button
                type="button"
                role="option"
                aria-selected={active}
                disabled={option.disabled}
                key={`${option.value}-${index}`}
                className={`pfm-combo-option ${active ? 'is-selected' : ''}`}
                onClick={() => choose(option)}
                onKeyDown={event => {
                  const enabled = [...(rootRef.current?.querySelectorAll('.pfm-combo-option:not(:disabled)') || [])];
                  const currentIndex = enabled.indexOf(event.currentTarget);
                  if (event.key === 'ArrowDown') {
                    event.preventDefault(); enabled[(currentIndex + 1) % enabled.length]?.focus();
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault(); enabled[(currentIndex - 1 + enabled.length) % enabled.length]?.focus();
                  } else if (event.key === 'Escape') {
                    setOpen(false); rootRef.current?.querySelector('.pfm-combo-trigger')?.focus();
                  }
                }}
              >
                <span>{option.label}</span>
                {active && <Check size={15} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
