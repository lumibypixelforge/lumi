import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './database.types';

const defaultUrl = 'https://lbgtrppdeydbhqolahcr.supabase.co';
const defaultAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiZ3RycHBkZXlkYmhxb2xhaGNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NzQ5MDAsImV4cCI6MjEwNzU1MDkwMH0.esujhKNKWN-3z1Bsz3oCslSXPtayXe7mIM4OvtDDMdA';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
