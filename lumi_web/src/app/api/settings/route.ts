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

    const pricingApproved = Boolean(
      configMap['pricingApproved'] ??
      (typeof configMap['pricing_approval'] === 'object' && configMap['pricing_approval'] !== null
        ? (configMap['pricing_approval'] as { approved?: boolean }).approved
        : configMap['pricing_approval'])
    );
    const preordersOpen = Boolean(
      configMap['preordersOpen'] ?? configMap['preorders_open'] ?? DEFAULT_PRICING.preordersOpen
    );
    const depositPaise = typeof configMap['depositPaise'] === 'number'
      ? configMap['depositPaise']
      : typeof configMap['deposit_paise'] === 'number' && configMap['deposit_paise'] !== null
        ? (configMap['deposit_paise'] as number)
        : DEFAULT_PRICING.depositPaise;
    const productPricePaise = typeof configMap['productPricePaise'] === 'number'
      ? configMap['productPricePaise']
      : typeof configMap['product_price_paise'] === 'number' && configMap['product_price_paise'] !== null
        ? (configMap['product_price_paise'] as number)
        : DEFAULT_PRICING.pricePaise;
    const shippingEstimate = typeof configMap['shippingEstimate'] === 'string'
      ? configMap['shippingEstimate']
      : typeof configMap['shipping_estimate'] === 'string' && configMap['shipping_estimate'] !== null && configMap['shipping_estimate'] !== 'TBA'
        ? (configMap['shipping_estimate'] as string)
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
