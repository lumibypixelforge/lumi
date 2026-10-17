import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

const defaultUrl = 'https://lbgtrppdeydbhqolahcr.supabase.co';
const defaultAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiZ3RycHBkZXlkYmhxb2xhaGNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NzQ5MDAsImV4cCI6MjEwNzU1MDkwMH0.esujhKNKWN-3z1Bsz3oCslSXPtayXe7mIM4OvtDDMdA';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultAnonKey
  );
}
