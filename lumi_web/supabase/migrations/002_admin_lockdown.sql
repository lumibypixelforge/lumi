-- LUMI Admin Lockdown & Security Migration
-- Migration: 002_admin_lockdown
-- Implements Section 3 (Access Model, 3-Layer Auth, RLS, Audit Immutability)
-- And Section 6 (Data reconciliation for order d500bf30)

-- 1. Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'viewer')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 2. Security Definer function is_admin(required_role)
-- Verifies:
-- a) User exists in admin_users and is active
-- b) User meets role hierarchy (owner > admin > viewer)
-- c) User has AAL2 (Supabase TOTP MFA) assurance level
CREATE OR REPLACE FUNCTION public.is_admin(required_role TEXT DEFAULT 'viewer')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role TEXT;
  v_aal TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verify active admin record
  SELECT role INTO v_role
  FROM public.admin_users
  WHERE user_id = auth.uid() AND active = true;

  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verify AAL2 (TOTP verified) from JWT claims
  -- In Supabase auth, auth.jwt() ->> 'aal' contains 'aal1' or 'aal2'
  v_aal := auth.jwt() ->> 'aal';
  IF v_aal IS NULL OR v_aal <> 'aal2' THEN
    RETURN FALSE;
  END IF;

  -- Role hierarchy check
  IF required_role = 'viewer' THEN
    RETURN v_role IN ('owner', 'admin', 'viewer');
  ELSIF required_role = 'admin' THEN
    RETURN v_role IN ('owner', 'admin');
  ELSIF required_role = 'owner' THEN
    RETURN v_role = 'owner';
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Deny client writes to admin_users table. Only viewers/admins can read their list
DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;
CREATE POLICY "Admins can view admin_users"
  ON public.admin_users FOR SELECT
  USING (public.is_admin('viewer'));

-- 3. Audit log immutability trigger (reject UPDATE and DELETE for every role)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log rows are immutable: updates and deletes are rejected.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_modification ON public.audit_log;
CREATE TRIGGER trg_prevent_audit_log_modification
BEFORE UPDATE OR DELETE ON public.audit_log
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();

-- 4. Update RLS policies on core tables to use is_admin
-- Preorders
DROP POLICY IF EXISTS "Service role can manage preorders" ON public.preorders;
DROP POLICY IF EXISTS "Admins can manage preorders" ON public.preorders;
CREATE POLICY "Admins can view preorders"
  ON public.preorders FOR SELECT
  USING (public.is_admin('viewer') OR auth.uid() = user_id);

CREATE POLICY "Admins can update preorders"
  ON public.preorders FOR UPDATE
  USING (public.is_admin('admin'));

