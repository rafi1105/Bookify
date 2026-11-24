export const PHONE_RE = /^(\+?88)?01[3-9]\d{8}$/;
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normalizePhone(value) {
  const digits = String(value || '').replace(/[\s-]/g, '');
  if (!PHONE_RE.test(digits)) return null;
  return '0' + digits.slice(-10);
}
