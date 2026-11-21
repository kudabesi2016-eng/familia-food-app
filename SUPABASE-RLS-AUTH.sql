-- Legacy open-access policy setup has been retired.
-- Do not run the former version: it granted unrestricted CRUD to anon.
-- After the owner account is confirmed, run SUPABASE-OWNER-AUTH.sql.
DO $retired$
BEGIN
  RAISE EXCEPTION 'This legacy policy script is retired. Use SUPABASE-OWNER-AUTH.sql after creating the confirmed owner account.';
END
$retired$;
