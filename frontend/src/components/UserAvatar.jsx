import React, { useMemo } from 'react';

const PALETTES = [
  'bg-emerald-100 text-emerald-700', 'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700', 'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700', 'bg-orange-100 text-orange-700',
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
