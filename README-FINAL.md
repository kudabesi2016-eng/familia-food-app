# Familia Food POS — FINAL 2 CHANNEL

## Konsep terkunci
- POS hanya memiliki 2 channel: **Offline** dan **Online**.
- Offline: **Data Lama + transaksi kasir baru**.
- Online: **Data Lama + transaksi online baru**.
- Rekap dan Dashboard tidak mengganti data lama ketika data baru masuk.
- Detail dibuka dengan **👁 Lihat Data**.
- Offline: pengeluaran dibaca per periode dan kategori.
- Online: Income TikTok menjadi sumber utama Pemasukan, Potongan, dan Uang Bersih. Seller Center hanya detail produk/qty.
- Rumus uang bersih online: **Pemasukan − Potongan = Uang Bersih**.
- Profit hanya ditampilkan jika HPP/modal yang diperlukan tersedia; tidak menebak.

## Perbaikan final
1. `ff-core.js` menjadi helper bersama untuk pemetaan produk, HPP, channel, periode, dan rekap.
2. Rekap tidak lagi menjumlahkan pengeluaran periode gabungan Jan–Agustus ke satu bulan.
3. Online tidak mengambil Pemasukan dari Seller Center.
4. Produk transaksi baru memakai `produk_id`/master produk terlebih dahulu; tidak lagi tampil `-` jika master tersedia.
5. Seller Center tidak otomatis menyimpan saat file dipilih; harus melalui preview lalu tombol Simpan.
6. Dedup seller menggunakan signature stabil Order ID + SKU + variasi + produk + tanggal dan mencoba mengenali signature legacy.
7. Data Lama tidak lagi otomatis menulis seed pengeluaran setiap halaman dibuka.
8. Data lama Offline tidak lagi mencampur transaksi Online.
9. Import Data Lama Online mendukung:
   - `Familia-Food-Import-Online-SIAP.xlsx` (sheet **Import Penjualan**).
   - `Online Database (8).xlsx` (sheet **Keluar Resi + Uang Masuk**).
10. Untuk workbook legacy `Online Database (8).xlsx`, **Uang Masuk** disimpan sebagai historis cash terpisah dan tidak dipakai otomatis sebagai potongan TikTok bulanan karena tanggal uang masuk dapat berbeda dari tanggal penjualan.

## Pengujian yang dilakukan
- Syntax check seluruh JavaScript halaman: **lulus**.
- Unit test helper rekap: **lulus**.
- Test pemisahan Offline/Online: **lulus**.
- Test deduksi `Pemasukan − Potongan = Uang Bersih`: **lulus**.
- Test bahwa Seller Center tidak menambah Pemasukan/Uang Bersih: **lulus**.
- Struktur Supabase live sebelumnya sudah diverifikasi dari hasil SQL/screenshots yang diberikan: tabel inti dan index import online tersedia.

## Catatan live
Belum ada klaim bahwa versi final ini sudah ter-deploy ke GitHub Pages. Setelah file diganti di repo, lakukan refresh halaman dan uji satu kali pada **Penjualan → Rekap → Dashboard**.

`AUDIT-FINAL-READONLY.sql` hanya berisi SELECT dan bisa dijalankan di Supabase SQL Editor untuk audit pasca-deploy/import.

## Patch v6
- Import historis Online tidak lagi bergantung pada nama file tertentu.
- Deteksi berdasarkan struktur header/sheet.
- TikTok Income asli dibaca dari sheet `Detail pesanan`.
- Seller Center asli dibaca sebagai detail produk/qty dan tidak dihitung sebagai settlement keuangan.
- Beberapa file historis dapat dipilih sekaligus.
- `Familia-Food-Import-Online-SIAP.xlsx` dan `Online Database (8).xlsx` tetap kompatibel.
- Halaman Data Lama sekarang juga memuat transaksi Online historis ke ringkasan dan detail bulanan tanpa menggandakan Pemasukan dari Seller Center.
- Tidak ada perubahan struktur/isi Supabase oleh patch ini.
