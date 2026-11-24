// Builds the seat layout JSON stored in bus_capacities.seat_layout_json.
// pattern = seats either side of the aisle, e.g. "2+2". An empty string is the aisle.
// Rows are lettered A, B, C... (continuing on the upper deck); seats are numbered along the row.
export const PATTERNS = { '2+2': [2, 2], '2+1': [2, 1], '1+2': [1, 2], '1+1': [1, 1], '3+2': [3, 2] };
export const MAX_SEATS = 80;

export function buildLayout({ pattern = '2+2', rows = 10, kind = 'SEAT', decks = 1 }) {
  const sides = PATTERNS[pattern];
  if (!sides) throw new Error('Unknown seat pattern');
  if (!Number.isInteger(rows) || rows < 2 || rows > 20) throw new Error('Rows must be between 2 and 20');
  if (![1, 2].includes(decks)) throw new Error('Decks must be 1 or 2');
  if (!['SEAT', 'BERTH'].includes(kind)) throw new Error('Unknown seat kind');
  if (rows * decks > 26) throw new Error('Use at most 13 rows per deck on a double-deck coach');

  const built = Array.from({ length: decks }, (_, d) => ({
    label: decks === 1 ? 'Main' : d === 0 ? 'Lower' : 'Upper',
    rows: Array.from({ length: rows }, (_, r) => {
      const prefix = String.fromCharCode(65 + d * rows + r);
      let n = 1;
      return [
        ...Array.from({ length: sides[0] }, () => prefix + n++),
        '',
        ...Array.from({ length: sides[1] }, () => prefix + n++),
      ];
    }),
  }));
  const seatCount = built.reduce((total, deck) => total + deck.rows.flat().filter(Boolean).length, 0);
  if (seatCount > MAX_SEATS) throw new Error(`A coach can have at most ${MAX_SEATS} seats`);
  return { layout: { kind, decks: built }, seatCount };
}
