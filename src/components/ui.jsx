import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Info, Loader2, SearchX, TriangleAlert, X } from 'lucide-react';

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

// Password input with a show/hide eye button.
export function PasswordInput({ className = '', ...rest }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="input-wrap">
      <input {...rest} className={`input input-has-action ${className}`.trim()} type={shown ? 'text' : 'password'} />
      <button type="button" className="input-action" onClick={() => setShown((v) => !v)} aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown}>
        {shown ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
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

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Dialog with a fixed header, a body that scrolls on its own and a sticky footer.
// Pass onSubmit to render the body and footer as one form (Cancel + submit button);
// otherwise pass `footer` for custom actions. Esc and a click on the backdrop close it,
// Tab stays inside, and focus returns to the opener. Becomes a bottom sheet on phones.
export function Modal({ title, subtitle, onClose, size = 'md', onSubmit, submitLabel = 'Save', submitTone = 'primary', busy = false, submitDisabled = false, cancelLabel = 'Cancel', error, footer, children }) {
  const panel = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();

  useEffect(() => {
    const opener = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const node = panel.current;
    if (node && !node.contains(document.activeElement)) {
      (node.querySelector('[data-autofocus], .modal-body input, .modal-body select, .modal-body textarea') || node.querySelector(FOCUSABLE))?.focus();
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); return; }
      if (e.key !== 'Tab' || !node) return;
      const items = [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0]; const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; opener?.focus?.(); };
  }, []);

  const body = (
    <>
      <div className="modal-body">
        {error && <Alert kind="error">{error}</Alert>}
        {children}
      </div>
      {(onSubmit || footer) && (
        <div className="modal-footer">
          {onSubmit ? (
            <>
              <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>{cancelLabel}</Button>
              <Button type="submit" variant={submitTone} loading={busy} disabled={submitDisabled}>{submitLabel}</Button>
            </>
          ) : footer}
        </div>
      )}
    </>
  );

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-header">
          <div><h2 id={titleId} className="modal-title">{title}</h2>{subtitle && <p className="modal-subtitle">{subtitle}</p>}</div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} aria-hidden="true" /></button>
        </div>
        {onSubmit ? <form className="modal-form" onSubmit={onSubmit} noValidate={false}>{body}</form> : body}
      </div>
    </div>
  );
}

export function ModalSection({ title, hint, children }) {
  return (
    <section className="modal-section">
      {title && <div className="modal-section-head"><h3>{title}</h3>{hint && <p className="muted small">{hint}</p>}</div>}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, icon: Icon, tone = 'brand' }) {
  return (
    <div className="card stat">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {Icon && <span className={`stat-icon tone-${tone}`}><Icon size={18} aria-hidden="true" /></span>}
      </div>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="muted small">{hint}</span>}
    </div>
  );
}
