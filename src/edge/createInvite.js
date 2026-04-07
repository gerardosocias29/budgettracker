require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const sgMail = require('@sendgrid/mail');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const SENDGRID_KEY = process.env.SENDGRID_KEY;
const SENDER = process.env.SENDGRID_SENDER || 'no-reply@example.com';

if (SENDGRID_KEY) sgMail.setApiKey(SENDGRID_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function createInvite({ email, role = 'member', created_by = null, expiresHours = 72 }) {
  const token = uuidv4();
  const expires_at = new Date(Date.now() + expiresHours * 3600 * 1000).toISOString();

  const { error } = await supabase.from('invites').insert({ email, token, role, created_by, expires_at });
  if (error) throw error;

  const link = `${APP_URL}/signup?invite=${token}`;

  if (SENDGRID_KEY) {
    await sgMail.send({
      to: email,
      from: SENDER,
      subject: 'You are invited to BudgetTracker',
      html: `Click to join: <a href="${link}">${link}</a>`
    });
  }

  return { token, link };
}

module.exports = { createInvite };
