# Familia Food POS — Audit & Perbaikan v10

Tanggal: 19 September 2026

## A. Masalah yang ditemukan pada v9
1. Preview Data Lama Online sudah berhasil menggabungkan Income + Pesanan berdasarkan ID Pesanan, tetapi HPP Online masih mengambil jalur `hpp_unit` sehingga belum mengikuti pola HPP Online master.
2. Informasi jumlah cocok sebelumnya dihitung dari bulan+produk, bukan jumlah Order ID yang benar-benar cocok.
3. Grup produk masih memasukkan bulan ke dalam key, padahal penggabungan seharusnya tetap berbasis Order ID dan identitas produk.
4. Kegagalan membaca master Produk/HPP sebelumnya ditelan tanpa pesan yang jelas.

## B. Pola final v10
- **Income TikTok** → Pemasukan + Uang Bersih.
- **Seller Center** → Produk + Qty.
- **Kunci penggabungan** → ID Pesanan.
- **Multi-produk dalam satu order** → alokasi Pemasukan/Uang Bersih secara proporsional berdasarkan omzet produk Seller Center.
- **HPP Online** → Harga Online − Untung Online dari master HPP.
- **Fallback HPP** → hpp_unit hanya bila HPP Online master tidak tersedia.
- **Profit** → Uang Bersih − Modal/HPP bila HPP tersedia.

## C. Pengujian file nyata di workspace
File Seller Center lokal:
- 11.473 baris.
- 8.786 Order ID unik.

Satu file Income TikTok nyata yang diuji:
- 11 transaksi Pesanan.
- 11 Order ID Pesanan unik.
- 10 Order ID cocok dengan Seller Center setelah normalisasi whitespace/ID.
- 11 baris produk preview dari order yang cocok.
- 10 baris produk dapat dipetakan ke HPP Online dengan alias eksplisit `Tempura Aci ...` → `Naget isi 12` pada baseline HPP yang sudah disepakati.

Empat file Income bulanan nyata yang diuji bersama Seller Center:
- 55 Order ID unik setelah deduplikasi fingerprint transaksi.
- 49 Order ID cocok dengan Seller Center.
- Duplikasi file Income tidak dihitung dua kali.

## D. Unit test v10
Skenario multi-produk satu order diuji:
- Pemasukan order dibagi menurut proporsi omzet produk.
- Uang Bersih order dibagi menurut proporsi omzet produk.
- Total alokasi Pemasukan kembali sama dengan Pemasukan order.
- Total alokasi Uang Bersih kembali sama dengan Uang Bersih order.
- HPP Online varian Tempura Aci 12 terbaca sebagai HPP Online master, bukan hpp_unit offline.

## E. Validasi syntax
Semua halaman HTML yang berisi JavaScript lulus pemeriksaan syntax setelah patch v10:
- bahan-baku.html PASS
- data-lama.html PASS
- hpp.html PASS
- index.html PASS
- pengaturan.html PASS
- penjualan.html PASS
- produk.html PASS
- rekap.html PASS
- resep.html PASS

## F. Supabase
Struktur Supabase yang sudah menjadi acuan aplikasi:
- tabel produk
- tabel hpp dengan `hpp_unit`, `harga_online`, `untung_online`
- tabel penjualan dengan field Online seperti Order ID, Product Name, Quantity, Pemasukan/Uang Bersih, HPP, Profit, Source, dan Import Key.

Query REST live ke endpoint Supabase tidak dapat dijalankan dari environment pembuatan paket ini karena koneksi DNS outbound tidak tersedia. Karena itu v10 **tidak mengklaim membaca database live saat build**. Patch hanya menggunakan field/schema yang sudah dipakai aplikasi dan pola HPP yang telah diverifikasi dari source aplikasi.

## G. Tidak ada perubahan database selama build
Pembuatan paket v10 tidak melakukan INSERT, UPDATE, atau DELETE ke Supabase.

## v11 Hotfix Check
- Reported runtime error fixed: `column produk.hpp_offline does not exist`.
- `data-lama.html` no longer selects `hpp_offline` from `produk`.
- Inline JavaScript syntax check: PASS for all 9 HTML pages.
- No Supabase writes performed during this hotfix build.
