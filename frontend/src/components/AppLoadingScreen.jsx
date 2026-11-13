import { motion } from 'framer-motion';

export default function AppLoadingScreen() {
  return (
    <main className="loading-screen" role="status" aria-live="polite" aria-label="FinHome đang tải">
      <motion.div className="loading-card" initial={{ opacity: 0, y: 14, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .35, ease: 'easeOut' }}>
        <div className="loading-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M3 10.8 12 3l9 7.8v9a1.2 1.2 0 0 1-1.2 1.2H4.2A1.2 1.2 0 0 1 3 19.8v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 21v-6.2a3 3 0 0 1 6 0V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </div>
        <span className="loading-kicker">PERSONAL FINANCE · FAMILY</span>
        <h1>FinHome</h1>
        <p>Đang chuẩn bị không gian tài chính của gia đình…</p>
        <div className="loading-progress"><span /></div>
      </motion.div>
    </main>
  );
}
