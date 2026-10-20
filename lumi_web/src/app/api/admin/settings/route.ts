import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, requireFreshAuth, logAdminAudit, isNextRouterError } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  try {
    await requireAdmin('viewer', { isApi: true });
    const supabase = createAdminClient();

    const { data: settings, error } = await supabase
      .from('settings')
      .select('key, value, updated_at, updated_by');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const configMap: Record<string, unknown> = {};
    (settings || []).forEach((s) => {
      configMap[s.key] = s.value;
    });

    return NextResponse.json({ settings: configMap });
  } catch (err) {
    if (isNextRouterError(err)) throw err;
    console.error('[API Admin Settings GET] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

const updateSettingsSchema = z.object({
  productPricePaise: z.number().int().positive(),
  depositPaise: z.number().int().positive(),
  shippingEstimate: z.string().min(1),
  quantityCap: z.number().int().min(1).max(10),
  preordersOpen: z.boolean(),

  // Approvals & Checklist
  pricingApproved: z.boolean(),
  pricingApprovedBy: z.string().optional(),
  pricingApprovedAt: z.string().optional(),

  shippingApproved: z.boolean(),
  refundPolicyApproved: z.boolean(),
  refundPolicySummary: z.string().min(1),
  refundPolicyLink: z.string().min(1),

  warrantyApproved: z.boolean(),
  warrantyText: z.string().min(1),

  termsPrivacyPublished: z.boolean(),
});

export async function POST(req: Request) {
  try {
    // 1. Role Check: Only 'admin' or 'owner' can modify settings (viewers rejected)
    const { adminUser } = await requireAdmin('admin', { isApi: true });

    // 2. Sensitive Action: Require 10-minute fresh authentication
    const freshAuth = await requireFreshAuth();
    if (!freshAuth.fresh) {
      return NextResponse.json(
        {
          error: 'Fresh authentication required within the last 10 minutes to modify settings.',
          requireReauth: true,
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = updateSettingsSchema.parse(body);

    // 3. Mathematical and Rupee Validation
    if (validated.productPricePaise % 100 !== 0) {
      return NextResponse.json(
        { error: 'Product price must be a whole rupee amount.' },
        { status: 400 }
      );
    }

    if (validated.depositPaise % 100 !== 0) {
      return NextResponse.json(
        { error: 'Deposit amount must be a whole rupee amount.' },
        { status: 400 }
      );
    }

    if (validated.depositPaise > validated.productPricePaise) {
      return NextResponse.json(
        { error: 'Deposit cannot exceed the full product price.' },
        { status: 400 }
      );
    }

    // 4. Server-Side Enforcement: Pre-orders switch requires all 5 checklist approvals
    if (validated.preordersOpen) {
      const allApproved =
        validated.pricingApproved &&
        validated.shippingApproved &&
        validated.refundPolicyApproved &&
        validated.warrantyApproved &&
        validated.termsPrivacyPublished;

      if (!allApproved) {
        return NextResponse.json(
          {
            error:
              'Cannot enable pre-orders: all 5 requirement items (pricing, shipping, refund policy, warranty, and terms/privacy) must be approved before launch.',
          },
          { status: 400 }
        );
      }
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // Fetch before values for audit trail
    const { data: existingRows } = await supabase.from('settings').select('key, value');
    const beforeMap: Record<string, unknown> = {};
    (existingRows || []).forEach((r) => {
      beforeMap[r.key] = r.value;
    });

    const updates = [
      { key: 'product_price_paise', value: validated.productPricePaise },
      { key: 'deposit_paise', value: validated.depositPaise },
      { key: 'shipping_estimate', value: validated.shippingEstimate },
      { key: 'quantity_cap', value: validated.quantityCap },
      { key: 'preorders_open', value: validated.preordersOpen },
      {
        key: 'pricing_approval',
        value: {
          approved: validated.pricingApproved,
          by: validated.pricingApproved ? adminUser.email : null,
          at: validated.pricingApproved ? now : null,
        },
      },
      {
        key: 'shipping_approval',
        value: { approved: validated.shippingApproved, at: now },
      },
      {
        key: 'refund_policy_approval',
        value: {
          approved: validated.refundPolicyApproved,
          summary: validated.refundPolicySummary,
          link: validated.refundPolicyLink,
          at: now,
        },
      },
      {
        key: 'warranty_approval',
        value: {
          approved: validated.warrantyApproved,
          text: validated.warrantyText,
          at: now,
        },
      },
      {
        key: 'terms_privacy_published',
        value: { published: validated.termsPrivacyPublished, at: now },
      },
    ];

    for (const item of updates) {
      await supabase.from('settings').upsert({
        key: item.key,
        value: item.value as unknown as string,
        updated_at: now,
        updated_by: adminUser.user_id,
      });
    }

    // 5. Immutable Audit Log Diff
    await logAdminAudit({
      action: 'admin_updated_settings',
      entity: 'settings',
      actor: adminUser.email,
      before_value: beforeMap,
      after_value: validated,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (isNextRouterError(err)) throw err;
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    }
    console.error('[API Admin Settings POST] Error:', err);
    return NextResponse.json({ error: 'Failed to update store settings' }, { status: 500 });
  }
}
