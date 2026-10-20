export const metadata = {
  title: 'Refund & Cancellation Policy',
  description: '100% refundable pre-order deposit policy for LUMI.',
};

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen pt-32 pb-24 bg-canvas">
      <div className="container-md max-w-3xl">
        <div className="mb-10">
          <span className="font-mono text-xs text-accent font-semibold uppercase tracking-wider">
            Consumer Protection
          </span>
          <h1 className="text-3xl font-bold text-ink mt-2 mb-4">
            Refund & Cancellation Policy
          </h1>
          <p className="text-xs font-mono text-muted">
            Last Updated: October 14, 2026 • Version 1.0
          </p>
        </div>

        <div className="bg-positive/5 border border-positive/30 rounded-lg p-5 mb-8 text-xs text-ink/80">
          <strong className="text-positive font-semibold block mb-1">
            Zero-Risk Guarantee
          </strong>
          Every pre-order reservation deposit (₹4,999) is strictly 100% refundable with zero cancellation fees prior to unit dispatch.
        </div>

        <div className="prose prose-sm text-ink/80 space-y-6 text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-ink">1. Pre-Dispatch Cancellation</h2>
            <p>
              You may cancel your pre-order reservation at any time prior to the robot being handed over to our courier partner. No explanation is required. You can request cancellation directly from your Account dashboard or by writing to support@lumi.robot.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-ink">2. Refund Processing Timeline</h2>
            <p>
              Once a refund is initiated, the entire deposit amount will be credited back to your original payment method (UPI, Debit/Credit Card, or Netbanking) within 5 to 7 business days, per standard banking turnaround times.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-ink">3. Post-Delivery 14-Day Return Window</h2>
            <p>
              Upon receiving your LUMI, you are covered by our 14-day return window. If you are not satisfied with your unit, you can return it in its original packaging with all included accessories for a full refund minus standard return courier costs.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-ink">4. Damaged or Defective Hardware</h2>
            <p>
              If your unit arrives with transit damage or hardware defects, our support team will dispatch a replacement unit via express courier free of charge under our 1-year comprehensive warranty.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
