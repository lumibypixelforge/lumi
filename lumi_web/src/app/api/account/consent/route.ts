import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const consentSchema = z.object({
  email: z.string().email(),
  consent: z.boolean(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = consentSchema.parse(body);
    const supabase = createAdminClient();

    await supabase
      .from('profiles')
      .update({
        marketing_consent: validated.consent,
        marketing_consent_at: validated.consent ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('email', validated.email.toLowerCase().trim());

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API Consent] Error:', err);
    return NextResponse.json({ error: 'Failed to update consent' }, { status: 400 });
  }
}
