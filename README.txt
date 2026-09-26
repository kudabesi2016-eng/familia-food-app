FAMILIA FOOD - FINAL DATA LAMA 2026-09-16

Perubahan utama:
- Data Lama: Bulan -> Ringkasan -> Konsumen -> Keluar per Produk -> Detail Transaksi.
- Mapping Supabase data_lama memakai kolom yang terverifikasi:
  periode, jenis, keterangan, nominal, catatan.
- PDF parser tetap menggunakan validasi 8 total bulanan yang sudah diverifikasi.
- Duplikat historis dilewati berdasarkan periode + konsumen + produk + qty + omzet.
- Tidak ada perubahan struktur tabel Supabase.

Upload:
Ganti file HTML di repository dengan isi paket ini. File supabase.js dan app-settings.js yang sudah ada di repository tetap digunakan.
