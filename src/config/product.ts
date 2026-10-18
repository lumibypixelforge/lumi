/**
 * LUMI Product Configuration
 *
 * All product facts, specs and pricing are stored here.
 * Values marked as `null` are TBA (to be announced) and will display as "TBA" on the site.
 * Pricing values are in paise (1 INR = 100 paise).
 *
 * The admin can override price, deposit, shipping estimate, and quantity cap
 * from the Settings page. Those overrides live in the `settings` table and
 * take precedence over the defaults here.
 */

// ─── Known Facts (from the product brief) ────────────────────────────
// These are confirmed and may be stated as fact on the site.

export const PRODUCT_FACTS = {
  name: 'LUMI',
  tagline: 'Stay Close, From Anywhere',
  description:
    'A compact telepresence robot you drive from your phone, with live video, two-way voice and an expressive animated face.',

  // Camera and video
  camera: {
    hasLiveVideo: true,
    streaming: 'Wi-Fi',
    resolution: null as string | null, // TBA
    latency: null as string | null, // TBA
  },

  // Audio
  audio: {
    twoWay: true,
    pushToTalk: true,
    pushToTalkLock: true,
  },

  // Display and face
  display: {
    hasBuiltInDisplay: true,
    showsAnimatedFace: true,
    hasPhoneMount: false,
    moods: ['happy', 'neutral', 'sleep', 'angry', 'upset', 'sad', 'love'] as const,
  },

  // Mobility
  drive: {
    wheelCount: 2,
    poweredWheels: true,
    controlMethod: 'On-screen joystick in the app',
    speedSettings: ['0.5×', '1×', '1.5×'] as const,
    hasStopButton: true,
    hasArms: false,
    hasServos: false,
  },

  // Power
  power: {
    batteryType: '18650 rechargeable cells',
    batteryCount: 2,
    chargingPort: 'USB-C',
    batteryLife: null as string | null, // TBA
    runtimeWhileCharging: null as string | null, // TBA
  },

  // App features
  app: {
    liveView: true,
    joystickDrive: true,
    pushToTalk: true,
    pushToTalkLock: true,
    emotes: true,
    batteryIndicator: true,
    connectionIndicator: true,
  },

  // Physical specs (all TBA until client supplies)
  physical: {
    dimensions: null as string | null,
    weight: null as string | null,
    materials: null as string | null,
    colours: null as string[] | null,
  },

  // Compliance (all TBA)
  compliance: {
    certifications: null as string | null,
    warranty: null as string | null,
    range: null as string | null, // Wi-Fi range
  },
} as const;

// ─── Pre-Order Pricing & Availability ─────────────────────────────────

export const DEFAULT_PRICING = {
  /** Total price in paise: ₹49,999 */
  pricePaise: 4999900,
  /** Pre-order deposit in paise: ₹4,999 */
  depositPaise: 499900,
  /** Currency code */
  currency: 'INR',
  /** Estimated shipping window */
  shippingEstimate: 'Q3 2026',
  /** Maximum quantity per order */
  quantityCap: 3,
  /** Pre-orders active and open */
  preordersOpen: true,
  /** Production metadata */
  isDraft: false,
  draftNotice: '',
  /** Whether final pricing is marked confirmed by client */
  pricingConfirmed: true,
};

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Format a paise value as a rupee string, or return 'To be announced' if null.
 */
export function formatPrice(paise: number | null): string {
  if (paise === null) return 'To be announced';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

/**
 * Get the balance due (total minus deposit), or null if either is TBA.
 */
export function getBalancePaise(
  pricePaise?: number | null,
  depositPaise?: number | null
): number | null {
  const price = pricePaise !== undefined ? pricePaise : DEFAULT_PRICING.pricePaise;
  const deposit = depositPaise !== undefined ? depositPaise : DEFAULT_PRICING.depositPaise;
  if (price === null || deposit === null) return null;
  return price - deposit;
}

/**
 * Format a spec value, returning 'TBA' for null values.
 */
export function formatSpec(value: string | null): string {
  return value ?? 'TBA';
}
