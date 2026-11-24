import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const KEY = 'bookify-theme';

function resolved() {
  const set = document.documentElement.getAttribute('data-theme');
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Light/dark switch. Follows the system until the visitor chooses; the choice is remembered.
export default function ThemeToggle() {
  const [theme, setTheme] = useState(null);
  useEffect(() => { setTheme(resolved()); }, []);

  function toggle() {
    const next = resolved() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch { /* storage blocked */ }
    setTheme(next);
  }

  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button type="button" className="btn btn-ghost btn-small theme-toggle" onClick={toggle} aria-label={label} title={label}>
      {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
