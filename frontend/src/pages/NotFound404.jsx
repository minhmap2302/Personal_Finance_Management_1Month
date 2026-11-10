import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Home, SearchX, Compass } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function NotFound404() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20 px-4 py-16 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-emerald-400/10 dark:bg-emerald-500/8 blur-[90px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-teal-400/10 dark:bg-teal-500/8 blur-[90px]"
      />

      {/* Brand link */}
      <Link
        to="/"
        className="mb-10 inline-flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl"
        aria-label="FinHome - Trang chủ"
      >
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 text-white shadow-lg shadow-emerald-700/20 transition-transform group-hover:-rotate-3">
          <Home size={20} strokeWidth={2.4} />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            FinHome
          </span>
          <span className="block text-[9px] font-bold tracking-[.18em] text-slate-400 dark:text-slate-500">
            FINANCE, TOGETHER
          </span>
        </span>
      </Link>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md text-center"
      >
        {/* Animated icon */}
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, -1, 0, 1, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[26px] bg-white dark:bg-slate-800 shadow-[0_20px_60px_-25px_rgba(5,150,105,.35)] border border-slate-100 dark:border-slate-700/60"
          aria-hidden="true"
        >
          <SearchX size={36} className="text-emerald-600 dark:text-emerald-400" strokeWidth={1.6} />
        </motion.div>

        {/* 404 Number */}
        <div className="relative mb-2">
          <span
            className="text-[110px] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-emerald-200 to-emerald-50 dark:from-emerald-900 dark:to-slate-900 select-none"
            aria-hidden="true"
          >
            404
          </span>
        </div>

        {/* Eyebrow */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 text-[10px] font-extrabold tracking-[.17em] text-emerald-700 dark:text-emerald-400 mb-4">
          <Compass size={12} />
          ĐƯỜNG DẪN KHÔNG TỒN TẠI
        </span>

        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-snug">
          Chúng ta lạc mất một chút rồi.
        </h1>

        <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Khoản mục hoặc trang này không tồn tại trong hệ thống. Hãy quay lại
          khu vực an toàn để tiếp tục quản lý tài chính gia đình.
        </p>

        {/* Action buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/app/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-700/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-[0_16px_36px_-10px_rgba(5,150,105,.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 motion-reduce:transform-none"
          >
            <Home size={16} aria-hidden="true" />
            Quay về Dashboard
          </Link>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 transition hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Quay lại trang trước
          </button>
        </div>

        {/* Help link */}
        <Link
          to="/app/support"
          className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors focus:outline-none focus-visible:underline"
        >
          Cần trợ giúp? Liên hệ hỗ trợ
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </motion.div>

      {/* Footer note */}
      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-300 dark:text-slate-700 whitespace-nowrap">
        © 2026 FinHome • Mỗi bước nhỏ đều đưa bạn về đúng hướng.
      </p>
    </main>
  );
}
