import Head from 'next/head';
import Link from 'next/link';
import { PageHeader } from '../src/components/ui.jsx';

const FAQ = [
  ['How do I book a ticket?', <>Search your route and date on the <Link href="/">home page</Link>, choose a bus, pick your seats and boarding point, enter passenger details and pay online. Your ticket appears in My bookings straight away.</>],
  ['How long are my seats held?', 'Once you continue from the seat map, your seats are held for 10 minutes. If you do not pay in that time they are released for other passengers.'],
  ['How do I find my ticket?', <>Sign in and open <Link href="/account/bookings">My bookings</Link>. If you booked with an account that you cannot reach, use <Link href="/manage-booking">Manage booking</Link> with your PNR and the mobile number used at booking.</>],
  ['Can I cancel my ticket?', <>Yes, until 12 hours before departure, with a refund that depends on how early you cancel. See the <Link href="/policies/refunds">refund policy</Link>.</>],
  ['I paid but have no ticket', 'Confirmation can take a minute after payment. Open the booking page and wait for it to update. If your payment went through but no ticket appears, do not pay again: contact support with your PNR.'],
  ['What do I need at boarding?', 'Your PNR or QR code (on your phone or printed) and a photo ID. Arrive at least 20 minutes before departure.'],
  ['How do I sell tickets as an operator?', <><Link href="/operator/register">Register your company</Link> with just an e-mail, password and company name. Then add buses, request routes with your price and journey time (an administrator approves them), and publish trips.</>],
];

export default function Help() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  return (
    <>
      <Head><title>Help centre · Bookify</title></Head>
      <PageHeader title="Help centre" subtitle="Answers to common questions." />
      <div className="container narrow-wide stack">
        {FAQ.map(([q, a]) => (
          <details key={q} className="card card-pad faq"><summary>{q}</summary><p className="muted">{a}</p></details>
        ))}
        <div className="card card-pad">
          <h3>Still need help?</h3>
          <p className="muted">{email ? <>Write to <a href={`mailto:${email}`}>{email}</a> with your PNR and we will get back to you.</> : 'Support contact details will be shown here once configured.'}</p>
        </div>
      </div>
    </>
  );
}
