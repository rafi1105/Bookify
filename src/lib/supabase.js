/**
 * Bookify: Supabase Client & Realtime Seat Subscription Helper
 * Compatible with Supabase Free Tier
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Acquire an atomic 10-minute seat lock via Supabase RPC
 * @param {string} tripId
 * @param {string[]} seatNumbers
 * @param {string} userId
 * @param {number} ttlSeconds
 */
export async function acquireSeatLock(tripId, seatNumbers, userId, ttlSeconds = 600) {
  const { data, error } = await supabase.rpc('acquire_seat_lock', {
    p_trip_id: tripId,
    p_seat_numbers: seatNumbers,
    p_user_id: userId,
    p_ttl_seconds: ttlSeconds,
  });

  if (error) {
    console.error('Seat lock RPC error:', error);
    return { success: false, error: error.message };
  }

  return data;
}

/**
 * Release seat lock
 * @param {string} tripId
 * @param {string[]} seatNumbers
 * @param {string} lockToken
 */
export async function releaseSeatLock(tripId, seatNumbers, lockToken) {
  const { data, error } = await supabase.rpc('release_seat_lock', {
    p_trip_id: tripId,
    p_seat_numbers: seatNumbers,
    p_lock_token: lockToken,
  });

  if (error) {
    console.error('Release lock error:', error);
    return { success: false, error: error.message };
  }

  return data;
}

/**
 * Subscribe to real-time seat lock changes on a specific trip
 * Broadcasts sub-100ms updates to all viewing clients
 * @param {string} tripId
 * @param {Function} onLockChange
 */
export function subscribeToTripSeats(tripId, onLockChange) {
  const channel = supabase
    .channel(`trip-seats-${tripId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'seat_locks',
        filter: `trip_id=eq.${tripId}`,
      },
      (payload) => {
        onLockChange(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

