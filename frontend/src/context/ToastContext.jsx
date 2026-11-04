import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
const icons = { success: CheckCircle2, error: AlertCircle, info: Info };

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);
  const showToast = useCallback((message, type = 'success', duration = 3200) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, type });
    timer.current = setTimeout(() => setToast(null), duration);
  }, []);
  useEffect(() => () => timer.current && clearTimeout(timer.current), []);
  const Icon = toast ? icons[toast.type] || Info : Info;

  return <ToastContext.Provider value={showToast}>
    {children}
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      <AnimatePresence>
        {toast && <motion.div key={toast.id} className={`app-toast app-toast-${toast.type}`} initial={{ opacity: 0, y: -14, x: 12, scale: .98 }} animate={{ opacity: 1, y: 0, x: 0, scale: 1 }} exit={{ opacity: 0, y: -8, x: 12, scale: .98 }} transition={{ duration: .2 }} role="status">
          <span className="app-toast-icon"><Icon size={19}/></span>
          <span className="app-toast-message">{toast.message}</span>
          <button type="button" className="app-toast-close" onClick={hide} aria-label="Đóng thông báo"><X size={16}/></button>
          <span className="app-toast-progress" key={toast.id}/>
        </motion.div>}
      </AnimatePresence>
    </div>
  </ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast phải được sử dụng bên trong ToastProvider');
  return context;
}
