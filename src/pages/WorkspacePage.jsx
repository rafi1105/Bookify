import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, dhakaTime, money } from '../lib/bookifyApi';

function Field({ label, name, type = 'text', ...props }) {
  return <label>{label}<input name={name} type={type} required {...props} /></label>;
}

function ActionForm({ title, onSubmit, children, action, busy }) {
  return <form className="bookify-panel bookify-form" onSubmit={(event) => {
    event.preventDefault();
    const form = event.currentTarget;
    onSubmit(Object.fromEntries(new FormData(form)), form);
  }}>
    <h3>{title}</h3>{children}<button disabled={busy}>{action}</button>
  </form>;
}

function VendorForms({ data, update, busy }) {
  const { buses, proposals } = data;
  return <div className="bookify-grid">
    <ActionForm title="Add a bus" action="Register bus" busy={busy} onSubmit={(body, form) => update('/workspace/buses', body, form)}>
      <Field label="Bus name" name="name" maxLength={100} />
      <Field label="Registration / license reference" name="registration" maxLength={100} />
      <label>Coach class<select name="coach"><option>AC</option><option>Non-AC</option><option>Sleeper</option></select></label>
      <Field label="Seats or berths" name="count" type="number" min="1" max="60" />
      <Field label="Bus image (HTTPS URL)" name="image" type="url" maxLength={500} required={false} />
      <label>Upload a photo (optional)<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /></label>
    </ActionForm>
    <ActionForm title="Propose a route and fare" action="Submit for approval" busy={busy} onSubmit={(body, form) => update('/workspace/proposals', body, form)}>
      <Field label="Origin" name="origin" maxLength={100} />
      <Field label="Destination" name="destination" maxLength={100} />
      <Field label="Boarding point" name="boarding" maxLength={100} />
      <Field label="Drop-off point" name="dropping" maxLength={100} />
      <Field label="Fare per seat (BDT)" name="fare" type="number" min="100" max="10000" />
    </ActionForm>
    <ActionForm title="Schedule a departure" action="Publish trip" busy={busy} onSubmit={(body, form) => update('/workspace/trips', body, form)}>
      <label>Bus<select name="bus" required><option value="">Choose a bus</option>
        {buses.filter((bus) => !bus.suspended).map((bus) => <option key={bus.id} value={bus.id}>{bus.name}</option>)}
      </select></label>
      <label>Approved route and fare<select name="proposal" required><option value="">Choose an approval</option>
        {proposals.filter((proposal) => proposal.decision === 'approved').map((proposal) => (
          <option key={proposal.id} value={proposal.id}>{proposal.origin} → {proposal.destination} · {proposal.duration} min · {money(proposal.fare)}</option>
        ))}
      </select></label>
      <Field label="Departure (Dhaka time)" name="departure" type="datetime-local" />
      <Field label="Repeat daily (number of departures)" name="occurrences" type="number" min="1" max="14" defaultValue="1" />
    </ActionForm>
  </div>;
}

function Proposals({ data, admin, busy, update }) {
  return <section className="bookify-stack">
    <h2>Route and fare requests</h2>
    {data.proposals.length === 0 && <p>No requests yet.</p>}
    <div className="bookify-grid">
      {data.proposals.map((proposal) => (
        <article className="bookify-panel bookify-stack" key={proposal.id}>
          <h3>{proposal.origin} → {proposal.destination}</h3>
          <p>{proposal.vendor} · {money(proposal.fare)} · {proposal.decision}</p>
          <p>{proposal.boarding} → {proposal.dropping}</p>
          {proposal.duration && <p>Approved duration {proposal.duration} min</p>}
          {proposal.reason && <p>{proposal.reason}</p>}
          {admin && proposal.decision === 'pending' && (
            <form className="bookify-form" onSubmit={(event) => {
              event.preventDefault();
              const submitter = event.nativeEvent.submitter;
              const fields = Object.fromEntries(new FormData(event.currentTarget));
              update('/workspace/proposals/' + proposal.id, { ...fields, decision: submitter.value });
            }}>
              <Field label="Journey duration (minutes)" name="duration" type="number" min="15" max="1440" />
              <Field label="Decision note" name="reason" required={false} maxLength={300} />
              <div className="bookify-actions">
                <button value="approved" disabled={busy}>Approve</button>
                <button value="rejected" formNoValidate disabled={busy}>Reject</button>
              </div>
            </form>
          )}
        </article>
      ))}
    </div>
  </section>;
}

