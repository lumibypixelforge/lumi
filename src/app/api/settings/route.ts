import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEFAULT_PRICING } from '@/config/product';

// Public endpoint to read store settings (pricing approval, preorders open, deposit, price)
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: settings, error } = await supabase
      .from('settings')
      .select('key, value');

    if (error || !settings) {
      return NextResponse.json({
        preordersOpen: DEFAULT_PRICING.preordersOpen,
        pricingApproved: Boolean(DEFAULT_PRICING.pricingConfirmed),
        depositPaise: DEFAULT_PRICING.depositPaise,
        productPricePaise: DEFAULT_PRICING.pricePaise,
        shippingEstimate: DEFAULT_PRICING.shippingEstimate,
      }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      });
    }

    const configMap: Record<string, unknown> = {};
    settings.forEach((s) => {
      configMap[s.key] = s.value;
    });

    const pricingApproved = Boolean(configMap['pricingApproved']);
    const preordersOpen = Boolean(configMap['preordersOpen']);
    const depositPaise = typeof configMap['depositPaise'] === 'number'
      ? configMap['depositPaise']
      : DEFAULT_PRICING.depositPaise;
    const productPricePaise = typeof configMap['productPricePaise'] === 'number'
      ? configMap['productPricePaise']
      : DEFAULT_PRICING.pricePaise;
    const shippingEstimate = typeof configMap['shippingEstimate'] === 'string'
      ? configMap['shippingEstimate']
      : DEFAULT_PRICING.shippingEstimate;

    return NextResponse.json({
      preordersOpen,
      pricingApproved,
      depositPaise,
      productPricePaise,
      shippingEstimate,
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  } catch (err) {
    console.error('[API Public Settings] Error:', err);
    return NextResponse.json({
      preordersOpen: DEFAULT_PRICING.preordersOpen,
      pricingApproved: Boolean(DEFAULT_PRICING.pricingConfirmed),
      depositPaise: DEFAULT_PRICING.depositPaise,
      productPricePaise: DEFAULT_PRICING.pricePaise,
      shippingEstimate: DEFAULT_PRICING.shippingEstimate,
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
  }
}
