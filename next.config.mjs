import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the project root so a package-lock.json in a parent folder is not picked up.
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },
  env: {
    // The public Supabase URL may be configured as SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
    NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '',
  },
};
export default nextConfig;
