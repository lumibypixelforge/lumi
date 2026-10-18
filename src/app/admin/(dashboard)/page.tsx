import { Suspense } from 'react';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/config/product';
import { OverviewClientDashboard } from '@/components/admin/overview-dashboard';

export default async function AdminOverviewPage() {
  // 1. Server-side authorization check (redirects to /admin/login or throws 404 for non-admins)
  await requireAdmin('viewer');

  const supabase = createAdminClient();

  // 2. Fetch Profiles (Registered Users)
  const { data: profiles, count: totalProfilesCount } = await supabase
    .from('profiles')
    .select('id, created_at, phone, full_name, email', { count: 'exact' });

  // 3. Fetch Preorders
  const { data: preorders } = await supabase
    .from('preorders')
    .select(`
      id,
      order_number,
      deposit_paise,
      total_paise,
      payment_status,
      order_status,
      quantity,
      created_at,
      user_id,
      shipping_address,
      profiles (
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false });

  // 4. Fetch Payments
  const { data: payments } = await supabase
    .from('payments')
    .select('id, status, amount_paise, created_at, preorder_id')
    .order('created_at', { ascending: false });

  // 5. Fetch Customer Segments
  const { data: segmentRows } = await supabase
    .from('customer_segments')
    .select('id, segment');

  // Compute Segment Counts
  const segmentCounts = {
    confirmed_buyer: 0,
    interested: 0,
    prospect: 0,
  };

  (segmentRows || []).forEach((row) => {
    const s = row.segment as keyof typeof segmentCounts;
    if (segmentCounts[s] !== undefined) {
      segmentCounts[s]++;
    }
  });

  const totalRegistered = totalProfilesCount || profiles?.length || 0;
  const confirmedBuyers = segmentCounts.confirmed_buyer;

  // Verified deposits collected only
  const paidOrders = (preorders || []).filter((o) => o.payment_status === 'paid');
  const totalDepositCollected = paidOrders.reduce(
    (sum, o) => sum + Number(o.deposit_paise || 0),
    0
  );

  const conversionRate =
    totalRegistered > 0
      ? ((confirmedBuyers / totalRegistered) * 100).toFixed(1)
      : '0.0';

  // Attention Items
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const failedPayments7d = (payments || []).filter(
    (p) => p.status === 'failed' && new Date(p.created_at).getTime() >= sevenDaysAgo
  );

  const pendingPaymentsOver24h = (payments || []).filter(
    (p) =>
      p.status === 'created' &&
      new Date(p.created_at).getTime() < oneDayAgo
  );

  const paidAwaitingUpdate = (preorders || []).filter(
    (o) => o.payment_status === 'paid' && o.order_status === 'confirmed'
  );

  const signupsWithoutPhone = (profiles || []).filter((p) => !p.phone);

  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted">Loading overview metrics...</div>}>
      <OverviewClientDashboard
        metrics={{
          totalRegistered,
          confirmedBuyers,
          totalDepositCollected,
          conversionRate,
          totalOrders: preorders?.length || 0,
        }}
        segments={segmentCounts}
        recentPreorders={preorders?.slice(0, 5) || []}
        attentionItems={{
          failedPayments7d: failedPayments7d.length,
          pendingPaymentsOver24h: pendingPaymentsOver24h.length,
          paidAwaitingUpdate: paidAwaitingUpdate.length,
          signupsWithoutPhone: signupsWithoutPhone.length,
        }}
        profiles={profiles || []}
        preorders={preorders || []}
      />
    </Suspense>
  );
}
