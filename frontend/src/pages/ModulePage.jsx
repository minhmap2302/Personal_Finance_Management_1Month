import { motion } from 'framer-motion';
import { ArrowUpRight, Search, Plus, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

export default function ModulePage({ title, description, icon: Icon }) {
  return (
    <motion.div
      className="module-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <PageHeader
        title={title}
        description={description}
        icon={Icon}
        actions={(
          <button type="button" className="btn-primary module-action">
            <Plus size={17} aria-hidden="true" />
            Thêm mới
          </button>
        )}
      />

      <section className="panel module-empty" aria-labelledby="module-empty-title">
        <div className="module-empty-icon" aria-hidden="true">
          <Icon size={25} />
        </div>
        <h2 id="module-empty-title">Không gian {title.toLowerCase()} của bạn</h2>
        <p>Khung giao diện đã sẵn sàng. Để hiển thị dữ liệu thực, hãy kết nối trang này với endpoint tương ứng của backend hiện có.</p>

        <div className="module-tools">
          <label className="module-search">
            <Search size={17} aria-hidden="true" />
            <input aria-label={`Tìm kiếm ${title.toLowerCase()}`} placeholder={`Tìm kiếm ${title.toLowerCase()}…`} />
          </label>
          <button type="button" className="btn-secondary">
            <SlidersHorizontal size={16} aria-hidden="true" />
            Bộ lọc
          </button>
        </div>

        <div className="module-placeholder-row">
          <span><i aria-hidden="true" /> Chưa có dữ liệu để hiển thị</span>
          <span>API chưa được kết nối</span>
        </div>

        <Link className="text-link" to="/app/dashboard">
          Quay lại tổng quan <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </section>
    </motion.div>
  );
}