function Fleet({ data, admin, busy, update }) {
  return <section className="bookify-stack">
    <h2>Fleet, incidents and reputation</h2>
    {data.buses.length === 0 && <p>No buses registered.</p>}
    <div className="bookify-grid">
      {data.buses.map((bus) => {
        const incidents = data.incidents.filter((item) => item.bus_id === bus.id);
        const reviews = data.reviews.filter((item) => item.bus_id === bus.id);
        return <article className="bookify-panel bookify-stack" key={bus.id}>
          {bus.image && <img className="bookify-coach-image" src={bus.image} alt="" loading="lazy" />}
          <h3>{bus.name}</h3>
          <p>{bus.vendor} · {bus.registration} · {bus.coach} · {bus.seats.length} seats</p>
          <p>{bus.suspended ? 'License suspended in Bookify' : 'Active license record'}</p>
          <p>{reviews.length ? (reviews.reduce((total, item) => total + item.rating, 0) / reviews.length).toFixed(1) + '/5 from ' + reviews.length + ' reviews' : 'No passenger reviews'}</p>
          {incidents.length ? <ul>{incidents.map((incident) => <li key={incident.id}>{dhakaTime(incident.created_at)} · {incident.note}</li>)}</ul> : <p>No incident records</p>}
          {admin && <>
            <button disabled={busy} onClick={() => update('/workspace/buses/' + bus.id, { suspended: !bus.suspended })}>
              {bus.suspended ? 'Reinstate license' : 'Suspend license'}
            </button>
            <form className="bookify-form" onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              update('/workspace/buses/' + bus.id, Object.fromEntries(new FormData(form)), form);
            }}>
              <Field label="Incident details and source" name="incident" maxLength={400} />
              <button disabled={busy}>Record incident</button>
            </form>
          </>}
        </article>;
      })}
    </div>
  </section>;
}

function Reports({ data, user, busy, update }) {
  return <>
    <section className="bookify-stack">
      <h2>{user.role === 'admin' ? 'Vendor sales and availability' : 'Sales and availability'}</h2>
      <div className="bookify-grid">
        {(user.role === 'admin' ? data.vendors : [user.vendor]).map((vendor) => {
          const suspension = data.suspensions.find((item) => item.vendor === vendor);
          const buses = data.buses.filter((bus) => bus.vendor === vendor);
          const active = buses.filter((bus) => !bus.suspended && !suspension);
          const trips = data.trips.filter((trip) => trip.vendor === vendor && !trip.cancelled && active.some((bus) => bus.id === trip.bus_id) && Date.parse(trip.departure) > Date.now());
          const orders = data.orders.filter((order) => order.bookify_trips.vendor === vendor);
          const confirmed = orders.filter((order) => order.state === 'confirmed');
          const sold = confirmed.filter((order) => trips.some((trip) => trip.id === order.trip_id)).reduce((total, order) => total + order.seats.length, 0);
          const capacity = trips.reduce((total, trip) => total + trip.seats.length, 0);
          const captured = orders.filter((order) => order.state !== 'held').reduce((total, order) => total + order.total, 0);
          const refunded = orders.filter((order) => order.state === 'refunded').reduce((total, order) => total + order.total, 0);
          return <article className="bookify-panel bookify-stack" key={vendor}>
            <h3>{vendor}</h3>
            <p>{active.length}/{buses.length} active buses · {trips.length} upcoming trips</p>
            <p>{sold}/{capacity} confirmed seats on upcoming trips</p>
            <p>Captured {money(captured)} · Refunded {money(refunded)} · Net {money(captured - refunded)}</p>
            {suspension && <p>Suspended · {suspension.reason}</p>}
            {user.role === 'admin' && <form className="bookify-form" onSubmit={(event) => {
              event.preventDefault();
              update('/workspace/vendors', { ...Object.fromEntries(new FormData(event.currentTarget)), vendor, suspended: !suspension });
            }}>
              {!suspension && <Field label="Suspension reason" name="reason" maxLength={300} />}
              <button disabled={busy}>{suspension ? 'Reinstate vendor' : 'Suspend vendor'}</button>
            </form>}
          </article>;
        })}
      </div>
    </section>
    <section className="bookify-stack">
      <h2>Published trips and manifests</h2>
      {data.trips.length === 0 && <p>No departures published.</p>}
      {data.trips.map((trip) => {
        const affected = data.suspensions.some((item) => item.vendor === trip.vendor) ||
          data.buses.some((item) => item.id === trip.bus_id && item.suspended);
        const bookings = data.orders.filter((order) => order.trip_id === trip.id && order.state !== 'held');
        const refundable = bookings.some((order) => order.state === 'refund_required');
        return <article className="bookify-panel bookify-stack" key={trip.id}>
          <h3>{trip.origin} → {trip.destination}</h3>
          <p>{trip.vendor} · {trip.bus_name} · {money(trip.fare)}</p>
          <p>{dhakaTime(trip.departure)} → {dhakaTime(trip.arrival)}</p>
          <p>{trip.cancelled ? 'Cancelled' : affected ? 'Suspended · review passengers' : 'Published'}</p>
          {!!bookings.length && <details><summary>Manifest and refunds ({bookings.length})</summary>
            <ul>{bookings.map((order) => (
              <li key={order.id}>{order.passenger} · {order.seats.join(', ')} · {order.state} · {order.id}</li>
            ))}</ul>
          </details>}
          {((!trip.cancelled && Date.parse(trip.departure) > Date.now()) || (trip.cancelled && refundable)) && (
            <button disabled={busy} onClick={() => {
              if (trip.cancelled || window.confirm('Cancel this departure and refund confirmed tickets?')) update('/workspace/trips/' + trip.id + '/cancel', {});
            }}>{trip.cancelled ? 'Retry refunds' : 'Cancel trip and refund tickets'}</button>
          )}
        </article>;
      })}
    </section>
  </>;
}

