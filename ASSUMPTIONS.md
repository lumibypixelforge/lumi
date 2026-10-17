# ASSUMPTIONS.md

Assumptions made during development. If any of these are incorrect, flag them and the relevant code will be updated.

## Stack Decisions

1. **Package manager**: Using pnpm for faster installs and stricter dependency resolution.
2. **Node version**: Targeting Node 20 LTS.
3. **Next.js version**: Using the latest Next.js (App Router) with TypeScript in strict mode.
4. **Fonts**: Using **Space Grotesk** for headlines (distinctive, geometric, premium feel) and **JetBrains Mono** for bracketed micro-labels and spec values. Both are self-hosted and preloaded.
5. **Razorpay**: Mocked with a `PaymentProvider` interface. A `MockPaymentProvider` is used during development. The real Razorpay implementation will be swapped in when a live account is available.
6. **Supabase**: Using Supabase as the database and auth provider. The project will be configured with a dedicated instance (not shared with the robot pairing backend).
7. **Bot protection**: Cloudflare Turnstile. Will be mocked in development.

## Design Decisions

1. **Corner radius**: All buttons, inputs, badges and tags use `border-radius: 6px` (within the 4-8px range specified).
2. **Accent purple**: Using `#6D4AE0` as a solid accent. No gradients anywhere.
3. **Dark chapter**: Chapter 07 (Power) uses a dark background for dramatic contrast. All other chapters use the off-white ground.
4. **3D model**: Built procedurally in code using React Three Fiber primitives. Named parts (`body`, `camera`, `screen`, `wheel_L`, `wheel_R`, `battery`, `usbc`) are defined so a real GLB can replace them later.
5. **Scroll behavior**: Using Lenis for smooth scrolling. No scroll-jacking. The user always controls scroll pace. GSAP ScrollTrigger scrubs the 3D timeline based on scroll position.

## Business Logic

1. **Currency**: All amounts are in INR (Indian Rupees), stored as integers in paise (1 INR = 100 paise).
2. **Order number format**: `LUMI-XXXXXX` where X is a zero-padded sequential number, generated server-side using a database sequence.
3. **Abandonment timeout**: Pre-orders left in `pending_payment` status for more than 24 hours are marked as `abandoned` by a scheduled check.
4. **Engagement score**: Simple rule-based score calculated from events in the last 30 days. Each event type has a weight (view_pricing: 1, click_preorder: 2, start_checkout: 3, etc.).
5. **Quantity cap**: Default 1-3 per order, configurable from admin Settings.

## Open Items (For Client)

- [ ] Product price and pre-order deposit amount
- [ ] Battery life, runtime, range, video resolution, latency specs
- [ ] Shipping dates estimate
- [ ] Certifications, warranty, materials, dimensions, available colours
- [ ] 3D model (GLB) or CAD files for export
- [ ] Brand assets: logo files, any specific font licenses
- [ ] Domain name and email sender domain
- [ ] Razorpay account credentials (Key ID and Key Secret)
- [ ] GA4 Measurement ID and Meta Pixel ID
- [ ] Legal business name and GST details
- [ ] Refund, cancellation and shipping policy final text
- [ ] Support contact details (email, phone, WhatsApp)
- [ ] Real product photography (if any)
