import Link from 'next/link';
import { useRouter } from 'next/router';
import RequireAuth from './RequireAuth.jsx';

// Sidebar layout shared by the operator and admin areas.
export default function Shell({ role, title, links, children }) {
  const { pathname } = useRouter();
  return (
    <RequireAuth role={role}>
      <div className="container shell">
        <aside className="shell-nav card" aria-label={title}>
          <div className="shell-title">{title}</div>
          <nav>
            {links.map((l) => (
              <Link key={l.href} href={l.href} aria-current={(l.exact ? pathname === l.href : pathname.startsWith(l.href)) ? 'page' : undefined}>{l.label}</Link>
            ))}
          </nav>
        </aside>
        <div className="shell-main stack">{children}</div>
      </div>
    </RequireAuth>
  );
}
