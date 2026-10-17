import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Header } from '@/components/ui/header';
import { Footer } from '@/components/ui/footer';
import { SmoothScrollProvider } from '@/components/providers/smooth-scroll';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'LUMI | Stay Close, From Anywhere',
    template: '%s | LUMI',
  },
  description:
    'LUMI is a compact telepresence robot you drive from your phone, with live video, two-way voice and an expressive animated face.',
  keywords: ['telepresence', 'robot', 'video call', 'remote presence', 'LUMI'],
  authors: [{ name: 'LUMI' }],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'LUMI',
    title: 'LUMI | Stay Close, From Anywhere',
    description:
      'A compact telepresence robot you drive from your phone, with live video, two-way voice and an expressive animated face.',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LUMI | Stay Close, From Anywhere',
    description:
      'A compact telepresence robot you drive from your phone, with live video, two-way voice and an expressive animated face.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F7F6FB',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="h-full"
      suppressHydrationWarning
      style={{
        ['--font-space-grotesk' as string]: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        ['--font-jetbrains-mono' as string]: "'JetBrains Mono', ui-monospace, Menlo, Monaco, monospace",
        ['--font-display' as string]: 'var(--font-space-grotesk)',
        ['--font-body' as string]: 'var(--font-space-grotesk)',
        ['--font-mono' as string]: 'var(--font-jetbrains-mono)',
      }}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Preload official LUMI 3D GLB model so it streams immediately during initial HTML parse */}
        <link rel="preload" href="/models/lumi.glb" as="fetch" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <SmoothScrollProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
