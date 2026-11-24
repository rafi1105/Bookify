import { createClient } from '@supabase/supabase-js';
import { HttpError } from './http.js';

let client;

// Service-role client. Server only: it bypasses RLS, so every route must authorise first.
export function db() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new HttpError(503, 'The booking database is not configured');
  client ||= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

const BK_STATUS = { BK400: 400, BK403: 403, BK404: 404, BK409: 409 };

// Unwrap a Supabase response, mapping our BKxxx database errors to HTTP statuses.
export function unwrap({ data, error }) {
  if (!error) return data;
  const status = BK_STATUS[error.code];
  if (status) throw new HttpError(status, error.message);
  if (error.code === '23505') throw new HttpError(409, 'That record already exists');
  if (error.code === '23503') throw new HttpError(400, 'A referenced record does not exist');
  if (error.code === '23514' || error.code === '22P02' || error.code === '22007') throw new HttpError(400, 'Check the values you entered');
  console.error('Database error', error.code, error.message);
  // Specific, safe hint so a schema mismatch is diagnosable from the UI (full error is in the server log).
  if (error.code === '42501') throw new HttpError(503, 'Database permission denied. Re-run the latest Bookify migration in the Supabase SQL editor and make sure SUPABASE_SERVICE_ROLE_KEY is the service_role key.');
  if (error.code === '42P01' || error.code === '42703' || error.code === '42883' || error.code === 'PGRST202' || error.code === 'PGRST204' || error.code === 'PGRST205') throw new HttpError(503, `The database schema is out of date (${error.code}). Re-run the latest Bookify migration in the Supabase SQL editor.`);
  throw new HttpError(503, `The booking database could not complete the request (${error.code || 'unknown'}: ${String(error.message).slice(0, 160)})`);
}
