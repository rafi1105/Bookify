import React from 'react';
import Link from 'next/link';

const questions = [
  ['How do I find my ticket?', 'Sign in as a Passenger and open My bookings. A ticket appears after Stripe confirms payment.'],
  ['When can I cancel?', 'Cancel before the scheduled departure to receive a full refund. The deadline and amount appear before payment and on your confirmed booking.'],
  ['How do I open a dashboard?', 'Select Sign in at the top of the page, then choose Vendor or Admin. To change roles, sign out first.'],
  ['Can I track a bus?', 'The demo tracker shows simulated journeys. Real GPS data is outside this demo.'],
];

export default function ContactPage() {
  return <section className="page-container site-help bookify-stack">
    <h1>Bookify help</h1>
    {questions.map(([question, answer]) => <details className="bookify-panel" key={question}>
      <summary>{question}</summary><p>{answer}</p>
    </details>)}
    <div className="bookify-actions"><Link href="/my-bookings">My bookings</Link><Link href="/demo-tracker">Open demo tracker</Link></div>
  </section>;
}
