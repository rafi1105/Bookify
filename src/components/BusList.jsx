import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bus } from 'lucide-react';
import DataTable from './DataTable.jsx';
import { ConfirmModal, EditBusModal } from './BusActions.jsx';
import { Badge, Button, EmptyState } from './ui.jsx';
import { api } from '../lib/api.js';
import { COACH_LABEL, COACH_OPTIONS } from '../lib/format.js';

const STATUS = [['ACTIVE', 'Available'], ['OFF_DUTY', 'Off duty'], ['SUSPENDED', 'Suspended']];
const COND = { NORMAL: null, IN_TRAFFIC: 'In traffic', ACCIDENT: 'Accident', BREAKDOWN: 'Breakdown' };

// Searchable, filterable, sortable list of buses used by the operator and admin Buses pages.
export default function BusList({ buses, admin = false, detailHref, patchUrl, onChange, onAdd }) {
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);

  const columns = useMemo(() => [
    { key: 'code', label: 'Code', sort: (b) => b.code, render: (b) => <Link href={detailHref(b.id)}><code className="code">{b.code}</code></Link> },
    { key: 'name', label: 'Coach', sort: (b) => b.name, render: (b) => (
      <Link href={detailHref(b.id)} className="bus-cell">
        {b.image_url ? <img className="bus-thumb" src={b.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="bus-thumb bus-thumb-empty"><Bus size={16} aria-hidden="true" /></span>}
        <span><strong>{b.name}</strong><span className="muted small block">{b.model_no}</span></span>
      </Link>
    ) },
    { key: 'reg', label: 'Registration', sort: (b) => b.reg_no, render: (b) => <strong>{b.reg_no}</strong> },
    ...(admin ? [{ key: 'operator', label: 'Operator', sort: (b) => b.operator, render: (b) => b.operator }] : []),
    { key: 'class', label: 'Class', sort: (b) => b.bus_type, render: (b) => COACH_LABEL[b.bus_type] },
    { key: 'seats', label: 'Seats', sort: (b) => b.capacity, render: (b) => b.capacity },
    { key: 'status', label: 'Status', sort: (b) => b.status, render: (b) => (
      <span className="stack-xs">
        <Badge tone={b.status === 'ACTIVE' ? 'ok' : 'danger'}>{b.status === 'ACTIVE' ? 'Available' : b.status === 'OFF_DUTY' ? 'Off duty' : 'Suspended'}</Badge>
        {COND[b.condition] && <Badge tone="warn">{COND[b.condition]}</Badge>}
      </span>
    ) },
    { key: 'actions', label: '', align: 'right', className: 'nowrap', render: (b) => (
      <>
        <Link href={detailHref(b.id)} className="btn btn-ghost btn-small">Details</Link>
        <Button variant="ghost" size="small" onClick={() => setEditing({ ...b, amenities: b.amenities || [] })}>Edit</Button>
        <Button variant="ghost" size="small" onClick={() => setRemoving(b)}>Delete</Button>
      </>
    ) },
  ], [admin, detailHref]);

  const operators = useMemo(() => [...new Set(buses.map((b) => b.operator).filter(Boolean))].sort().map((o) => [o, o]), [buses]);
  const filters = useMemo(() => [
    { key: 'class', label: 'Class', options: COACH_OPTIONS, match: (b, v) => b.bus_type === v },
    { key: 'status', label: 'Status', options: STATUS, match: (b, v) => b.status === v },
    ...(admin ? [{ key: 'operator', label: 'Operator', options: operators, match: (b, v) => b.operator === v }] : []),
  ], [admin, operators]);

  return (
    <>
      <DataTable rows={buses} columns={columns} filters={filters} initialSort={{ key: 'code', dir: 'asc' }}
        searchPlaceholder="Search registration, bus code, name or model"
        searchText={(b) => `${b.reg_no} ${b.code} ${b.name} ${b.model_no} ${b.operator || ''}`}
        empty={<EmptyState icon={Bus} title="No buses yet" action={onAdd && <Button onClick={onAdd}>Add your first bus</Button>}>Add a bus with its real seat layout. It gets a unique code automatically.</EmptyState>} />
      {editing && <EditBusModal bus={editing} patchUrl={patchUrl} onClose={() => setEditing(null)} onDone={() => { setEditing(null); onChange(); }} />}
      {removing && <ConfirmModal title={`Delete ${removing.code}?`} message={`${removing.name} (${removing.reg_no}) and its unsold trips will be removed. This cannot be undone. A bus with bookings cannot be deleted: set it Off duty instead.`}
        onClose={() => setRemoving(null)} onConfirm={async () => { await api(patchUrl(removing.id), { method: 'DELETE' }); setRemoving(null); onChange(); }} />}
    </>
  );
}
