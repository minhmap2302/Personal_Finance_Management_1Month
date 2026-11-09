import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  badge = 'FinHome V3',
  breadcrumbs,
  className = '',
}) {
  return (
    <header className={`page-heading module-page-header ${className}`}>
      <div className="page-heading-left">
        <nav className="module-page-breadcrumb" aria-label="Đường dẫn trang">
          <Link to="/app/dashboard">FinHome</Link>
          <ChevronRight size={13} aria-hidden="true" />
          {Array.isArray(breadcrumbs) && breadcrumbs.length > 0 ? (
            breadcrumbs.map((crumb, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5">
                {crumb.to ? (
                  <Link to={crumb.to}>{crumb.label}</Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
                <ChevronRight size={13} aria-hidden="true" />
              </span>
            ))
          ) : (
            <>
              <span>Không gian gia đình</span>
              <ChevronRight size={13} aria-hidden="true" />
            </>
          )}
          <span aria-current="page">{title}</span>
        </nav>

        <div className="module-page-meta">
          {Icon && (
            <span className="module-page-icon" aria-hidden="true">
              <Icon size={16} />
            </span>
          )}
          <span className="live-dot" aria-hidden="true" />
          <span>{badge}</span>
        </div>

        <h1 className="page-heading-title">{title}</h1>
        {description && <p className="page-heading-sub">{description}</p>}
      </div>

      {actions && <div className="module-page-actions">{actions}</div>}
    </header>
  );
}
