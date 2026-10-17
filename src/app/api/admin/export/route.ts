import { NextResponse } from 'next/server';
import { requireAdmin, requireFreshAuth, logAdminAudit, isNextRouterError } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  try {
    // 1. Authorization: Only 'owner' or 'admin' can export (viewers denied)
    const { adminUser } = await requireAdmin('admin', { isApi: true });

    // 2. Fresh authentication check (password + TOTP within 10 minutes)
    const freshAuth = await requireFreshAuth();
    if (!freshAuth.fresh) {
      return NextResponse.json(
        {
          error: 'Fresh authentication required within the last 10 minutes to export data.',
          requireReauth: true,
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const consentedOnly = searchParams.get('consented') === 'true';

    const supabase = createAdminClient();

    // Fetch preorders with profile details
    let query = supabase
      .from('preorders')
      .select(`
        order_number,
        quantity,
        deposit_paise,
        total_paise,
        currency,
        payment_status,
        order_status,
        created_at,
        shipping_address,
        profiles (
          full_name,
          email,
          phone,
          marketing_consent
        )
      `)
      .order('created_at', { ascending: false });

    const { data: orders, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter consented only if specified
    const filteredOrders = (orders || []).filter((o) => {
      if (!consentedOnly) return true;
      const profile = o.profiles as { marketing_consent?: boolean } | null;
      return profile?.marketing_consent === true;
    });

    // Generate CSV string
    const headers = [
      'Order Number',
      'Created At',
      'Customer Name',
      'Email',
      'Phone',
      'Quantity',
      'Deposit INR',
      'Total INR',
      'Payment Status',
      'Order Status',
      'City',
      'State',
      'PIN Code',
      'Marketing Consent',
    ];

    const escapeCSV = (val: unknown) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredOrders.map((o) => {
      const addr = (o.shipping_address as Record<string, string>) || {};
      const profile = o.profiles as {
        full_name?: string;
        email?: string;
        phone?: string;
        marketing_consent?: boolean;
      } | null;

      return [
        escapeCSV(o.order_number),
        escapeCSV(o.created_at),
        escapeCSV(addr.fullName || profile?.full_name || ''),
        escapeCSV(profile?.email || ''),
        escapeCSV(addr.phone || profile?.phone || ''),
        escapeCSV(o.quantity),
        escapeCSV((Number(o.deposit_paise) / 100).toFixed(2)),
        escapeCSV((Number(o.total_paise) / 100).toFixed(2)),
        escapeCSV(o.payment_status),
        escapeCSV(o.order_status),
        escapeCSV(addr.city || ''),
        escapeCSV(addr.state || ''),
        escapeCSV(addr.postalCode || ''),
        escapeCSV(profile?.marketing_consent ? 'YES' : 'NO'),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    // 3. Immutable audit logging of the export event
    await logAdminAudit({
      action: 'admin_exported_csv',
      entity: 'preorders',
      actor: adminUser.email,
      after_value: {
        exportedRows: rows.length,
        consentedOnly,
        timestamp: new Date().toISOString(),
      },
    });

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="lumi_preorders_${
          new Date().toISOString().split('T')[0]
        }.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    if (isNextRouterError(err)) throw err;
    console.error('[API Admin Export CSV] Error:', err);
    return NextResponse.json({ error: 'Failed to export CSV' }, { status: 500 });
  }
}
