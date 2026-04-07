-- claim_invite function: verify token, set profile role, mark invite used
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

  -- insert or update profile role
  INSERT INTO profiles(id, role, created_at)
    VALUES (auth.uid(), inv.role, now())
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE invites SET used = true WHERE id = inv.id;
END;
$$;

-- grant execute to anon so client can call rpc
GRANT EXECUTE ON FUNCTION public.claim_invite(text) TO anon;
