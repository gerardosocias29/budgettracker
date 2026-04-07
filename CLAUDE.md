CLAUDE - Supabase Implementation Plan

Purpose
- Provide a concise, actionable plan to implement Supabase-backed SPA for BudgetTracker.

Goals
- Multi-user SPA with one `superadmin` who manages transactions.
- Invited members can view (read-only) via invite links.
- Fast to prototype on Supabase free tier, secure (RLS), and migratable.

Assumptions
- Client is a React SPA (existing `finance_tracker_ui_mockup.jsx`).
- Email delivery via SendGrid (or equivalent) for invite links.
- Serverless Edge Function or small Node server used to create invites with `service_role` key.

Deliverables
- SQL migrations for tables and RLS policies.
- Edge Function (Node) to create/send invites using `service_role` key.
- `claim_invite` RPC function (SECURITY DEFINER) to assign role on signup.
- Client signup flow that calls `claim_invite` after auth.
- Minimal scripts to run migrations locally.

High-level steps
1. Create Supabase project; record `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
2. Add migration files (see `migrations/`): create `profiles`, `transactions`, `invites`, `audit`.
3. Enable RLS and add policies for `profiles`, `transactions`, `invites`.
4. Add `claim_invite` RPC as `SECURITY DEFINER` and grant execute to `anon`.
5. Implement Edge Function (or Node server) to generate invites and send emails (uses `service_role` key).
6. Implement client flows: invite creation UI (superadmin), signup page that passes invite token, call to `claim_invite` RPC.
7. Test role flows, RLS enforcement, and transaction idempotency; add audit logging.
8. Deploy Edge Function and configure environment variables.

Migrations (suggested files)
- `migrations/001_create_extensions.sql`
  - enable `pgcrypto` (for gen_random_uuid) if needed.
- `migrations/010_create_profiles_transactions_invites_audit.sql` (create tables)
- `migrations/020_rls_policies.sql` (enable RLS and add policies)
- `migrations/030_functions_claim_invite.sql` (RPC `claim_invite`)

Key schema notes
- `profiles` links to `auth.users(id)` (uuid), stores `role` (`member` | `superadmin`), and metadata.
- `transactions` must record `created_by`, `amount`, `description`, `idempotency_key` (optional), `created_at`.
- `invites` stores `token`, `email`, `role`, `created_by`, `expires_at`, `used`.
- `audit` stores immutable records of transaction changes (who, when, before/after JSON).

RLS summary
- `profiles`: allow users to `INSERT` their own profile and `SELECT` their profile; admin read/write via role check.
- `transactions`: `SELECT` allowed for `member` and `superadmin`; `INSERT/UPDATE/DELETE` allowed only for `superadmin`.
- `invites`: disallow public inserts; creation via `service_role` only (Edge Function). `SELECT` restricted to appropriate roles.

Invite flow (safe)
- Superadmin creates invite via Edge Function (server): generates secure random `token`, inserts invite row (service_role), sends email with link: `https://app.example/signup?invite=TOKEN`.
- User clicks link, enters email+password (or magic link). After account created, client calls `supabase.rpc('claim_invite', {inv_token: 'TOKEN'})` which verifies token and writes `profiles` role for `auth.uid()`.
- `claim_invite` is `SECURITY DEFINER` and marks invite as `used`.

Edge Function responsibilities
- Use `SERVICE_ROLE_KEY` for DB writes to `invites`.
- Validate sender (superadmin) via auth or check `created_by` in payload.
- Send email with link using SendGrid/Mailgun.
- Do not expose `SERVICE_ROLE_KEY` to clients.

Client responsibilities
- Register user via `supabase.auth.signUp` (or magic link).
- After successful sign-up and session, call `claim_invite` RPC with token.
- UI should only show invite creation controls to `superadmin` (check `profiles.role`).

Security & best practices
- Keep `service_role` key strictly server-side.
- Use `SECURITY DEFINER` RPC to safely assign roles and mark invites used.
- Add idempotency for transaction creation (prevent duplicate posts).
- Add audit table for financial changes and enable periodic backups.

Local workflow & commands (examples)
- Run migrations locally (once you have DB connection settings configured):

  ```bash
  node scripts/run-migrations.js --db-url "$SUPABASE_DB_URL"
  ```

- Start Edge Function / Node server locally (example):

  ```bash
  NODE_ENV=development node src/edge/server.js
  ```

Next actions I can take now
- Generate the SQL migration files under `migrations/` and a `scripts/run-migrations.js` runner.
- Scaffold the Edge Function `src/edge/createInvite.js` and a minimal `src/edge/server.js` to run locally.
- Add a small React component to `finance_tracker_ui_mockup.jsx` to accept invite tokens and call `claim_invite`.

Tell me which next action to perform and I will scaffold files and migrations accordingly.
