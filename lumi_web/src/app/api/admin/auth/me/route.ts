import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';

export async function GET(req: Request) {
  try {
    const { user, adminUser } = await requireAdmin('viewer', { isApi: true });

    const rawEnv =
      process.env.APP_ENV ||
      process.env.VERCEL_ENV ||
      (process.env.NODE_ENV === 'production' ? 'production' : 'development');

    const envName =
      rawEnv.toLowerCase() === 'production'
        ? 'Production'
        : rawEnv.toLowerCase() === 'staging'
        ? 'Staging'
        : 'Development';

    const testPayments =
      process.env.PAYMENT_PROVIDER === 'mock' ||
      Boolean(process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_'));

    return NextResponse.json({
      user: {
        id: user.id,
        email: adminUser.email,
        role: adminUser.role,
      },
      env: envName,
      testPayments,
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 404 });
  }
}
