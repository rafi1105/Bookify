import Prose from '../../src/components/Prose.jsx';

export default function Refunds() {
  return (
    <Prose title="Refund and cancellation policy" updated="24 November 2026">
      <h2>If you cancel</h2>
      <p>You can cancel a confirmed ticket online from My bookings until 12 hours before departure. The refund depends on how early you cancel:</p>
      <table className="table">
        <thead><tr><th>Time before departure</th><th>Refund of ticket price</th></tr></thead>
        <tbody>
          <tr><td>48 hours or more</td><td>90%</td></tr>
          <tr><td>24 to 48 hours</td><td>75%</td></tr>
          <tr><td>12 to 24 hours</td><td>50%</td></tr>
          <tr><td>Less than 12 hours</td><td>Not cancellable online</td></tr>
        </tbody>
      </table>
      <p>Refunds go back to the payment method you used, normally within 7 working days of cancellation. Payment provider charges are not refundable.</p>
      <h2>If the operator cancels</h2>
      <p>If an operator or Bookify cancels a trip, you receive a full refund automatically, with the reason shown on your ticket.</p>
      <h2>If payment arrives after your seats were released</h2>
      <p>Seats are held for 10 minutes. If a payment is completed after the hold ended and the seats are no longer free, the booking is not confirmed and you receive a full refund.</p>
      <h2>If you miss the bus</h2>
      <p>Tickets are not refundable once the bus has departed or if you do not arrive at the boarding point.</p>
    </Prose>
  );
}
