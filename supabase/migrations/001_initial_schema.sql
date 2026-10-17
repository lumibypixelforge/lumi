-- LUMI Website Database Schema
-- Migration: 001_initial_schema
-- All amounts in paise (1 INR = 100 paise)
-- Every table has Row Level Security enabled

-- ═══════════════════════════════════════════════════════════════════════
-- EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════
-- TYPES
-- ═══════════════════════════════════════════════════════════════════════

CREATE TYPE user_role AS ENUM ('customer', 'admin', 'staff');
CREATE TYPE payment_status AS ENUM ('created', 'paid', 'failed', 'refunded', 'partially_refunded');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'abandoned');
CREATE TYPE follow_up_status AS ENUM ('new', 'contacted', 'interested', 'not_interested');

-- ═══════════════════════════════════════════════════════════════════════
-- SEQUENCE for human-readable order numbers
-- ═══════════════════════════════════════════════════════════════════════

CREATE SEQUENCE order_number_seq START 1;

-- ═══════════════════════════════════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_consent_at TIMESTAMPTZ,
  consent_text_version TEXT,
  signup_source JSONB DEFAULT '{}'::jsonb,  -- UTM params, gclid, fbclid
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Customers can read and update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())  -- cannot change own role
  );

-- Admins can read all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role can insert (for the trigger)
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (TRUE);

-- ═══════════════════════════════════════════════════════════════════════
-- PREORDERS
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE preorders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  unit_price_paise BIGINT NOT NULL,
  deposit_paise BIGINT NOT NULL,
  total_paise BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_status payment_status NOT NULL DEFAULT 'created',
  order_status order_status NOT NULL DEFAULT 'pending',
  shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  gst_number TEXT,
  terms_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Order can leave 'pending' only if payment_status is 'paid'
  CONSTRAINT valid_order_transition CHECK (
    order_status = 'pending'
    OR order_status = 'abandoned'
    OR order_status = 'cancelled'
    OR payment_status = 'paid'
  )
);

ALTER TABLE preorders ENABLE ROW LEVEL SECURITY;

-- Customers can view their own orders
CREATE POLICY "Users can view own preorders"
  ON preorders FOR SELECT
  USING (auth.uid() = user_id);

-- Only server/admin can insert and update preorders
CREATE POLICY "Service role can manage preorders"
  ON preorders FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Insert policy for creating orders (server action will use service role)
CREATE POLICY "Authenticated users can create preorders"
  ON preorders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- PAYMENTS
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  preorder_id UUID NOT NULL REFERENCES preorders(id) ON DELETE RESTRICT,
  gateway TEXT NOT NULL DEFAULT 'razorpay',
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  amount_paise BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created',
  method TEXT,
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Customers can view their own payment records
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM preorders
      WHERE preorders.id = payments.preorder_id
      AND preorders.user_id = auth.uid()
    )
  );

-- Admins can view and manage all payments
CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role insert
CREATE POLICY "Service can insert payments"
  ON payments FOR INSERT
  WITH CHECK (TRUE);

