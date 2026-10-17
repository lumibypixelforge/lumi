import { requireAdmin } from '@/lib/admin/auth';
import { AuditClientPage } from '@/components/admin/audit-client';

export default async function AdminAuditPage() {
  // Layer 2 Server Gate: throws 404 for non-admins, redirects to /admin/login for unauthenticated
  await requireAdmin('viewer');

  return <AuditClientPage />;
}
