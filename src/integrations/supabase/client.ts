import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Read env defensively. `process.env` is statically replaced by Next.js at
// build time for NEXT_PUBLIC_* vars, but we guard against `process` being
// undefined in odd runtimes (older browsers, workers) so this module never
// throws at import time and white-screens the whole app.
const env: Record<string, string | undefined> =
  (typeof process !== 'undefined' && process.env) ? (process.env as any) : {};

const SUPABASE_URL =
  env.NEXT_PUBLIC_SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? '';
const SUPABASE_PUBLISHABLE_KEY =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  // Loud warning instead of a thrown error so the app can still render a
  // recovery UI rather than a blank white screen.
  // eslint-disable-next-line no-console
  console.error(
    '[supabase/client] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
    'Check .env and next.config.mjs env bridge.'
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(
  SUPABASE_URL || 'http://localhost:54321',
  SUPABASE_PUBLISHABLE_KEY || 'missing-key',
  {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
  }
);