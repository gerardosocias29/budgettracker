import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, inviteToken } = req.body || {};
  if (!email || !password || !inviteToken) {
    return res.status(400).json({ error: 'email, password, and inviteToken are required' });
  }

  try {
    // 1. Validate invite token
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('token', inviteToken)
      .eq('used', false)
      .single();

    if (inviteError || !invite) {
      return res.status(400).json({ error: 'Invalid or expired invite token.' });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This invite has expired.' });
    }

    // 2. Create user with email pre-confirmed (admin API)
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      return res.status(400).json({ error: createError.message });
    }

    const userId = userData.user.id;

    // 3. Create profile with role from invite
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        role: invite.role || 'member',
        metadata: { email },
        created_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (profileError) {
      return res.status(500).json({ error: 'Account created but profile setup failed: ' + profileError.message });
    }

    // 4. Mark invite as used
    await supabase.from('invites').update({ used: true }).eq('id', invite.id);

    return res.json({ success: true, message: 'Account created. You can now log in.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
