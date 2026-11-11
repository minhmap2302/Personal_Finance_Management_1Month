export function Card({ children, className = '', padded = false, noOverflow = false, ...props }) {
  return (
    <div
      className={`rounded-card bg-surface dark:bg-surface-dark border border-fin-border dark:border-fin-border-dark shadow-card dark:shadow-card-dark transition-colors duration-200 ${padded ? 'p-5' : ''} ${noOverflow ? 'overflow-hidden' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div
      className={`p-5 pb-3 border-b border-fin-border/60 dark:border-fin-border-dark/60 flex items-start justify-between gap-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', as: Tag = 'h3', ...props }) {
  return (
    <Tag
      className={`text-base font-bold text-fin-text dark:text-fin-text-dark tracking-tight ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p
      className={`text-xs text-fin-secondary dark:text-fin-muted mt-1 leading-relaxed ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div
      className={`p-4 pt-3 border-t border-fin-border/60 dark:border-fin-border-dark/60 bg-app/50 dark:bg-app-dark/50 flex items-center justify-between gap-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;

