import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const eventSchema = z.object({
  type: z.string().min(1),
  userId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = eventSchema.parse(body);

    const supabase = createAdminClient();
    await supabase.from('events').insert({
      type: validated.type,
      user_id: validated.userId || null,
      metadata: (validated.metadata || {}) as Record<string, string | number | boolean | null>,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
