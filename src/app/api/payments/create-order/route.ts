import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPaymentProvider } from '@/lib/payments';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEFAULT_PRICING } from '@/config/product';

const createOrderSchema = z.object({
  quantity: z.number().int().min(1).max(5).default(1),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  addressLine1: z.string().min(3, 'Address line 1 is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(5, 'Valid postal code is required'),
  country: z.string().default('India'),
  gstNumber: z.string().optional(),
  marketingConsent: z.boolean().default(false),
  userId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = createOrderSchema.parse(body);
    const supabase = createAdminClient();

    // 1. Fetch current price settings or use defaults
    let unitPricePaise = DEFAULT_PRICING.pricePaise ?? 4999900;
    let depositUnitPaise = DEFAULT_PRICING.depositPaise ?? 499900;
    let preordersOpen = DEFAULT_PRICING.preordersOpen;

    const { data: settingsData } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['product_price_paise', 'deposit_paise', 'preorders_open', 'quantity_cap']);

    if (settingsData) {
      for (const row of settingsData) {
        if (row.key === 'product_price_paise' && typeof row.value === 'number') {
          unitPricePaise = row.value;
        } else if (row.key === 'deposit_paise' && typeof row.value === 'number') {
          depositUnitPaise = row.value;
        } else if (row.key === 'preorders_open' && row.value === false) {
          return NextResponse.json(
            { error: 'Pre-orders are currently closed.' },
            { status: 400 }
          );
        } else if (row.key === 'quantity_cap' && typeof row.value === 'number') {
          if (validated.quantity > row.value) {
            return NextResponse.json(
              { error: `Maximum ${row.value} units allowed per order.` },
              { status: 400 }
            );
          }
        }
      }
    }

    const totalDepositPaise = depositUnitPaise * validated.quantity;
    const totalOrderPaise = unitPricePaise * validated.quantity;

    // 2. Resolve or upsert user profile
    const cleanEmail = validated.email.toLowerCase().trim();
    let userId = validated.userId;

    if (!userId) {

      // Find existing profile by email
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existingProfile) {
        userId = existingProfile.id;
        // Update contact details & consent if granted
        await supabase
          .from('profiles')
          .update({
            full_name: validated.fullName,
            phone: validated.phone,
            marketing_consent: validated.marketingConsent,
            marketing_consent_at: validated.marketingConsent
              ? new Date().toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      } else {
        // Create user in auth.users first to satisfy foreign key constraint
        const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
          email: cleanEmail,
          email_confirm: true,
          user_metadata: {
            full_name: validated.fullName,
            phone: validated.phone,
          },
        });

        if (authUser?.user) {
          userId = authUser.user.id;
          // Ensure profile record is populated with contact details
          await supabase.from('profiles').upsert({
            id: userId,
            email: cleanEmail,
            full_name: validated.fullName,
            phone: validated.phone,
            role: 'customer',
            marketing_consent: validated.marketingConsent,
            marketing_consent_at: validated.marketingConsent
              ? new Date().toISOString()
              : null,
            consent_text_version: 'v1.0-2026-10',
            signup_source: { channel: 'preorder_checkout' },
            updated_at: new Date().toISOString(),
          });
        } else {
          // If user already existed in auth.users, fetch by listing users
          const { data: usersList } = await supabase.auth.admin.listUsers();
          const match = usersList?.users?.find(
            (u) => u.email?.toLowerCase().trim() === cleanEmail
          );

          if (match) {
            userId = match.id;
            await supabase.from('profiles').upsert({
              id: userId,
              email: cleanEmail,
              full_name: validated.fullName,
              phone: validated.phone,
              marketing_consent: validated.marketingConsent,
              updated_at: new Date().toISOString(),
            });
          } else {
            throw new Error(
              authErr?.message || 'Could not provision customer account'
            );
          }
        }
      }
    }

    // 3. Create Pending Preorder record in database
    const shippingAddress = {
      email: cleanEmail,
      fullName: validated.fullName,
      phone: validated.phone,
      addressLine1: validated.addressLine1,
      addressLine2: validated.addressLine2 || '',
      city: validated.city,
      state: validated.state,
      postalCode: validated.postalCode,
      country: validated.country,
    };

    const { data: preorder, error: preorderError } = await supabase
      .from('preorders')
      .insert({
        user_id: userId,
        quantity: validated.quantity,
        unit_price_paise: unitPricePaise,
        deposit_paise: totalDepositPaise,
        total_paise: totalOrderPaise,
        currency: 'INR',
        payment_status: 'created',
        order_status: 'pending',
        shipping_address: shippingAddress,
        gst_number: validated.gstNumber || null,
        terms_accepted_at: new Date().toISOString(),
        order_number: '', // Trigger will automatically generate LUMI-XXXXXX
      })
      .select('id, order_number')
      .single();

    if (preorderError || !preorder) {
      console.error('[API Create-Order] Preorder insert error:', preorderError);
      return NextResponse.json(
        { error: 'Failed to create pre-order record' },
        { status: 500 }
      );
    }

    // 4. Create Gateway Order using Payment Provider
    const provider = getPaymentProvider();
    const gatewayOrder = await provider.createOrder({
      amountPaise: totalDepositPaise,
      currency: 'INR',
      preorderId: preorder.id,
      orderNumber: preorder.order_number,
      customerEmail: validated.email,
      customerName: validated.fullName,
      customerPhone: validated.phone,
    });

    // 5. Insert payment record
    const { error: paymentError } = await supabase.from('payments').insert({
      preorder_id: preorder.id,
      gateway: process.env.PAYMENT_PROVIDER ?? 'mock',
      gateway_order_id: gatewayOrder.gatewayOrderId,
      amount_paise: totalDepositPaise,
      currency: 'INR',
      status: 'created',
      signature_verified: false,
    });

    if (paymentError) {
      console.error('[API Create-Order] Payment insert error:', paymentError);
    }

    // 6. Record tracking event
    await supabase.from('events').insert({
      user_id: userId,
      type: 'open_payment',
      metadata: {
        preorder_id: preorder.id,
        order_number: preorder.order_number,
        amount_paise: totalDepositPaise,
        quantity: validated.quantity,
      },
    });

    // 7. Get client-safe checkout config
    const clientCheckoutConfig = provider.getClientCheckoutConfig(
      gatewayOrder.gatewayOrderId,
      totalDepositPaise,
      'INR',
      preorder.order_number,
      {
        name: validated.fullName,
        email: validated.email,
        phone: validated.phone,
      }
    );

    return NextResponse.json({
      success: true,
      orderId: preorder.id,
      orderNumber: preorder.order_number,
      gatewayOrderId: gatewayOrder.gatewayOrderId,
      amountPaise: totalDepositPaise,
      currency: 'INR',
      clientConfig: clientCheckoutConfig,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid input data' },
        { status: 400 }
      );
    }
    console.error('[API Create-Order] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error while initializing order' },
      { status: 500 }
    );
  }
}
