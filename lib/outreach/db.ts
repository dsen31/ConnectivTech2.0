import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { secret } from './security';

// Dedicated tables have no browser grants or RLS policies. Every caller must
// authenticate the owner, the worker secret, or a signed unsubscribe token.
export function outreachDb() {
  return createClient(secret('NEXT_PUBLIC_SUPABASE_URL'), secret('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export function checked<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error) throw new Error('Outreach database operation failed');
  return result.data as NonNullable<T>;
}
