/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Be Vietnam Pro"', '"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#059669',
          hover:   '#047857',
          light:   '#D1FAE5',
          dark:    '#34D399',
          'hover-dark': '#6EE7B7',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark:    '#151F2E',
        },
        app: {
          DEFAULT: '#F6F8FA',
          dark:    '#0B1220',
        },
        sidebar: {
          DEFAULT: '#14263D',
          dark:    '#080F1B',
        },
        income:  { DEFAULT: '#059669', dark: '#34D399' },
        expense: { DEFAULT: '#E05A61', dark: '#FB7185', 'hover-dark': '#F87171' },
        fin: {
          border:  '#E5EAF0',
          'border-dark': '#273449',
          text:    '#172B3A',
          'text-dark': '#F1F5F9',
          muted:   '#94A3B8',
          secondary: '#64748B',
        },
      },
      borderRadius: {
        card:   '18px',
        button: '8px',
        input:  '10px',
      },
      boxShadow: {
        card:     '0 2px 8px rgba(15,23,42,0.035)',
        'card-dark': '0 2px 12px rgba(0,0,0,0.14)',
        soft:     '0 16px 45px rgba(15,23,42,0.06)',
        topbar:   '0 1px 3px rgba(15,23,42,0.04)',
      },
      fontSize: {
        'kpi': ['clamp(26px,2.2vw,32px)', { lineHeight: '1.15', fontWeight: '700' }],
      },
    },
  },
  plugins: [],
};
