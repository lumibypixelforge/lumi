import { requireAdmin } from '@/lib/admin/auth';
import { CustomersClientPage } from '@/components/admin/customers-client';

export default async function AdminCustomersPage() {
  // Layer 2 Server Gate: throws 404 for non-admins, redirects to /admin/login for unauthenticated
  await requireAdmin('viewer');

  return <CustomersClientPage />;
}
