-- Run with a migration/admin role. The application role needs only USAGE and
-- SELECT/INSERT/UPDATE/DELETE on this private schema, never schema ownership.
CREATE SCHEMA IF NOT EXISTS shopora_auth;
REVOKE ALL ON SCHEMA shopora_auth FROM PUBLIC;
CREATE TABLE IF NOT EXISTS shopora_auth.users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS shopora_auth.sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES shopora_auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON shopora_auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry ON shopora_auth.sessions(expires_at);
CREATE TABLE IF NOT EXISTS shopora_auth.challenges (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES shopora_auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('verify','reset')),
  expires_at timestamptz NOT NULL,
  UNIQUE(user_id, purpose)
);
CREATE TABLE IF NOT EXISTS shopora_auth.rate_limits (
  bucket text PRIMARY KEY,
  attempts integer NOT NULL,
  expires_at timestamptz NOT NULL
);
REVOKE ALL ON ALL TABLES IN SCHEMA shopora_auth FROM PUBLIC;
CREATE TABLE IF NOT EXISTS shopora_auth.google_identities (
 subject text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES shopora_auth.users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS shopora_auth.oauth_flows (
 state_hash text PRIMARY KEY,
 verifier text NOT NULL,
 nonce text NOT NULL,
 next_path text NOT NULL,
 expires_at timestamptz NOT NULL
);
REVOKE ALL ON ALL TABLES IN SCHEMA shopora_auth FROM PUBLIC;