-- Payments
DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;
CREATE POLICY "Admins can view payments"
  ON public.payments FOR SELECT
  USING (
    public.is_admin('viewer')
    OR EXISTS (
      SELECT 1 FROM public.preorders
      WHERE preorders.id = payments.preorder_id
      AND preorders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update payments"
  ON public.payments FOR UPDATE
  USING (public.is_admin('admin'));

-- Audit Log
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
CREATE POLICY "Admins can view audit log"
  ON public.audit_log FOR SELECT
  USING (public.is_admin('viewer'));

-- Webhook Events
DROP POLICY IF EXISTS "Admins can view webhook events" ON public.webhook_events;
CREATE POLICY "Admins can view webhook events"
  ON public.webhook_events FOR SELECT
  USING (public.is_admin('viewer'));

-- Settings
DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.settings;
CREATE POLICY "Admins can update settings"
  ON public.settings FOR UPDATE
  USING (public.is_admin('admin'));

CREATE POLICY "Admins can insert settings"
  ON public.settings FOR INSERT
  WITH CHECK (public.is_admin('admin'));

-- Admin Notes
DROP POLICY IF EXISTS "Admins can manage notes" ON public.admin_notes;
CREATE POLICY "Admins can view notes"
  ON public.admin_notes FOR SELECT
  USING (public.is_admin('viewer'));

CREATE POLICY "Admins can manage notes"
  ON public.admin_notes FOR ALL
  USING (public.is_admin('admin'));

-- Follow Ups
DROP POLICY IF EXISTS "Admins can manage follow_ups" ON public.follow_ups;
CREATE POLICY "Admins can view follow_ups"
  ON public.follow_ups FOR SELECT
  USING (public.is_admin('viewer'));

CREATE POLICY "Admins can manage follow_ups"
  ON public.follow_ups FOR ALL
  USING (public.is_admin('admin'));

-- Order Status History
DROP POLICY IF EXISTS "Admins can manage order history" ON public.order_status_history;
CREATE POLICY "Admins can view order history"
  ON public.order_status_history FOR SELECT
  USING (
    public.is_admin('viewer')
    OR EXISTS (
      SELECT 1 FROM public.preorders
      WHERE preorders.id = order_status_history.preorder_id
      AND preorders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert order history"
  ON public.order_status_history FOR INSERT
  WITH CHECK (public.is_admin('admin'));

-- 5. Seed owner admin user
INSERT INTO public.admin_users (user_id, role, active)
VALUES ('d4ea3874-1e2c-41c7-a221-6803d0942453', 'owner', true)
ON CONFLICT (user_id) DO UPDATE
SET role = 'owner', active = true, updated_at = NOW();

-- 6. Reconcile Section 6 Data Integrity Bug: Restore order d500bf30
INSERT INTO public.preorders (
  id,
  order_number,
  user_id,
  quantity,
  unit_price_paise,
  deposit_paise,
  total_paise,
  currency,
  payment_status,
  order_status,
  shipping_address,
  created_at,
  updated_at
)
VALUES (
  'd500bf30-d1aa-467a-ad10-eb9115845679',
  'LUMI-000001',
  'd4ea3874-1e2c-41c7-a221-6803d0942453',
  1,
  4999900,
  499900,
  4999900,
  'INR',
  'paid',
  'confirmed',
  '{"fullName": "Ritik Mandal", "phone": "+91 9876543210", "city": "Bengaluru", "state": "Karnataka", "postalCode": "560001", "addressLine1": "100 Feet Road, Indiranagar"}'::jsonb,
  '2026-10-15 18:18:25.786924+00',
  '2026-10-15 18:18:25.786924+00'
)
ON CONFLICT (id) DO UPDATE
SET payment_status = 'paid', order_status = 'confirmed', updated_at = NOW();

-- Insert matching payment record if not present
INSERT INTO public.payments (
  preorder_id,
  gateway,
  gateway_order_id,
  gateway_payment_id,
  amount_paise,
  currency,
  status,
  method,
  signature_verified,
  verified_at,
  created_at,
  updated_at
)
SELECT
  'd500bf30-d1aa-467a-ad10-eb9115845679',
  'mock',
  'order_mock_d500bf30',
  'pay_mock_d500bf30',
  499900,
  'INR',
  'paid',
  'upi',
  true,
  '2026-10-15 18:18:25.786924+00',
  '2026-10-15 18:18:25.786924+00',
  '2026-10-15 18:18:25.786924+00'
WHERE NOT EXISTS (
  SELECT 1 FROM public.payments WHERE preorder_id = 'd500bf30-d1aa-467a-ad10-eb9115845679'
);

-- Insert matching order status history
INSERT INTO public.order_status_history (
  preorder_id,
  from_status,
  to_status,
  note,
  created_at
)
SELECT
  'd500bf30-d1aa-467a-ad10-eb9115845679',
  'pending',
  'confirmed',
  'Payment verified via gateway pay_mock_d500bf30',
  '2026-10-15 18:18:25.786924+00'
WHERE NOT EXISTS (
  SELECT 1 FROM public.order_status_history WHERE preorder_id = 'd500bf30-d1aa-467a-ad10-eb9115845679'
);
