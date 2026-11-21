-- Owner-only Supabase access cutover.
-- Prerequisite: create and confirm the owner Auth account before running.
-- This migration adds ownership metadata only; it does not alter business values.
DO $auth_cutover$
DECLARE
  v_owner_email text := 'kudabesi2016@gmail.com';
  v_owner_id uuid;
  v_table text;
  v_policy record;
  v_other_owner_rows bigint;
  v_tables text[] := ARRAY[
    'produk','bahan_baku','resep','hpp','penjualan','data_lama','pengaturan',
    'pengeluaran','ff_supplier','ff_pelanggan','ff_pembelian',
    'ff_pembelian_item','ff_retur_penjualan','ff_penjualan_pelanggan',
    'ff_hutang_piutang','ff_hutang_piutang_bayar','pengeluaran_item',
    'pengeluaran_item_master','pengeluaran_kategori_master'
  ];
BEGIN
  SELECT id INTO v_owner_id
  FROM auth.users
  WHERE lower(email)=lower(v_owner_email)
    AND email_confirmed_at IS NOT NULL
  ORDER BY created_at
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Owner Auth account % must exist and be confirmed before this migration.', v_owner_email;
  END IF;

  FOREACH v_table IN ARRAY v_tables LOOP
    IF to_regclass(format('public.%I',v_table)) IS NULL THEN
      RAISE EXCEPTION 'Required Familia Food table public.% is missing.', v_table;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS owner_id uuid',v_table);
    EXECUTE format('UPDATE public.%I SET owner_id=$1 WHERE owner_id IS NULL',v_table)
      USING v_owner_id;

    EXECUTE format('SELECT count(*) FROM public.%I WHERE owner_id IS DISTINCT FROM $1',v_table)
      INTO v_other_owner_rows USING v_owner_id;
    IF v_other_owner_rows > 0 THEN
      RAISE EXCEPTION 'Table public.% contains rows owned by a different account; review required.',v_table;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN owner_id SET DEFAULT auth.uid()',v_table);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN owner_id SET NOT NULL',v_table);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',v_table);

    FOR v_policy IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public'
        AND tablename=v_table
        AND roles && ARRAY['anon'::name,'authenticated'::name,'public'::name]
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',v_policy.policyname,v_table);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY ff_owner_access ON public.%I FOR ALL TO authenticated '||
      'USING (owner_id=(SELECT auth.uid()) AND lower((SELECT auth.jwt()->>''email''))=lower(%L)) '||
      'WITH CHECK (owner_id=(SELECT auth.uid()) AND lower((SELECT auth.jwt()->>''email''))=lower(%L))',
      v_table,v_owner_email,v_owner_email
    );

    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated',v_table);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated',v_table);
  END LOOP;

  REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON TABLES FROM anon, authenticated;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM anon, authenticated;
END
$auth_cutover$;
