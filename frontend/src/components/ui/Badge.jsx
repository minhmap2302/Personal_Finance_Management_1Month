import React from 'react';

const VARIANTS = {
  emerald:
    'bg-emerald-50 text-emerald-800 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/40',
  rose:
    'bg-rose-50 text-rose-800 border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/40',
  amber:
    'bg-amber-50 text-amber-800 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/40',
  sky:
    'bg-sky-50 text-sky-800 border-sky-200/60 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/40',
  violet:
    'bg-violet-50 text-violet-800 border-violet-200/60 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800/40',
  slate:
    'bg-slate-100 text-slate-700 border-slate-200/60 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/50',
};

const DOT_COLORS = {
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  slate: 'bg-slate-400',
};

const SIZES = {
  sm: 'text-[11px] px-2 py-0.5 gap-1.5',
  md: 'text-xs px-2.5 py-1 gap-2',
};

export default function Badge({
  children,
  variant = 'emerald',
  size = 'md',
  dot = false,
  icon: Icon,
  className = '',
  ...props
}) {
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border tracking-wide tabular-nums ${
        VARIANTS[variant] || VARIANTS.emerald
      } ${SIZES[size] || SIZES.md} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${DOT_COLORS[variant] || DOT_COLORS.emerald}`}
          aria-hidden="true"
        />
      )}
      {Icon && <Icon size={12} className="shrink-0" aria-hidden="true" />}
      {children}
    </span>
  );
}

