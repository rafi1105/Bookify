const TZ = 'Asia/Dhaka';

export function formatBDT(amount) {
  const n = Number(amount || 0);
  return '৳' + n.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDate(iso, opts = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Date(iso).toLocaleDateString('en-GB', { timeZone: TZ, ...opts });
}

export function formatDateTime(iso) {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
}

// Today in Dhaka as YYYY-MM-DD
export function dhakaToday(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}

export const COACH_LABEL = {
  NON_AC: 'Non-AC', AC_ECONOMY: 'AC', SLEEPER_AC: 'Sleeper', AC_BUSINESS: 'AC Business', DOUBLE_DECKER: 'Double Decker',
};
export const COACH_OPTIONS = [['NON_AC', 'Non-AC'], ['AC_ECONOMY', 'AC'], ['SLEEPER_AC', 'Sleeper']];

export function dhakaHour(iso) {
  return Number(new Date(iso).toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false })) % 24;
}

// YYYY-MM-DD plus n days (pure calendar arithmetic, no timezone involved)
export function addDays(day, n) {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
