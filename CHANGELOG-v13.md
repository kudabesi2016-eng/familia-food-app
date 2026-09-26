# Familia Food POS — v13

## Perubahan Data Lama Online
- Preview Online sekarang **dipisahkan per bulan** menggunakan tab bulan.
- Januari, Februari, Maret, dan seterusnya tidak lagi ditampilkan dalam satu tabel panjang.
- Setiap tab hanya menampilkan tabel untuk bulan yang dipilih.
- Urutan bulan kronologis; bila tersedia, tampilan awal langsung Januari 2026.
- Kolom tetap: Sumber | Bulan | Produk | Qty | Pemasukan | Uang Bersih | Modal/HPP | Profit.
- Seluruh baris tetap disimpan dalam `onlineOldImportRows`; pemisahan hanya pada tampilan preview dan tidak mengubah pola simpan/deduplikasi.
- Tidak mengubah rumus HPP Online, struktur Supabase, data lama Offline, atau pola satuan bungkus.
