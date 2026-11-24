import Head from 'next/head';
import { useState } from 'react';
import { Printer } from 'lucide-react';
import TicketView from '../src/components/TicketView.jsx';
import { Alert, Button, Field, PageHeader } from '../src/components/ui.jsx';
import { api } from '../src/lib/api.js';

export default function ManageBooking() {
  const [form, setForm] = useState({ pnr: '', phone: '' });
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function find(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setBooking(null);
    try {
      setBooking(await api('/api/bookings/lookup', { method: 'POST', body: form, auth: false }));
    } catch (e) {
      setError(e.status === 404 ? 'We could not find a booking with that PNR and mobile number. Check both and try again.' : e.message);
    }
    setBusy(false);
  }

  return (
    <>
      <Head><title>Manage booking · Bookify</title></Head>
      <PageHeader title="Manage booking" subtitle="Find your ticket with your PNR and the mobile number used when booking." />
      <div className="container stack narrow-wide">
        <form className="card card-pad stack" onSubmit={find}>
          <div className="form-grid">
            <Field label="PNR" id="pnr"><input id="pnr" className="input" autoCapitalize="characters" value={form.pnr} onChange={(e) => setForm({ ...form, pnr: e.target.value.toUpperCase() })} /></Field>
            <Field label="Mobile number" id="phone"><input id="phone" className="input" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
          {error && <Alert kind="error">{error}</Alert>}
          <div><Button type="submit" loading={busy} disabled={form.pnr.length < 6 || form.phone.length < 10}>Find my ticket</Button></div>
        </form>
        {booking && (
          <>
            <div className="row-between no-print">
              <p className="muted small">To cancel a ticket, sign in with the account used to book it and open My bookings.</p>
              <Button variant="secondary" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Print</Button>
            </div>
            <TicketView booking={booking} />
          </>
        )}
      </div>
    </>
  );
}
