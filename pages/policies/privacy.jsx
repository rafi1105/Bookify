import Prose from '../../src/components/Prose.jsx';

export default function Privacy() {
  return (
    <Prose title="Privacy policy" updated="24 November 2026">
      <h2>What we collect</h2>
      <p>Your name, mobile number and e-mail address; the names, ages and genders of the passengers you book for; your bookings and payment status. We do not store card or mobile-wallet credentials. Those are handled by the payment provider.</p>
      <h2>How we use it</h2>
      <p>To issue and manage tickets, to let operators prepare passenger manifests for the trips you booked, to process payments and refunds, to contact you about your trip, and to prevent fraud.</p>
      <h2>Who sees it</h2>
      <p>The operator of a trip you booked sees the passenger name, age, gender, seat, boarding point and contact number for that trip only. Our payment provider processes your payment. We do not sell personal data.</p>
      <h2>Your choices</h2>
      <p>You can update your profile at any time. To correct or delete your account data, contact support. We keep booking and payment records as long as the law requires.</p>
    </Prose>
  );
}
