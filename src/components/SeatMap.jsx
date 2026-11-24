import { Clock, DoorOpen, Lock } from 'lucide-react';

// layout = {kind:'SEAT'|'BERTH', decks:[{label, rows:[[seat|'']...]}]}
// Seats at the ends of a row are by the window, seats next to the aisle gap are aisle seats.
function position(row, index) {
  const cells = row.map((s, i) => [s, i]).filter(([s]) => s);
  if (!cells.length) return '';
  const first = cells[0][1];
  const last = cells[cells.length - 1][1];
  if (index === first || index === last) return 'window';
  const gap = row.indexOf('');
  if (gap > 0 && (index === gap - 1 || index === gap + 1)) return 'aisle';
  return 'middle';
}

function SteeringWheel() {
  return (
    <svg className="steering" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.2" /><path d="M12 14.2V21M9.9 11.1 3.3 9.4M14.1 11.1l6.6-1.7" />
    </svg>
  );
}

export default function SeatMap({ layout, booked = [], held = [], mine = [], selected = [], onToggle, max = 4, readOnly = false }) {
  const bookedSet = new Set(booked);
  const heldSet = new Set(held);
  const mineSet = new Set(mine);
  const chosen = new Set(selected);
  const berth = layout.kind === 'BERTH';

  function state(seat) {
    if (bookedSet.has(seat)) return 'booked';
    if (mineSet.has(seat)) return 'mine';
    if (heldSet.has(seat)) return 'held';
    if (chosen.has(seat)) return 'selected';
    return 'free';
  }

  return (
    <div className="seatmap" role="group" aria-label={berth ? 'Berth map' : 'Seat map'}>
      <ul className="seat-legend" aria-label="Legend">
        <li><span className="seat-key seat-free" /> Available</li>
        <li><span className="seat-key seat-selected" /> Your selection</li>
        <li><span className="seat-key seat-mine" /> Held by you</li>
        <li><span className="seat-key seat-held" /> Held by someone</li>
        <li><span className="seat-key seat-booked" /> Sold</li>
      </ul>
      <div className="seat-decks">
        {layout.decks.map((deck) => (
          <div key={deck.label} className="seat-deck">
            {layout.decks.length > 1 && <div className="seat-deck-label">{deck.label} deck</div>}
            <div className="seat-bus">
              <div className="seat-windshield" aria-hidden="true" />
              <div className="seat-cabin" aria-hidden="true">
                <span className="seat-door"><DoorOpen size={16} /> Door</span>
                <span className="seat-driver"><SteeringWheel /> Driver</span>
              </div>
              <div className="seat-rows">
                {deck.rows.map((row, r) => (
                  <div key={r} className="seat-row">
                    {row.map((seat, c) => {
                      if (!seat) return <span key={c} className="seat-gap" aria-hidden="true" />;
                      const st = state(seat);
                      const blocked = st === 'booked' || st === 'held' || st === 'mine';
                      const full = st === 'free' && selected.length >= max;
                      const pos = position(row, c);
                      return (
                        <button
                          key={c}
                          type="button"
                          className={`seat seat-${st} ${berth ? 'seat-berth' : ''}`}
                          aria-pressed={st === 'selected'}
                          aria-label={`${berth ? 'Berth' : 'Seat'} ${seat}${pos ? `, ${pos}` : ''}, ${st === 'free' ? 'available' : st === 'selected' ? 'selected' : st === 'mine' ? 'held by you, finish checkout to keep it' : st === 'held' ? 'held by another passenger' : 'sold'}`}
                          title={`${seat}${pos ? ` · ${pos}` : ''}${st === 'mine' ? ' · held by you' : st === 'held' ? ' · held by someone' : ''}`}
                          disabled={readOnly || blocked || full}
                          onClick={() => onToggle?.(seat)}
                        >
                          <span>{seat}</span>
                          {st === 'mine' && <Lock size={11} className="seat-badge" aria-hidden="true" />}
                          {st === 'held' && <Clock size={11} className="seat-badge" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="seat-rear" aria-hidden="true" />
            </div>
          </div>
        ))}
      </div>
      <p className="muted small seat-hint">Seats at the edges are by the window; seats beside the gap are on the aisle.</p>
    </div>
  );
}
