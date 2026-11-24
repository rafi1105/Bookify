export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Wrap a Next.js API route: method dispatch, JSON errors, no caching.
export function route(handlers) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const fn = handlers[req.method];
      if (!fn) {
        res.setHeader('Allow', Object.keys(handlers).join(', '));
        throw new HttpError(405, 'Method not allowed');
      }
      if (req.method !== 'GET' && req.headers['sec-fetch-site'] === 'cross-site' && !handlers.allowCrossSite) {
        throw new HttpError(403, 'Cross-site requests are not allowed');
      }
      const result = await fn(req, res);
      if (!res.writableEnded) res.status(200).json(result ?? { ok: true });
    } catch (error) {
      if (res.writableEnded) return;
      if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
      console.error('Unhandled API error', error);
      res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
    }
  };
}

// Input validation helpers
export function text(value, { min = 1, max = 200, label = 'This field' } = {}) {
  const v = typeof value === 'string' ? value.trim() : '';
  if (v.length < min || v.length > max) throw new HttpError(400, `${label} must be ${min}-${max} characters`);
  return v;
}

export function uuid(value, label = 'Reference') {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(400, `${label} is invalid`);
  }
  return value;
}

export function int(value, { min, max, label = 'Value' }) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${label} must be between ${min} and ${max}`);
  return n;
}

export function money(value, { min, max, label = 'Amount' }) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `${label} must be between ${min} and ${max}`);
  return Math.round(n * 100) / 100;
}

export function isoDate(value, label = 'Date') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value + 'T00:00:00Z'))) {
    throw new HttpError(400, `${label} must be a valid date`);
  }
  return value;
}
