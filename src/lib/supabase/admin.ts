import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const defaultUrl = 'https://lbgtrppdeydbhqolahcr.supabase.co';
const defaultServiceKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiZ3RycHBkZXlkYmhxb2xhaGNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTk3NDkwMCwiZXhwIjoyMTA3NTUwOTAwfQ.or_owRE4CSg-OtyO02etIvNmM1sGBWYAY4RN3k3K5PU';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    defaultServiceKey;

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
