-- Familia Food POS — FINAL READ-ONLY AUDIT
-- HANYA SELECT. Tidak mengubah data.

-- 1) JUMLAH DATA PER CHANNEL/SOURCE
SELECT
  COALESCE(channel,'(kosong)') AS channel,
  COALESCE(source,'(kosong)') AS source,
  COUNT(*) AS rows,
  COALESCE(SUM(qty),0) AS qty,
  COALESCE(SUM(omzet_produk),0) AS omzet_produk,
  COALESCE(SUM(uang_bersih),0) AS uang_bersih,
  COALESCE(SUM(biaya_platform),0) AS biaya_platform,
  COALESCE(SUM(modal_hpp),0) AS modal_hpp
FROM public.penjualan
GROUP BY channel, source
ORDER BY channel, source;

-- 2) PENJUALAN PER BULAN
SELECT
  LEFT(COALESCE(tanggal::text,''),7) AS bulan,
  COALESCE(channel,'(kosong)') AS channel,
  COALESCE(source,'(kosong)') AS source,
  COUNT(*) AS rows,
  COALESCE(SUM(qty),0) AS qty,
  COALESCE(SUM(omzet_produk),0) AS omzet,
  COALESCE(SUM(uang_bersih),0) AS uang_bersih
FROM public.penjualan
GROUP BY 1,2,3
ORDER BY 1 DESC,2,3;

-- 3) DUPLIKAT IMPORT KEY
SELECT import_key, COUNT(*) AS jumlah
FROM public.penjualan
WHERE import_key IS NOT NULL
GROUP BY import_key
HAVING COUNT(*) > 1
ORDER BY jumlah DESC, import_key;

-- 4) TRANSAKSI ONLINE TANPA ORDER ID / SOURCE
SELECT id, tanggal, channel, source, order_id, product_name, qty
FROM public.penjualan
WHERE channel='Online'
  AND (NULLIF(TRIM(COALESCE(order_id,'')),'') IS NULL OR NULLIF(TRIM(COALESCE(source,'')),'') IS NULL)
ORDER BY id DESC;

-- 5) TRANSAKSI OFFLINE DENGAN DATA KRITIS KOSONG
SELECT id, tanggal, produk_id, product_name, qty, harga, omzet_produk, modal_hpp, laba
FROM public.penjualan
WHERE channel='Offline'
  AND (
    tanggal IS NULL OR qty IS NULL OR qty <= 0 OR produk_id IS NULL
  )
ORDER BY id DESC;

-- 6) PRODUK PENJUALAN YANG BELUM TERHUBUNG KE MASTER PRODUK
SELECT s.id, s.tanggal, s.channel, s.source, s.product_name, s.produk_id, s.qty
FROM public.penjualan s
LEFT JOIN public.produk p ON p.id=s.produk_id
WHERE s.produk_id IS NULL OR p.id IS NULL
ORDER BY s.tanggal DESC, s.id DESC;

-- 7) PRODUK MASTER YANG BELUM PUNYA HPP
SELECT p.id, p.nama_produk
FROM public.produk p
LEFT JOIN public.hpp h ON h.produk_id=p.id
WHERE COALESCE(p.statustext,p.status,'aktif') NOT IN ('arsip','nonaktif')
  AND h.id IS NULL
ORDER BY p.id;

-- 8) PENGELUARAN PER BULAN. PERIODE GABUNGAN DIPISAH.
SELECT periode, kategori, COUNT(*) AS rows, COALESCE(SUM(nominal),0) AS nominal
FROM public.pengeluaran
WHERE periode IS NOT NULL
GROUP BY periode, kategori
ORDER BY periode, kategori;

-- 9) PENGELUARAN HISTORIS YANG MERUPAKAN RENTANG/GABUNGAN.
SELECT *
FROM public.pengeluaran
WHERE periode IS NOT NULL
  AND periode !~ '^\d{4}-\d{2}$'
ORDER BY periode, kategori, id;

-- 10) DATA LAMA PER BULAN/PRODUK
SELECT
  periode, jenis, COUNT(*) AS rows,
  COALESCE(SUM(CAST(NULLIF(regexp_replace(COALESCE(catatan,''),'[^0-9.-]','','g'),'') AS numeric)),0) AS qty,
  COALESCE(SUM(nominal),0) AS omzet
FROM public.data_lama
GROUP BY periode, jenis
ORDER BY periode, jenis;
