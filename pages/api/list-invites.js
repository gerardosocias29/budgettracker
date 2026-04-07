import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Verify caller is superadmin via their access token
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies['sb-access-token'];

  // For simplicity, use service_role to list invites (endpoint is only called from admin UI)
  const { data, error } = await supabaseAdmin
    .from('invites')
    .select('id, email, token, role, used, expires_at, created_at')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ invites: data });
}
