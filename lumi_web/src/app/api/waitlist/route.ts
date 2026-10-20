import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, marketingConsent } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if profile exists by email
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    let profileId = existing?.id;

    if (!profileId) {
      // Create guest profile for prospect
      const newId = crypto.randomUUID();
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: newId,
          full_name: name?.trim() || null,
          email: email.trim().toLowerCase(),
          phone: phone?.trim() || null,
          role: 'customer',
          marketing_consent: Boolean(marketingConsent),
          marketing_consent_at: marketingConsent ? new Date().toISOString() : null,
          consent_text_version: 'v1.0',
        })
        .select('id')
        .single();

      if (!insertError && newProfile) {
        profileId = newProfile.id;
      }
    } else {
      // Update existing
      await supabase
        .from('profiles')
        .update({
          full_name: name?.trim() || undefined,
          phone: phone?.trim() || undefined,
          marketing_consent: Boolean(marketingConsent),
          marketing_consent_at: marketingConsent ? new Date().toISOString() : undefined,
        })
        .eq('id', profileId);
    }

    // Log engagement event
    try {
      await supabase.from('events').insert({
        user_id: profileId || null,
        type: 'waitlist_signup',
        metadata: {
          email: email.trim().toLowerCase(),
          source: 'chapter_09_order_form',
          marketingConsent: Boolean(marketingConsent),
        },
      });
    } catch {
      // Non-fatal if events table logging fails
    }

    return NextResponse.json({
      success: true,
      message: 'You have been added to the LUMI waitlist.',
    });
  } catch (err: unknown) {
    console.error('[API Waitlist] Error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
