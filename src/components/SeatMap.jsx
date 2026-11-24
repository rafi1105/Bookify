import { Armchair, BedSingle } from 'lucide-react';

// layout = {kind:'SEAT'|'BERTH', decks:[{label, rows:[[seat|'']...]}]}
export default function SeatMap({ layout, booked = [], held = [], selected = [], onToggle, max = 4, readOnly = false }) {
  const bookedSet = new Set(booked);
  const heldSet = new Set(held);
  const chosen = new Set(selected);
  const Icon = layout.kind === 'BERTH' ? BedSingle : Armchair;

  function state(seat) {
    if (bookedSet.has(seat)) return 'booked';
    if (heldSet.has(seat)) return 'held';
    if (chosen.has(seat)) return 'selected';
    return 'free';
  }

  return (
    <div className="seatmap" role="group" aria-label="Seat map">
      <ul className="seat-legend" aria-label="Legend">
        <li><span className="seat-key seat-free" /> Available</li>
        <li><span className="seat-key seat-selected" /> Your selection</li>
        <li><span className="seat-key seat-held" /> Held by someone</li>
        <li><span className="seat-key seat-booked" /> Sold</li>
      </ul>
      <div className="seat-decks">
        {layout.decks.map((deck) => (
          <div key={deck.label} className="seat-deck">
            {layout.decks.length > 1 && <div className="seat-deck-label">{deck.label} deck</div>}
            <div className="seat-bus">
              <div className="seat-front" aria-hidden="true"><span>Front</span><span className="seat-driver">Driver</span></div>
              {deck.rows.map((row, r) => (
                <div key={r} className="seat-row">
                  {row.map((seat, c) => {
                    if (!seat) return <span key={c} className="seat-gap" aria-hidden="true" />;
                    const st = state(seat);
                    const blocked = st === 'booked' || st === 'held';
                    const full = st === 'free' && selected.length >= max;
                    return (
                      <button
                        key={c}
                        type="button"
                        className={`seat seat-${st} ${layout.kind === 'BERTH' ? 'seat-berth' : ''}`}
                        aria-pressed={st === 'selected'}
                        aria-label={`${layout.kind === 'BERTH' ? 'Berth' : 'Seat'} ${seat}, ${st === 'free' ? 'available' : st === 'selected' ? 'selected' : st === 'held' ? 'held by another passenger' : 'sold'}`}
                        disabled={readOnly || blocked || full}
                        onClick={() => onToggle?.(seat)}
                      >
                        <Icon size={16} aria-hidden="true" />
                        <span>{seat}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
