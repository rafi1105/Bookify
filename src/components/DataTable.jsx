import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { Button, EmptyState } from './ui.jsx';

// Table with search, select filters, an optional date range, sortable columns and pagination.
//   columns: [{ key, label, render(row), sort(row) -> comparable, className, align }]
//   searchText(row) -> string searched (case-insensitive)
//   filters: [{ key, label, options: [[value, label]], match(row, value) -> boolean }]
//   dateField(row) -> ISO string, enables From/To inputs
export default function DataTable({ columns, rows, rowKey = (r) => r.id, searchText, searchPlaceholder = 'Search', filters = [], dateField, pageSize = 15,
  initialSort, initialQuery = '', empty, noMatch = 'Nothing matches your search or filters.', toolbarExtra }) {
  const [query, setQuery] = useState(initialQuery);
  const [values, setValues] = useState({});
  const [range, setRange] = useState({ from: '', to: '' });
  const [sort, setSort] = useState(initialSort || null);
  const [page, setPage] = useState(1);

  const reset = () => setPage(1);
  const active = Boolean(query || range.from || range.to || Object.values(values).some(Boolean));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && searchText && !searchText(r).toLowerCase().includes(q)) return false;
      for (const f of filters) if (values[f.key] && !f.match(r, values[f.key])) return false;
      if (dateField && (range.from || range.to)) {
        const d = String(dateField(r) || '').slice(0, 10);
        if ((range.from && d < range.from) || (range.to && d > range.to)) return false;
      }
      return true;
    });
  }, [rows, query, values, range, searchText, filters, dateField]);

  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.key === sort.key);
    if (!col?.sort) return filtered;
    const dir = sort.dir === 'desc' ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const x = col.sort(a); const y = col.sort(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * dir;
    });
  }, [filtered, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages);
  const shown = sorted.slice((current - 1) * pageSize, current * pageSize);

  const toggleSort = (key) => { setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' })); reset(); };
  const clear = () => { setQuery(''); setValues({}); setRange({ from: '', to: '' }); reset(); };

  if (!rows.length) return empty || <EmptyState title="Nothing here yet" />;

  return (
    <section className="card datatable">
      <div className="toolbar">
        {searchText && (
          <label className="search-box">
            <Search size={16} aria-hidden="true" />
            <input type="search" className="table-search-input" placeholder={searchPlaceholder} aria-label={searchPlaceholder} value={query} onChange={(e) => { setQuery(e.target.value); reset(); }} />
          </label>
        )}
        {filters.map((f) => (
          <select key={f.key} className="select toolbar-select" aria-label={f.label} value={values[f.key] || ''} onChange={(e) => { setValues({ ...values, [f.key]: e.target.value }); reset(); }}>
            <option value="">{f.label}: all</option>
            {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        {dateField && (
          <span className="toolbar-dates">
            <input type="date" className="input toolbar-date" aria-label="From date" value={range.from} onChange={(e) => { setRange({ ...range, from: e.target.value }); reset(); }} />
            <span className="muted small">to</span>
            <input type="date" className="input toolbar-date" aria-label="To date" value={range.to} onChange={(e) => { setRange({ ...range, to: e.target.value }); reset(); }} />
          </span>
        )}
        {toolbarExtra}
        {active && <Button size="small" variant="ghost" onClick={clear}><X size={14} aria-hidden="true" /> Clear</Button>}
        <span className="toolbar-count muted small" aria-live="polite">{sorted.length === rows.length ? `${rows.length} total` : `${sorted.length} of ${rows.length}`}</span>
      </div>
      {!sorted.length ? <p className="panel-empty muted">{noMatch}</p> : (
        <div className="table-wrap">
          <table className="table table-hover">
            <thead><tr>{columns.map((c) => (
              <th key={c.key} className={c.align === 'right' ? 'right' : ''} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                {c.sort ? (
                  <button type="button" className="th-sort" onClick={() => toggleSort(c.key)}>{c.label}{sort?.key === c.key && (sort.dir === 'asc' ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />)}</button>
                ) : c.label}
              </th>
            ))}</tr></thead>
            <tbody>{shown.map((r) => (
              <tr key={rowKey(r)}>{columns.map((c) => <td key={c.key} className={`${c.align === 'right' ? 'right' : ''} ${c.className || ''}`.trim()}>{c.render(r)}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="pager">
          <span className="muted small">Page {current} of {pages}</span>
          <div className="row">
            <Button size="small" variant="secondary" disabled={current <= 1} onClick={() => setPage(current - 1)} aria-label="Previous page"><ChevronLeft size={14} aria-hidden="true" /></Button>
            <Button size="small" variant="secondary" disabled={current >= pages} onClick={() => setPage(current + 1)} aria-label="Next page"><ChevronRight size={14} aria-hidden="true" /></Button>
          </div>
        </div>
      )}
    </section>
  );
}
