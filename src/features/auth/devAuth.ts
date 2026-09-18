/**
 * Development-only sign-in helper.
 *
 * Lets us test the signed-in cloud sync path locally without typing
 * credentials. Never runs in a production build.
 */

import { supabase } from '@/integrations/supabase/client';

export const isDevAuthEnabled = import.meta.env.DEV;

export const DEV_CREDENTIALS = {
  email: 'jankimdst@gmail.com',
  password: 'jankimdst@gmail.com',
};

export async function devQuickLogin(): Promise<{ error: Error | null }> {
  if (!isDevAuthEnabled) {
    return { error: new Error('Dev login is only available in development') };
  }

  const { error } = await supabase.auth.signInWithPassword(DEV_CREDENTIALS);
  return { error: (error as Error) ?? null };
}
