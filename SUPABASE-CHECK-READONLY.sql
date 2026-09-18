-- CEK STRUKTUR SUPABASE FAMILIA FOOD
-- Aman: hanya SELECT, tidak mengubah data maupun struktur.

-- 1) Tabel yang tersedia
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'produk','bahan_baku','resep','hpp','penjualan',
    'data_lama','pengeluaran','pengaturan'
  )
order by table_name;

-- 2) Kolom + tipe data
select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'produk','bahan_baku','resep','hpp','penjualan',
    'data_lama','pengeluaran','pengaturan'
  )
order by table_name, ordinal_position;

-- 3) Kolom penting yang wajib ada untuk POS 2 channel
select
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name='produk' and column_name in
      ('id','nama_produk','satuan','isi_per_bungkus','harga_offline','harga_online','statustext','status'))
    or
    (table_name='hpp' and column_name in
      ('id','produk_id','hpp_unit','hpp_online','untung_online','jumlah_batch'))
    or
    (table_name='penjualan' and column_name in
      ('id','tanggal','produk_id','qty','channel','harga','hpp','laba',
       'order_id','product_name','variation','sku_id','seller_sku',
       'quantity_return','harga_asli','omzet_produk','order_amount',
       'biaya_platform','uang_bersih','modal_hpp','profit_online',
       'source','purchase_channel','order_channel','created_time','paid_time','import_key'))
    or
    (table_name='data_lama' and column_name in
      ('id','periode','konsumen','produk','qty','omzet','nominal','keterangan'))
    or
    (table_name='pengeluaran' and column_name in
      ('id','periode','kategori','keterangan','nominal'))
  )
order by table_name, column_name;

-- 4) Cek index/unique constraint yang berhubungan dengan duplikat online
select
  indexname,
  indexdef
from pg_indexes
where schemaname='public'
  and tablename='penjualan'
order by indexname;
