import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, role = 'member', expiresHours = 72, created_by = null } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  try {
    const token = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : require('crypto').randomUUID();
    const expires_at = new Date(Date.now() + expiresHours * 3600 * 1000).toISOString();

    const { error } = await supabase.from('invites').insert({ email, token, role, created_by, expires_at });
    if (error) return res.status(500).json({ error: error.message });

    // Optionally send email here using provider configured in env
    return res.json({ token });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
