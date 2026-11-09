import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary:
    'bg-primary hover:bg-primary-hover text-white shadow-sm focus-visible:ring-primary/40 dark:bg-emerald-600 dark:hover:bg-emerald-500',
  secondary:
    'bg-surface hover:bg-app text-fin-text border border-fin-border dark:bg-surface-dark dark:hover:bg-sidebar-dark dark:text-fin-text-dark dark:border-fin-border-dark',
  outline:
    'bg-transparent hover:bg-primary/10 text-primary border border-primary/40 focus-visible:ring-primary/30 dark:text-primary-dark dark:border-primary-dark/40',
  ghost:
    'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-fin-text dark:text-fin-text-dark',
  danger:
    'bg-expense hover:bg-red-600 text-white shadow-sm focus-visible:ring-red-400/40',
  dangerOutline:
    'bg-transparent hover:bg-red-500/10 text-expense border border-expense/40 focus-visible:ring-red-400/30',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-button',
  md: 'h-10 px-4 text-sm gap-2 rounded-button',
  lg: 'h-12 px-5 text-base gap-2.5 rounded-button font-bold',
};

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon: Icon,
    leftIcon,
    rightIcon,
    className = '',
    type = 'button',
    ...props
  },
  ref
) {
  const IconToRender = leftIcon || Icon;
  const isActionDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isActionDisabled}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150 select-none outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${
        VARIANTS[variant] || VARIANTS.primary
      } ${SIZES[size] || SIZES.md} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin shrink-0" aria-hidden="true" />
      ) : IconToRender ? (
        <IconToRender size={size === 'sm' ? 14 : 16} className="shrink-0" aria-hidden="true" />
      ) : null}
      {children}
      {!loading && rightIcon && (
        <span className="shrink-0" aria-hidden="true">{rightIcon}</span>
      )}
    </button>
  );
});

export default Button;

