import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

// Embedded Postgres with the minimum of Supabase (auth schema, roles) stubbed, so the real
// migration files can be executed unchanged. This is test infrastructure, not app data.
// legacy: 'full' = old 23-table schema first, 'none' = empty database, 'partial' = old schema with some tables missing.
export const LIVE_MAP = '20261125120000_bookify_live_map.sql';

export async function freshDatabase(legacy = 'full') {
  const db = new PGlite();
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text,
      raw_user_meta_data jsonb not null default '{}',
      instance_id uuid, aud text, role text, encrypted_password text, email_confirmed_at timestamptz,
      raw_app_meta_data jsonb, created_at timestamptz, updated_at timestamptz,
      confirmation_token text, recovery_token text, email_change_token_new text, email_change text);
    create table auth.identities (id uuid primary key default gen_random_uuid(), provider_id text not null,
      user_id uuid not null references auth.users(id) on delete cascade, identity_data jsonb not null, provider text not null,
      last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz);
    -- pgcrypto is not bundled with the embedded engine
    create function public.gen_salt(text) returns text language sql as $$ select 'salt' $$;
    create function public.crypt(text, text) returns text language sql as $$ select 'hash:' || $1 $$;
    create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
    create role anon; create role authenticated; create role service_role bypassrls;
    create publication supabase_realtime;
  `);
  const files = legacy === 'none' ? ['20261124120000_bookify_v2_production.sql', LIVE_MAP] : ['20261016_init_bookify_schema.sql', '20261124120000_bookify_v2_production.sql', LIVE_MAP];
  for (const file of files) {
    // uuid-ossp and pgcrypto are not bundled with the embedded engine; gen_random_uuid() is built in.
    const sql = readFileSync(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8')
      .replace(/create extension if not exists [^;]*;/gi, '');
    await db.exec(sql);
    if (legacy === 'partial' && file.startsWith('20261016')) {
      await db.exec('drop table public.ai_logs, public.ai_recommendations, public.demand_forecasts, public.wallet_transactions, public.wallet, public.drivers, public.seat_locks cascade;');
    }
  }
  return db;
}
