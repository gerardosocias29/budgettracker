-- Combined migrations for BudgetTracker (paste into Supabase SQL editor)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) Create tables
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id bigserial PRIMARY KEY,
  amount numeric NOT NULL,
  description text,
  created_by uuid REFERENCES profiles(id),
  assigned_to uuid REFERENCES profiles(id),
  proof_url text,
  idempotency_key text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_created_by_idx ON transactions(created_by);
CREATE INDEX IF NOT EXISTS transactions_assigned_to_idx ON transactions(assigned_to);

CREATE TABLE IF NOT EXISTS invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  token text UNIQUE NOT NULL,
  role text DEFAULT 'member',
  created_by uuid,
  expires_at timestamptz,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit (
  id bigserial PRIMARY KEY,
  table_name text NOT NULL,
  record_id text,
  action text NOT NULL,
  changed_by uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz DEFAULT now()
);

-- 3) Enable RLS and add policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_insert_own_profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND id = auth.uid());

CREATE POLICY "authenticated_select_profiles" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "members_select_transactions" ON transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('member','superadmin'))
  );

CREATE POLICY "superadmin_insert_transactions" ON transactions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

CREATE POLICY "superadmin_update_transactions" ON transactions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

CREATE POLICY "superadmin_delete_transactions" ON transactions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

-- invites: creation should be done via server/service_role; no public insert policy added here

-- 4) claim_invite RPC function
CREATE OR REPLACE FUNCTION public.claim_invite(inv_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inv invites%ROWTYPE;
BEGIN
  SELECT * INTO inv FROM invites WHERE token = inv_token AND used = false AND (expires_at IS NULL OR expires_at > now()) LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid invite';
  END IF;

  INSERT INTO profiles(id, role, metadata, created_at)
    VALUES (
      auth.uid(),
      inv.role,
      jsonb_build_object('email', (SELECT email FROM auth.users WHERE id = auth.uid())),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      role = EXCLUDED.role,
      metadata = COALESCE(profiles.metadata, '{}'::jsonb) || EXCLUDED.metadata;

  UPDATE invites SET used = true WHERE id = inv.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_invite(text) TO anon;


-- 5) Storage RLS policies for "proof" bucket (create bucket first in Supabase dashboard)
CREATE POLICY "superadmin_upload_proof" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'proof'
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

CREATE POLICY "authenticated_view_proof" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'proof'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "superadmin_delete_proof" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'proof'
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

-- End of combined migrations
