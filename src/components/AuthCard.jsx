export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="auth-wrap">
      <div className="card card-pad auth-card stack">
        <div className="stack-s">
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="auth-footer small muted">{footer}</div>}
      </div>
    </div>
  );
}
