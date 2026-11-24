import { HttpError } from './http.js';

// Optional http(s) image URL. Images are linked, never uploaded.
export function imageUrl(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const v = String(value).trim();
  let url;
  try { url = new URL(v); } catch { throw new HttpError(400, 'Enter a valid image URL starting with https://'); }
  if (!['http:', 'https:'].includes(url.protocol) || v.length > 500) throw new HttpError(400, 'Enter a valid image URL starting with https://');
  return v;
}
