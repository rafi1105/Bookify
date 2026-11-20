export async function api(path, body, method = body === undefined ? 'GET' : 'POST') {
  const response = await fetch('/api' + path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result === null) throw new Error(result?.error || 'Bookify API is unavailable');
  return result;
}

export function money(minor) {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(minor / 100);
}

export function dhakaTime(value) {
  return new Intl.DateTimeFormat('en-BD', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka',
  }).format(new Date(value));
}
