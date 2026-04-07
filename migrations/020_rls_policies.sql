-- Enable RLS and add example policies

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_insert_own_profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND id = auth.uid());

CREATE POLICY "users_select_own_profile" ON profiles
  FOR SELECT USING (id = auth.uid());

-- transactions: members and superadmin can select
CREATE POLICY "members_select_transactions" ON transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('member','superadmin'))
  );

-- only superadmin may insert transactions
CREATE POLICY "superadmin_insert_transactions" ON transactions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin')
  );

-- only superadmin may update/delete transactions
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

-- invites: do not allow anonymous inserts; creation should be done via service_role
-- (no public insert policy)
