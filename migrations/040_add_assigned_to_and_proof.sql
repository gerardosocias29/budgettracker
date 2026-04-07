-- Add assigned_to and proof_url columns to transactions

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES profiles(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS proof_url text;

CREATE INDEX IF NOT EXISTS transactions_assigned_to_idx ON transactions(assigned_to);

-- Allow all authenticated users to select profiles (needed for user dropdown in assign)
-- Replace the old restrictive policy
DROP POLICY IF EXISTS "users_select_own_profile" ON profiles;

CREATE POLICY "authenticated_select_profiles" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Backfill email into profiles.metadata for existing users
UPDATE profiles
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('email', u.email)
FROM auth.users u
WHERE profiles.id = u.id
  AND (profiles.metadata IS NULL OR profiles.metadata->>'email' IS NULL);

-- Update claim_invite to store email in metadata
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
