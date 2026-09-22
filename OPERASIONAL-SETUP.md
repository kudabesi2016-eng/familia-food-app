# Setup Modul Operasional — Familia Food

Modul Operasional memakai database Supabase sebagai sumber data utama. Tidak ada fallback penulisan data bisnis ke localStorage.

## Sekali saja di Supabase

Buka SQL Editor Supabase, lalu jalankan seluruh isi:

`SUPABASE-EXPANSION.sql`

SQL ini menambahkan:
- `ff_supplier`
- `ff_pelanggan`
- `ff_pembelian`
- `ff_pembelian_item`
- `ff_retur_penjualan`
- `ff_penjualan_pelanggan`

SQL tidak membuat tabel stok, mutasi stok, pembayaran, multi outlet, atau user/role.

## Alur data yang dikunci

**POS/Penjualan → Pelanggan**
- Nama pelanggan disimpan di master `ff_pelanggan`.
- Hubungan pelanggan ke transaksi disimpan di `ff_penjualan_pelanggan`.
- Data Lama membaca mapping yang sama.

**Pembelian → Bahan Baku → HPP**
- Pembelian disimpan ke `ff_pembelian` dan `ff_pembelian_item`.
- Harga beli terakhir menyinkronkan `bahan_baku.harga_beli`.
- HPP membaca harga bahan terbaru.
- Bila sinkronisasi harga gagal, pembelian baru di-rollback.

**Retur → Rekap**
- Retur disimpan di `ff_retur_penjualan`.
- Qty retur tidak boleh melebihi qty penjualan yang masih tersedia.
- Rekap membaca retur sebagai data operasional terpisah dan tidak mengubah rumus historis yang sudah dikunci.

**Pengeluaran → Rekap/Dashboard**
- Pengeluaran tetap memakai tabel `pengeluaran`.
- Pengeluaran yang baru dicatat masuk ke sumber data yang sama yang dibaca Rekap dan Dashboard.

## Tahap validasi

Sebelum dipakai harian, pastikan:
1. SQL migrasi sudah berhasil.
2. Halaman Operasional menampilkan status "Semua modul ... terhubung ke database Supabase".
3. Tambah 1 pelanggan dari Operasional, lalu gunakan pelanggan tersebut saat menyimpan transaksi POS.
4. Edit transaksi POS dan pastikan nama pelanggan tetap muncul.
5. Buat pembelian bahan, lalu cek harga bahan berubah dan HPP membaca harga baru.
6. Hapus pembelian terakhir, lalu cek harga bahan kembali mengikuti pembelian sebelumnya.
7. Catat pengeluaran dan pastikan muncul di Rekap/Dashboard.
8. Catat retur dengan qty valid dan cek muncul di Rekap.
9. Coba retur melebihi sisa qty; transaksi harus ditolak.

## Catatan penting

Data Online historis Jan–Agustus 2026 tetap memakai kunci 8.085 bungkus dan pola HPP yang sudah dikunci. Modul baru tidak mengganti data historis tersebut.
