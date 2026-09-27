-- Familia Food: current loginless RLS target.
-- The web/Android app intentionally has no user/hak akses login yet.
-- Therefore business tables remain accessible to the Supabase anon and
-- authenticated roles. Do not claim per-user data isolation until auth/user
-- access is introduced explicitly.

drop policy if exists ff_bahan_baku_app_access on public.bahan_baku;
drop policy if exists ff_data_lama_app_access on public.data_lama;
drop policy if exists ff_hutang_piutang_all on public.ff_hutang_piutang;
drop policy if exists ff_hutang_piutang_bayar_all on public.ff_hutang_piutang_bayar;
drop policy if exists ff_ff_pelanggan_app_access on public.ff_pelanggan;
drop policy if exists ff_ff_pembelian_app_access on public.ff_pembelian;
drop policy if exists ff_ff_pembelian_item_app_access on public.ff_pembelian_item;
drop policy if exists ff_ff_penjualan_pelanggan_app_access on public.ff_penjualan_pelanggan;
drop policy if exists ff_ff_retur_penjualan_app_access on public.ff_retur_penjualan;
drop policy if exists ff_ff_supplier_app_access on public.ff_supplier;
drop policy if exists ff_hpp_app_access on public.hpp;
drop policy if exists ff_pengaturan_app_access on public.pengaturan;
drop policy if exists ff_pengeluaran_app_access on public.pengeluaran;
drop policy if exists ff_pengeluaran_item_app_access on public.pengeluaran_item;
drop policy if exists ff_pengeluaran_item_master_app_access on public.pengeluaran_item_master;
drop policy if exists ff_penjualan_app_access on public.penjualan;
drop policy if exists ff_produk_app_access on public.produk;
drop policy if exists ff_resep_app_access on public.resep;

create policy ff_bahan_baku_app_access on public.bahan_baku for all to anon, authenticated using (true) with check (true);
create policy ff_data_lama_app_access on public.data_lama for all to anon, authenticated using (true) with check (true);
create policy ff_hutang_piutang_all on public.ff_hutang_piutang for all to anon, authenticated using (true) with check (true);
create policy ff_hutang_piutang_bayar_all on public.ff_hutang_piutang_bayar for all to anon, authenticated using (true) with check (true);
create policy ff_ff_pelanggan_app_access on public.ff_pelanggan for all to anon, authenticated using (true) with check (true);
create policy ff_ff_pembelian_app_access on public.ff_pembelian for all to anon, authenticated using (true) with check (true);
create policy ff_ff_pembelian_item_app_access on public.ff_pembelian_item for all to anon, authenticated using (true) with check (true);
create policy ff_ff_penjualan_pelanggan_app_access on public.ff_penjualan_pelanggan for all to anon, authenticated using (true) with check (true);
create policy ff_ff_retur_penjualan_app_access on public.ff_retur_penjualan for all to anon, authenticated using (true) with check (true);
create policy ff_ff_supplier_app_access on public.ff_supplier for all to anon, authenticated using (true) with check (true);
create policy ff_hpp_app_access on public.hpp for all to anon, authenticated using (true) with check (true);
create policy ff_pengaturan_app_access on public.pengaturan for all to anon, authenticated using (true) with check (true);
create policy ff_pengeluaran_app_access on public.pengeluaran for all to anon, authenticated using (true) with check (true);
create policy ff_pengeluaran_item_app_access on public.pengeluaran_item for all to anon, authenticated using (true) with check (true);
create policy ff_pengeluaran_item_master_app_access on public.pengeluaran_item_master for all to anon, authenticated using (true) with check (true);
create policy ff_penjualan_app_access on public.penjualan for all to anon, authenticated using (true) with check (true);
create policy ff_produk_app_access on public.produk for all to anon, authenticated using (true) with check (true);
create policy ff_resep_app_access on public.resep for all to anon, authenticated using (true) with check (true);
