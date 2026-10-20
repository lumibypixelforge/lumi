import { requireAdmin } from '@/lib/admin/auth';
import { PreordersClientPage } from '@/components/admin/preorders-client';

export default async function AdminPreordersPage() {
  // Layer 2 Server Gate: throws 404 for non-admins, redirects to /admin/login for unauthenticated
  await requireAdmin('viewer');

  return <PreordersClientPage />;
}
