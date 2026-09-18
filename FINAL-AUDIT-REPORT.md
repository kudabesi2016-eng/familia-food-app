# Familia Food POS — Audit & Perbaikan Final

Tanggal audit: 18 September 2026

## 1. Supabase yang sudah terverifikasi dari hasil SQL pengguna
- `produk`: 10 data.
- `hpp`: 10 data.
- `data_lama`: 311 data.
- `pengeluaran`: 446 data.
- `penjualan`: 2 data, keduanya Offline saat audit; Online belum tersimpan.
- Index online yang sudah ada: primary key + unique partial `import_key` + index Order ID/Product/Source.

## 2. Sumber data online yang tersedia di workspace
- `Familia-Food-Import-Online-SIAP.xlsx`: 1.846 baris detail Jan–Feb 2026.
- `Online Database (8).xlsx`: 2.023 baris `Keluar Resi` Mar–Sep 2026 + 104 baris `Uang Masuk` historis.
- File Income TikTok per bulan juga tersedia untuk beberapa bulan.

## 3. Perbaikan utama
- Rekap dipisahkan tegas Offline vs Online.
- Offline = `data_lama` + transaksi baru Offline.
- Online = data keuangan Income/historis yang valid + detail produk Seller Center/historis.
- Seller Center tidak pernah menjadi sumber Pemasukan/Uang Bersih.
- Pengeluaran periode gabungan seperti `2026-01 s/d 2026-08` tidak dialokasikan ke bulan tertentu.
- HPP/profit hanya ditampilkan bila sumber HPP yang dibutuhkan tersedia.
- Produk lama memakai pemetaan nama produk yang eksplisit; transaksi baru mengutamakan `produk_id`.
- Seller Center sekarang preview dulu; pengguna harus menekan Simpan.
- Dedup Seller Center memakai signature stabil dan mengenali pola key legacy.
- Data Lama tidak lagi menjalankan seed pengeluaran otomatis ketika halaman dibuka.
- Data Lama Online memiliki importer terpisah untuk sumber online lama.
- `Uang Masuk` dari workbook legacy tidak dipakai otomatis sebagai potongan bulanan karena waktu uang masuk dapat berbeda dari periode penjualan.

## 4. Pengujian kode
- Syntax JavaScript seluruh halaman: PASS.
- Internal link antar halaman: PASS.
- Unit test helper rekap (Offline/Online, HPP, potongan, produk): PASS.
- Pengujian anti-double-count Seller Center dilakukan pada level signature: PASS.

## 5. Hal yang belum boleh diklaim selesai sebelum deployment
Versi file final ini belum dianggap live sampai file baru menggantikan file di GitHub Pages dan halaman live berhasil dimuat ulang. Setelah deployment, verifikasi live yang diperlukan hanya:
1. Penjualan → Offline: simpan satu transaksi uji dan cek Rekap.
2. Penjualan → Online: import satu file Income satu bulan dan cek Pemasukan/Potongan/Uang Bersih.
3. Rekap → pilih Januari dan bulan terbaru, lalu `👁 Lihat Data`.
4. Dashboard: pastikan Offline + Online tidak double count.

## Patch v6 — Import Historis Online
- File asli TikTok Income dideteksi dari header `ID Pesanan/Penyesuaian`, `Jenis transaksi`, `Jumlah penyelesaian pembayaran`, `Total Pendapatan`, `Total Biaya`.
- File Seller Center dideteksi dari `Order ID`, `Product Name`, `Quantity`, dan kolom harga/tanggal terkait.
- Workbook `Online Database (8).xlsx` didukung melalui sheet `Keluar Resi` dan `Uang Masuk`.
- Workbook `Familia-Food-Import-Online-SIAP.xlsx` didukung melalui sheet `Import Penjualan`.
- Beberapa file dapat dipilih sekaligus; `import_key` digunakan untuk melewati duplikat sebelum penyimpanan.
- Seller Center historis hanya menjadi detail produk/qty; sumber keuangan historis berasal dari Income/legacy finance.
- Data Lama sekarang memuat sumber Online historis ke daftar bulan dan detail, sementara Pengeluaran tetap berasal dari tabel `pengeluaran`.
- Tidak ada INSERT/UPDATE/DELETE Supabase yang dilakukan saat membuat paket ini.
