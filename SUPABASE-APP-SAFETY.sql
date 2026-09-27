-- Familia Food — structural safety migration
-- Already applied to the production Supabase project.
-- Non-destructive: protects master relationships and archives recipe rows instead of deleting them.

alter table public.resep
  add column if not exists status text not null default 'Aktif';

alter table public.resep
  drop constraint if exists resep_status_check;

alter table public.resep
  add constraint resep_status_check check (status = any (array['Aktif'::text,'Arsip'::text]));

alter table public.resep
  add constraint resep_produk_id_fkey
  foreign key (produk_id) references public.produk(id) on delete restrict
  not valid;

alter table public.resep
  add constraint resep_bahan_id_fkey
  foreign key (bahan_id) references public.bahan_baku(id) on delete restrict
  not valid;

alter table public.hpp
  add constraint hpp_produk_id_fkey
  foreign key (produk_id) references public.produk(id) on delete restrict
  not valid;

alter table public.penjualan
  add constraint penjualan_produk_id_fkey
  foreign key (produk_id) references public.produk(id) on delete set null
  not valid;

create index if not exists resep_produk_id_idx on public.resep(produk_id);
create index if not exists resep_bahan_id_idx on public.resep(bahan_id);
create index if not exists hpp_produk_id_idx on public.hpp(produk_id);
create index if not exists penjualan_produk_id_idx on public.penjualan(produk_id);
create index if not exists ff_hutang_piutang_bayar_hutang_piutang_id_idx on public.ff_hutang_piutang_bayar(hutang_piutang_id);
create index if not exists ff_pembelian_supplier_id_idx on public.ff_pembelian(supplier_id);
create index if not exists ff_pembelian_item_bahan_id_idx on public.ff_pembelian_item(bahan_id);
create index if not exists ff_retur_penjualan_penjualan_id_idx on public.ff_retur_penjualan(penjualan_id);
create index if not exists ff_retur_penjualan_produk_id_idx on public.ff_retur_penjualan(produk_id);

-- Catatan:
-- RLS existing client-direct tetap dipertahankan sementara karena aplikasi
-- belum memakai login admin/role untuk semua modul. Mengaktifkan RLS ketat
-- tanpa jalur autentikasi akan memutus CRUD aplikasi. Ini menjadi pekerjaan
-- tahap keamanan terpisah, bukan perubahan data usaha.
