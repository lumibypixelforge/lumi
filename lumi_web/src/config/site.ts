/**
 * Site-wide configuration.
 * Values that change between environments use process.env with defaults.
 */

export const siteConfig = {
  name: 'LUMI',
  title: 'LUMI | Stay Close, From Anywhere',
  description:
    'LUMI is a compact telepresence robot you drive from your phone, with live video, two-way voice and an expressive animated face.',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  ogImage: '/og.png',

  // Contact
  contact: {
    email: 'hello@lumi.example.com',
    phone: null as string | null,
    whatsapp: null as string | null,
  },

  // Social links
  social: {
    twitter: null as string | null,
    instagram: null as string | null,
    youtube: null as string | null,
    linkedin: null as string | null,
  },

  // Legal
  legal: {
    companyName: 'LUMI Technologies Pvt. Ltd.',
    gstNumber: null as string | null,
  },

  // Analytics (loaded only after consent)
  analytics: {
    ga4Id: process.env.NEXT_PUBLIC_GA4_ID ?? null,
    metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? null,
  },
} as const;
