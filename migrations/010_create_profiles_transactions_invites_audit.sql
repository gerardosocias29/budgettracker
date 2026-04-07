-- Create main tables: profiles, transactions, invites, audit

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
  idempotency_key text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_created_by_idx ON transactions(created_by);

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
