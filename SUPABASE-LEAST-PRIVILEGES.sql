-- Familia Food Supabase least-privilege hardening.
-- Retains CRUD required by the current login-less app, while removing
-- database-maintenance privileges from public client roles.
-- This does not provide private row access; authentication is a separate step.

REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

REVOKE UPDATE
  ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Tables created later must receive explicit grants in their own migration.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE UPDATE ON SEQUENCES FROM anon, authenticated;
