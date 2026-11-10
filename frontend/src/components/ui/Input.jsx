import React, { forwardRef, useId } from 'react';
import { X } from 'lucide-react';

export const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    icon: Icon,
    rightElement,
    id,
    disabled = false,
    required = false,
    className = '',
    inputClassName = '',
    // clearable support
    clearable = false,
    onClear,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const showClear = clearable && onClear && props.value && !disabled;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold text-fin-text dark:text-fin-text-dark mb-1.5"
        >
          {label}
          {required && <span className="text-expense ml-0.5">*</span>}
        </label>
      )}

      <div
        className={`relative flex items-center h-10 w-full rounded-input border transition-all duration-150 bg-surface dark:bg-surface-dark ${
          error
            ? 'border-expense focus-within:ring-2 focus-within:ring-expense/20'
            : 'border-fin-border dark:border-fin-border-dark focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'
        } ${disabled ? 'opacity-55 cursor-not-allowed bg-app dark:bg-sidebar-dark' : ''}`}
      >
        {Icon && (
          <span className="pl-3 pr-1 text-fin-muted shrink-0 pointer-events-none" aria-hidden="true">
            <Icon size={16} />
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          className={`h-full w-full px-3 text-sm text-fin-text dark:text-fin-text-dark placeholder:text-fin-muted bg-transparent outline-none disabled:cursor-not-allowed ${
            showClear ? 'pr-8' : ''
          } ${inputClassName}`}
          {...props}
        />

        {/* Clear button (clearable=true) */}
        {showClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Xóa nội dung"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full flex items-center justify-center text-fin-muted hover:text-fin-text dark:hover:text-fin-text-dark transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <X size={12} aria-hidden="true" />
          </button>
        )}

        {/* Right element slot (passwords, dropdowns, etc) */}
        {!showClear && rightElement && (
          <div className="pr-3 pl-1 shrink-0 flex items-center">
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <p className="mt-1 text-xs text-expense font-medium flex items-center gap-1" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-fin-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