-- ═══════════════════════════════════════════════════════════════════════
-- WEBHOOK EVENTS (idempotent processing)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE webhook_events (
  event_id TEXT PRIMARY KEY,  -- unique from the gateway
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Only admins/service role
CREATE POLICY "Admins can view webhook events"
  ON webhook_events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service can manage webhook events"
  ON webhook_events FOR ALL
  WITH CHECK (TRUE);

-- ═══════════════════════════════════════════════════════════════════════
-- ENGAGEMENT EVENTS
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,  -- view_pricing, click_preorder, start_checkout, etc.
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all events"
  ON events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ═══════════════════════════════════════════════════════════════════════
-- ADMIN NOTES
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE admin_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notes"
  ON admin_notes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ═══════════════════════════════════════════════════════════════════════
-- FOLLOW-UPS
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status follow_up_status NOT NULL DEFAULT 'new',
  next_action_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage follow_ups"
  ON follow_ups FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ═══════════════════════════════════════════════════════════════════════
-- AUDIT LOG
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,     -- e.g. 'preorder', 'profile', 'settings'
  entity_id TEXT,           -- the ID of the affected row
  before_value JSONB,
  after_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON audit_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service can insert audit log"
  ON audit_log FOR INSERT
  WITH CHECK (TRUE);

-- ═══════════════════════════════════════════════════════════════════════
-- SETTINGS (admin-configurable product settings)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (price, deposit shown on public pages)
CREATE POLICY "Anyone can read settings"
  ON settings FOR SELECT
  USING (TRUE);

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert settings"
  ON settings FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ═══════════════════════════════════════════════════════════════════════
-- ORDER STATUS HISTORY
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  preorder_id UUID NOT NULL REFERENCES preorders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status order_status NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order history"
  ON order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM preorders
      WHERE preorders.id = order_status_history.preorder_id
      AND preorders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage order history"
  ON order_status_history FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service can insert order history"
  ON order_status_history FOR INSERT
  WITH CHECK (TRUE);

-- ═══════════════════════════════════════════════════════════════════════
-- VIEWS: Customer Segments (single source of truth)
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW customer_segments AS
SELECT
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.marketing_consent,
  p.created_at,
  p.last_login_at,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM preorders o
      WHERE o.user_id = p.id AND o.payment_status = 'paid'
    ) THEN 'confirmed_buyer'
    WHEN EXISTS (
      SELECT 1 FROM preorders o
      WHERE o.user_id = p.id AND o.payment_status IN ('created', 'failed')
    ) THEN 'interested'
    ELSE 'prospect'
  END AS segment,
  (
    SELECT COUNT(*) FROM preorders o WHERE o.user_id = p.id AND o.payment_status = 'paid'
  ) AS paid_order_count,
  (
    SELECT COUNT(*) FROM preorders o WHERE o.user_id = p.id
  ) AS total_order_count,
  (
    SELECT COALESCE(SUM(
      CASE type
        WHEN 'view_pricing' THEN 1
        WHEN 'click_preorder' THEN 2
        WHEN 'start_checkout' THEN 3
        WHEN 'enter_details' THEN 3
        WHEN 'open_payment' THEN 4
        WHEN 'payment_failed' THEN 2
        WHEN 'payment_success' THEN 5
        ELSE 1
      END
    ), 0)
    FROM events e
    WHERE e.user_id = p.id
    AND e.created_at > NOW() - INTERVAL '30 days'
  ) AS engagement_score
FROM profiles p;

-- ═══════════════════════════════════════════════════════════════════════
-- FUNCTIONS AND TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    'customer'::public.user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_preorders_updated_at
  BEFORE UPDATE ON preorders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_follow_ups_updated_at
  BEFORE UPDATE ON follow_ups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Generate human-readable order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number = 'LUMI-' || LPAD(nextval('order_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON preorders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- ═══════════════════════════════════════════════════════════════════════
-- SEED DEFAULT SETTINGS
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO settings (key, value) VALUES
  ('product_price_paise', 'null'::jsonb),
  ('deposit_paise', 'null'::jsonb),
  ('shipping_estimate', '"TBA"'::jsonb),
  ('quantity_cap', '3'::jsonb),
  ('preorders_open', 'true'::jsonb);

-- ═══════════════════════════════════════════════════════════════════════
-- INDEXES for performance
-- ═══════════════════════════════════════════════════════════════════════

CREATE INDEX idx_preorders_user_id ON preorders(user_id);
CREATE INDEX idx_preorders_payment_status ON preorders(payment_status);
CREATE INDEX idx_preorders_order_status ON preorders(order_status);
CREATE INDEX idx_payments_preorder_id ON payments(preorder_id);
CREATE INDEX idx_payments_gateway_order_id ON payments(gateway_order_id);
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_audit_log_entity ON audit_log(entity, entity_id);
CREATE INDEX idx_follow_ups_customer_id ON follow_ups(customer_id);
CREATE INDEX idx_order_status_history_preorder ON order_status_history(preorder_id);
