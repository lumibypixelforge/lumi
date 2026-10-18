import { requireAdmin } from '@/lib/admin/auth';
import { SettingsClientPage } from '@/components/admin/settings-client';

export default async function AdminSettingsPage() {
  // Layer 2 Server Gate: throws 404 for non-admins, redirects to /admin/login for unauthenticated
  await requireAdmin('viewer');

  return <SettingsClientPage />;
}
