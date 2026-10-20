import Link from 'next/link';

export const metadata = {
  title: 'Terms of Pre-Order',
  description: 'Terms and conditions for placing a pre-order reservation for LUMI.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen pt-32 pb-24 bg-canvas">
      <div className="container-md max-w-3xl">
        <div className="mb-10">
          <span className="font-mono text-xs text-accent font-semibold uppercase tracking-wider">
            Legal & Policies
          </span>
          <h1 className="text-3xl font-bold text-ink mt-2 mb-4">
            Terms of Pre-Order
          </h1>
          <p className="text-xs font-mono text-muted">
            Last Updated: October 14, 2026 • Version 1.0
          </p>
        </div>

        <div className="prose prose-sm text-ink/80 space-y-6 text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-ink">1. Nature of the Reservation</h2>
            <p>
              Placing a pre-order reservation for the LUMI Telepresence Robot constitutes an advance reservation for priority production allocation in Batch 01. The pre-order deposit of ₹4,999 per unit is held securely and secures your queue position.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-ink">2. 100% Refundable Deposit</h2>
            <p>
              Your deposit is 100% refundable at any point prior to physical dispatch from our manufacturing facility. If you choose to cancel your reservation for any reason, the entire deposit amount will be returned to your original payment method within 5-7 business days. Refer to our{' '}
              <Link href="/refund-policy" className="text-accent underline">
                Refund Policy
              </Link>{' '}
              for full details.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-ink">3. Final Pricing and Balance Payment</h2>
            <p>
              The estimated final retail price of LUMI is ₹49,999 (inclusive of standard GST). The balance of ₹45,000 per unit will become payable upon notification that your robot is assembled, calibrated, and ready for dispatch.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-ink">4. Delivery Timelines</h2>
            <p>
              Batch 01 shipments are targeted for Q3 2026. While we strive to meet all projected timelines, production schedules can be subject to supply chain, regulatory certification, or quality assurance requirements. We commit to transparent communication and regular milestone updates.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-ink">5. Customer Inquiries & Support</h2>
            <p>
              For any inquiries regarding your reservation status, address changes, or cancellations, please contact us at{' '}
              <a href="mailto:support@lumi.robot" className="text-accent underline font-mono">
                support@lumi.robot
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
