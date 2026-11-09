import React, { useMemo } from 'react';

const PALETTES = [
  'bg-emerald-100 text-emerald-800 border-emerald-200/60 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/40',
  'bg-sky-100 text-sky-800 border-sky-200/60 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800/40',
  'bg-violet-100 text-violet-800 border-violet-200/60 dark:bg-violet-950/70 dark:text-violet-300 dark:border-violet-800/40',
  'bg-amber-100 text-amber-800 border-amber-200/60 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/40',
  'bg-rose-100 text-rose-800 border-rose-200/60 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/40',
  'bg-teal-100 text-teal-800 border-teal-200/60 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800/40',
  'bg-indigo-100 text-indigo-800 border-indigo-200/60 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800/40',
  'bg-orange-100 text-orange-800 border-orange-200/60 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800/40',
];

function initialsOf(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function stableHash(value = '') {
  let hash = 0;
  for (const char of String(value)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

export default function UserAvatar({ name, seed, size = 'md', className = '', title }) {
  const palette = useMemo(() => PALETTES[stableHash(seed || name || 'user') % PALETTES.length], [seed, name]);
  const dimension = size === 'xl' ? 'h-20 w-20 text-2xl' : size === 'lg' ? 'h-14 w-14 text-lg' : size === 'sm' ? 'h-9 w-9 text-xs' : 'h-11 w-11 text-sm';
  return (
    <span aria-label={title || name || 'Người dùng'} title={title || name || 'Người dùng'} className={`inline-flex shrink-0 items-center justify-center rounded-2xl font-bold tracking-wide ${palette} ${dimension} ${className}`}>
      {initialsOf(name)}
    </span>
  );
}

export { initialsOf };