export default function WorkspacePage() {
  const [session, setSession] = useState(null);
  const [data, setData] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api('/session').then(async (details) => {
      if (!active) return;
      setSession(details);
      if (['admin', 'vendor'].includes(details.user?.role)) {
        const workspace = await api('/workspace');
        if (active) setData(workspace);
      }
    }).catch((problem) => { if (active) setError(problem.message); });
    return () => { active = false; };
  }, []);

  async function update(path, body, form) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (path === '/workspace/buses') {
        const photo = body.photo;
        delete body.photo;
        if (photo?.size) {
          if (photo.size > 1048576) throw new Error('Choose a photo under 1 MB');
          const bytes = new Uint8Array(await photo.arrayBuffer());
          let binary = '';
          for (const byte of bytes) binary += String.fromCharCode(byte);
          const upload = await api('/workspace/photos', { mime: photo.type, base64: btoa(binary) });
          body.image = upload.url;
        }
      }
      const response = await api(path, body);
      if (path === '/session') {
        setData(null);
        setSession((current) => ({ ...current, user: response.user }));
        if (response.user.role === 'passenger') return;
      }
      setData(await api('/workspace'));
      if (path !== '/session') { form?.reset(); setNotice('Changes saved.'); }
    } catch (problem) { setError(problem.message); }
    finally { setBusy(false); }
  }

  const user = session?.user;
  return <section className="page-container bookify-stack">
    <header className="page-header">
      <h1 className="page-title">{user?.role === 'admin' ? 'Admin dashboard' : user?.role === 'vendor' ? user.vendor : 'Bookify demo login'}</h1>
      <p className="page-subtitle">Switch between demo roles using synthetic data.</p>
    </header>
    <nav className="bookify-actions" aria-label="Demo login">
      <button disabled={busy} onClick={() => update('/session', { role: 'passenger' })}>Passenger login</button>
      {session?.vendors.map((vendor) => (
        <button disabled={busy} key={vendor} onClick={() => update('/session', { role: 'vendor', vendor })}>{vendor} login</button>
      ))}
      <button disabled={busy} onClick={() => update('/session', { role: 'admin' })}>Admin login</button>
      <Link to="/search">Search trips</Link><Link to="/my-bookings">My bookings</Link>
    </nav>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {data && user?.role === 'vendor' && <VendorForms data={data} update={update} busy={busy} />}
    {data && user && <>
      <Proposals data={data} admin={user.role === 'admin'} busy={busy} update={update} />
      <Fleet data={data} admin={user.role === 'admin'} busy={busy} update={update} />
      <Reports data={data} user={user} busy={busy} update={update} />
    </>}
  </section>;
}
