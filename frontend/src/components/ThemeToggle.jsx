import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const MODES = [
  { value: 'light',  icon: Sun,     label: 'Sáng' },
  { value: 'dark',   icon: Moon,    label: 'Tối' },
  { value: 'system', icon: Monitor, label: 'Hệ thống' },
];

/**
 * Compact icon-only toggle button that cycles: light → dark → system → light
 */
export default function ThemeToggle({ className = '' }) {
  const { mode, toggle } = useTheme();
  const current = MODES.find((m) => m.value === mode) || MODES[0];
  const Icon = current.icon;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Chế độ màu: ${current.label}. Nhấn để thay đổi.`}
      title={`Chế độ màu: ${current.label}`}
      className={`icon-button ${className}`}
    >
      <Icon size={17} />
    </button>
  );
}
