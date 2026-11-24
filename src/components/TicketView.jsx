import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ArrowRight, Bus, MapPin } from 'lucide-react';
import { Badge } from './ui.jsx';
import { COACH_LABEL, formatBDT, formatDate, formatTime } from '../lib/format.js';

export const STATUS_TONE = { CONFIRMED: 'ok', PENDING_PAYMENT: 'warn', CANCELLED: 'danger', REFUNDED: 'info', EXPIRED: '' };
export const STATUS_LABEL = { CONFIRMED: 'Confirmed', PENDING_PAYMENT: 'Awaiting payment', CANCELLED: 'Cancelled', REFUNDED: 'Refunded', EXPIRED: 'Expired' };

export default function TicketView({ booking }) {
  const [qr, setQr] = useState('');
  useEffect(() => {
    QRCode.toDataURL(`BOOKIFY:${booking.pnr}`, { margin: 1, width: 180 }).then(setQr).catch(() => setQr(''));
  }, [booking.pnr]);
  const t = booking.trip;
  const valid = booking.status === 'CONFIRMED';

  return (
    <article className={`ticket card ${valid ? '' : 'ticket-void'}`} aria-label={`Ticket ${booking.pnr}`}>
      <header className="ticket-head row-between">
        <span className="row"><Bus size={18} aria-hidden="true" /> <strong>{t.operator}</strong></span>
        <Badge tone={STATUS_TONE[booking.status]}>{STATUS_LABEL[booking.status] || booking.status}</Badge>
      </header>
      <div className="ticket-body">
        <div className="stack">
          <div className="ticket-route">{t.origin} <ArrowRight size={18} aria-hidden="true" /> {t.destination}</div>
          <div className="ticket-grid">
            <div><span className="muted small">Date</span><strong>{formatDate(t.departureAt)}</strong></div>
            <div><span className="muted small">Departs</span><strong>{formatTime(t.departureAt)}</strong></div>
            <div><span className="muted small">Arrives</span><strong>{formatTime(t.arrivalAt)}</strong></div>
            <div><span className="muted small">Coach</span><strong>{COACH_LABEL[t.busType] || t.busType}</strong></div>
            <div><span className="muted small">Bus</span><strong>{t.busName} · {t.regNo}</strong></div>
            <div><span className="muted small">Seats</span><strong>{booking.seats.map((s) => s.seat).join(', ')}</strong></div>
          </div>
          <div className="ticket-stops">
            <div><MapPin size={14} aria-hidden="true" /> <strong>Board:</strong> {booking.boarding?.name}{booking.boarding && ` at ${formatTime(booking.boarding.time)}`}{booking.boarding?.address && <span className="muted"> · {booking.boarding.address}</span>}</div>
            <div><MapPin size={14} aria-hidden="true" /> <strong>Drop:</strong> {booking.dropping?.name}{booking.dropping?.address && <span className="muted"> · {booking.dropping.address}</span>}</div>
          </div>
          <table className="table ticket-passengers">
            <thead><tr><th>Seat</th><th>Passenger</th><th>Age</th><th>Gender</th></tr></thead>
            <tbody>
              {booking.seats.map((s) => (
                <tr key={s.seat}><td><strong>{s.seat}</strong></td><td>{s.passenger?.name || '—'}</td><td>{s.passenger?.age ?? '—'}</td><td>{s.passenger?.gender ? s.passenger.gender.charAt(0) + s.passenger.gender.slice(1).toLowerCase() : '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside className="ticket-side">
          {qr && valid ? <img src={qr} alt={`QR code for ticket ${booking.pnr}`} width="140" height="140" /> : <div className="ticket-qr-void">{valid ? '' : 'Not valid for travel'}</div>}
          <div className="muted small">PNR</div>
          <div className="pnr">{booking.pnr}</div>
          <div className="muted small">Total paid</div>
          <strong>{formatBDT(booking.total)}</strong>
        </aside>
      </div>
      <footer className="ticket-foot muted small">
        Contact: {booking.contact.name} · {booking.contact.phone}. Please arrive 20 minutes before departure and carry a photo ID.
      </footer>
    </article>
  );
}
