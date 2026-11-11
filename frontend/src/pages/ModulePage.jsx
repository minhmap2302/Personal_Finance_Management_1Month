import { motion } from 'framer-motion';
import { ArrowUpRight, Search, SlidersHorizontal, Wrench, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Badge, Card } from '../components/ui';

export default function ModulePage({ title, description, icon: Icon }) {
  const navigate = useNavigate();

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <PageHeader
        title={title}
        subtitle={description}
        badge="Sắp ra mắt"
        icon={Icon}
        action={
          <Badge variant="amber" size="md" dot>
            Đang phát triển
          </Badge>
        }
      />

      <Card className="text-center py-16 px-6 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40">
        {/* Animated icon */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-sm grid place-items-center text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        >
          {Icon ? <Icon size={28} strokeWidth={1.5} /> : <Wrench size={28} strokeWidth={1.5} />}
        </motion.div>

        {/* Eyebrow */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/50 px-3 py-1 text-[10px] font-extrabold tracking-[.17em] text-amber-700 dark:text-amber-400 mb-3">
          <Wrench size={11} aria-hidden="true" />
          ĐANG PHÁT TRIỂN
        </span>

        <h2
          id="module-empty-title"
          className="mt-2 text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight"
        >
          {title} đang được xây dựng
        </h2>

        <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Tính năng{' '}
          <strong className="text-slate-700 dark:text-slate-300">{title}</strong>{' '}
          đang trong quá trình phát triển và sẽ được triển khai trong phiên bản tiếp theo. Các
          chức năng cốt lõi của ứng dụng vẫn hoạt động đầy đủ.
        </p>

        {/* Tools (non-functional placeholder) */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-sm mx-auto" role="group" aria-label="Công cụ tìm kiếm và bộ lọc (chưa hoạt động)">
          <label className="relative flex-1 w-full" aria-label={`Tìm kiếm ${title.toLowerCase()}`}>
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              aria-hidden="true"
            />
            <input
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-emerald-400 dark:focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder={`Tìm kiếm ${title.toLowerCase()}…`}
              disabled
              aria-disabled="true"
            />
          </label>

          <button
            type="button"
            disabled
            aria-disabled="true"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SlidersHorizontal size={15} aria-hidden="true" />
            Bộ lọc
          </button>
        </div>

        {/* Placeholder row */}
        <div className="mt-5 mx-auto max-w-sm flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-4 py-3.5">
          <span className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" aria-hidden="true" />
            Chưa có dữ liệu để hiển thị
          </span>
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            API chưa kết nối
          </span>
        </div>

        {/* Back navigation */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/app/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            Về Dashboard
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Quay lại
          </button>
        </div>
      </Card>
    </motion.div>
  );
}
