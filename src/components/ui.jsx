import { AlertCircle, CheckCircle2, Info, Loader2, SearchX, TriangleAlert } from 'lucide-react';

export function Button({ variant = 'primary', size, block, loading, children, className = '', ...rest }) {
  const classes = ['btn', `btn-${variant}`, size && `btn-${size}`, block && 'btn-block', className].filter(Boolean).join(' ');
  return (
    <button className={classes} disabled={loading || rest.disabled} {...rest}>
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Field({ label, hint, error, id, children }) {
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      {children}
      {error ? <span className="field-error" role="alert">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}

const ICONS = { error: AlertCircle, warn: TriangleAlert, info: Info, ok: CheckCircle2 };
export function Alert({ kind = 'info', children }) {
  const Icon = ICONS[kind];
  return (
    <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon size={18} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function Badge({ tone = '', children }) {
  return <span className={`badge ${tone ? `badge-${tone}` : ''}`}>{children}</span>;
}

export function Loading({ label = 'Loading' }) {
  return (
    <div className="state" role="status">
      <Loader2 className="spinner-icon" size={28} aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}

export function Skeleton({ lines = 3 }) {
  return (
    <div className="stack-s" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => <div key={i} className={`skeleton skeleton-line skeleton-w${(i % 3) + 1}`} />)}
    </div>
  );
}

export function EmptyState({ icon: Icon = SearchX, title, children, action }) {
  return (
    <div className="state">
      <Icon size={36} aria-hidden="true" />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state" role="alert">
      <AlertCircle size={36} aria-hidden="true" />
      <h3>Something went wrong</h3>
      <p>{error?.message || 'Please try again.'}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div className="container row-between">
        <div className="stack-s">
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {actions && <div className="row">{actions}</div>}
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal card-pad stack" role="dialog" aria-modal="true" aria-label={title}>
        <div className="row-between"><h3>{title}</h3><button className="btn btn-ghost btn-small" onClick={onClose} aria-label="Close">✕</button></div>
        {children}
      </div>
    </div>
  );
}

export function Stat({ label, value, hint }) {
  return (
    <div className="card card-pad stat">
      <span className="muted small">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="muted small">{hint}</span>}
    </div>
  );
}
