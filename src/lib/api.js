import { supabaseBrowser } from './supabaseBrowser.js';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const client = supabaseBrowser();
    const { data } = client ? await client.auth.getSession() : { data: {} };
    if (data?.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  let response;
  try {
    response = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'Cannot reach Bookify. Check your connection and try again.');
  }
  let payload = null;
  try { payload = await response.json(); } catch { /* empty body */ }
  if (!response.ok) throw new ApiError(response.status, payload?.error || 'The request failed. Please try again.');
  return payload;
}
