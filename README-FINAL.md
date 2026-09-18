# Familia Food POS — FINAL 2 Channel

Konsep final:
- 2 channel: **Offline** dan **Online**.
- Masing-masing channel menyambung dari **data lama Januari 2026** sampai transaksi baru.
- Offline lama tetap di tabel `data_lama`; transaksi kasir baru masuk `penjualan` dengan `channel='Offline'`.
- Online lama dan online baru masuk `penjualan` dengan `channel='Online'` melalui Income TikTok.
- Seller Center hanya menjadi detail produk/qty online dan tidak menjadi sumber Pemasukan/Uang Bersih.
- Rekap memakai tombol **👁 Lihat Data** untuk membuka rincian produk, qty, modal/HPP, profit, dan pengeluaran per kategori.
- Offline: Uang Bersih = Pemasukan - Pengeluaran.
- Online: Uang Bersih memakai settlement Income TikTok yang tersimpan; detail potongan ditampilkan dari selisih Pemasukan dan Uang Bersih.
- Profit tidak ditebak. Bila HPP/modal tidak lengkap, ditampilkan `—`.
- Import Income baru: **1 file = 1 bulan**. Mode Data Lama boleh multi-bulan.
- Import Income/Seller Center memakai `import_key` untuk mencegah duplikasi transaksi identik.

## Database yang dipakai
`produk`, `bahan_baku`, `resep`, `hpp`, `penjualan`, `data_lama`, `pengeluaran`, `pengaturan`.

Migration online yang sudah diterapkan sebelumnya tidak diulang oleh paket ini.

## Kondisi database yang dikonfirmasi sebelum build
- Produk: 10
- HPP: 10
- Data Lama: 311 baris
- Pengeluaran: 446 baris
- Penjualan: 2 baris (Offline 2, Online 0 saat pemeriksaan)

## Cara pasang
Salin seluruh isi folder ini ke root repository GitHub Pages `familia-food-app` dan pastikan file `supabase.js` berada satu folder dengan semua halaman HTML.

Tidak ada SQL write yang dijalankan oleh paket ini. Paket aplikasi hanya mengubah kode tampilan/alur; data Supabase tetap dipertahankan.
