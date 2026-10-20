export const metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for LUMI telepresence robot customer and website data.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen pt-32 pb-24 bg-canvas">
      <div className="container-md max-w-3xl">
        <div className="mb-10">
          <span className="font-mono text-xs text-accent font-semibold uppercase tracking-wider">
            Data Governance
          </span>
          <h1 className="text-3xl font-bold text-ink mt-2 mb-4">
            Privacy Policy
          </h1>
          <p className="text-xs font-mono text-muted">
            Last Updated: October 14, 2026 • Compliant with DPDP Act 2023 & IT Act
          </p>
        </div>

        <div className="prose prose-sm text-ink/80 space-y-6 text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-ink">1. Information We Collect</h2>
            <p>
              When you place a pre-order or interact with our platform, we collect your name, email address, phone number, and physical shipping address solely for the purpose of order processing, fulfillment, and communications regarding your robot reservation.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-ink">2. Telepresence Privacy & Encrypted Streams</h2>
            <p>
              LUMI is built with privacy-first engineering. Video and audio streams between your mobile controller app and your LUMI robot utilize peer-to-peer WebRTC connections with end-to-end encryption. No audio or video streams are ever stored on cloud servers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-ink">3. Payment Information</h2>
            <p>
              We do not store your credit card numbers, CVVs, or banking PINs on our servers. All financial transactions are processed directly through PCI-DSS Level 1 compliant payment gateways (such as Razorpay).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-ink">4. Marketing Consent & Your Rights</h2>
            <p>
              We only send marketing and engineering update communications if you explicitly grant consent during checkout. You can withdraw your consent at any time from your account settings or by clicking the unsubscribe link in any email.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-ink">5. Grievance Officer</h2>
            <p>
              Under the Digital Personal Data Protection Act, you may contact our designated Grievance Officer regarding any data inquiry at{' '}
              <a href="mailto:privacy@lumi.robot" className="text-accent underline font-mono">
                privacy@lumi.robot
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
