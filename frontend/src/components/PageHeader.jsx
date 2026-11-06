import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PageHeader({ title, description, icon: Icon, actions }) {
  return (
    <header className="page-heading module-page-header">
      <div className="page-heading-left">
        <nav className="module-page-breadcrumb" aria-label="Đường dẫn trang">
          <Link to="/app/dashboard">FinHome</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <span>Không gian gia đình</span>
          <ChevronRight size={13} aria-hidden="true" />
          <span aria-current="page">{title}</span>
        </nav>

        <div className="module-page-meta">
          {Icon && (
            <span className="module-page-icon" aria-hidden="true">
              <Icon size={16} />
            </span>
          )}
          <span className="live-dot" aria-hidden="true" />
          <span>FinHome V2</span>
        </div>

        <h1 className="page-heading-title">{title}</h1>
        <p className="page-heading-sub">{description}</p>
      </div>

      {actions && <div className="module-page-actions">{actions}</div>}
    </header>
  );
}
