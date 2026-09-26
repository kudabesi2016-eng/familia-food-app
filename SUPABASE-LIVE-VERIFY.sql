-- Familia Food — Live Supabase verification
-- Jalankan di Supabase SQL Editor SETELAH SUPABASE-EXPANSION.sql.
-- Script ini read-only: tidak membuat transaksi bisnis dan tidak mengubah data.

with required(table_name) as (
  values
    ('ff_supplier'),
    ('ff_pelanggan'),
    ('ff_pembelian'),
    ('ff_pembelian_item'),
    ('ff_retur_penjualan'),
    ('ff_penjualan_pelanggan')
),
found as (
  select table_name
  from information_schema.tables
  where table_schema='public'
)
select r.table_name,
       case when f.table_name is null then 'MISSING' else 'OK' end as status
from required r
left join found f using(table_name)
order by r.table_name;

select
  c.conrelid::regclass::text as table_name,
  c.conname as constraint_name,
  pg_get_constraintdef(c.oid) as definition
from pg_constraint c
where c.connamespace='public'::regnamespace
  and c.conrelid::regclass::text in (
    'public.ff_pembelian',
    'public.ff_pembelian_item',
    'public.ff_retur_penjualan',
    'public.ff_penjualan_pelanggan'
  )
order by table_name, constraint_name;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and table_name in (
    'ff_supplier',
    'ff_pelanggan',
    'ff_pembelian',
    'ff_pembelian_item',
    'ff_retur_penjualan',
    'ff_penjualan_pelanggan'
  )
  and grantee in ('anon','authenticated','service_role')
order by table_name, grantee, privilege_type;

select sequence_name, grantee, privilege_type
from information_schema.role_usage_grants
where object_schema='public'
  and object_type='SEQUENCE'
  and sequence_name in (
    'ff_supplier_id_seq',
    'ff_pelanggan_id_seq',
    'ff_pembelian_id_seq',
    'ff_pembelian_item_id_seq',
    'ff_retur_penjualan_id_seq',
    'ff_penjualan_pelanggan_id_seq'
  )
  and grantee in ('anon','authenticated','service_role')
order by sequence_name, grantee, privilege_type;

select
  'core_tables' as check_group,
  count(*) filter (where table_name='produk') as produk,
  count(*) filter (where table_name='bahan_baku') as bahan_baku,
  count(*) filter (where table_name='hpp') as hpp,
  count(*) filter (where table_name='penjualan') as penjualan,
  count(*) filter (where table_name='data_lama') as data_lama,
  count(*) filter (where table_name='pengeluaran') as pengeluaran
from information_schema.tables
where table_schema='public'
  and table_name in ('produk','bahan_baku','hpp','penjualan','data_lama','pengeluaran');

select
  'online_locked' as check_group,
  coalesce(sum(qty),0) as new_online_bungkus
from public.penjualan
where channel='Online'
  and source='online_batch';

select
  'retur_total' as check_group,
  coalesce(sum(qty),0) as total_retur_bungkus
from public.ff_retur_penjualan;
