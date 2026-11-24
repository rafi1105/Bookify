import Countdown from './Countdown.jsx';

// Sticky bar under the header while seats are held, so the countdown is always in view.
export default function HoldBar({ seats, until, onExpire, children }) {
  return (
    <div className="hold-bar" role="region" aria-label="Seat hold">
      <div className="container hold-bar-inner">
        <span>Seats <strong>{seats.join(', ')}</strong> held for you · pay within <Countdown until={until} onExpire={onExpire} /></span>
        {children && <span className="row">{children}</span>}
      </div>
    </div>
  );
}
