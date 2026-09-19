# Familia Food POS FINAL v10

Perbaikan Data Lama Online setelah pemeriksaan menyeluruh v9:

- HPP Online sekarang mengikuti pola master HPP Familia Food: **Harga Online − Untung Online** jika data master online tersedia.
- `hpp_unit` hanya menjadi fallback ketika nilai HPP Online master tidak tersedia; tidak lagi diprioritaskan sebagai HPP Online.
- Master Produk/HPP dibaca langsung dari tabel `produk` dan `hpp` dengan field `harga_online` dan `untung_online`.
- Pencocokan produk Online memakai nama exact terlebih dahulu, lalu **alias eksplisit** untuk pola produk Familia Food yang sudah dikenal, terutama varian `Tempura Aci isi 12` (Eskrim/Kotak/Stik/Bulat/Lidah/Mie/Opal) → `Naget isi 12`. Produk lain yang tidak jelas tidak ditebak.
- Penggabungan Income + Seller Center tetap hanya berdasarkan **ID Pesanan**; tidak menggunakan nama/tanggal sebagai sumber angka keuangan.
- Satu order dengan beberapa produk membagi Pemasukan/Uang Bersih secara proporsional berdasarkan omzet produk dari Seller Center, sehingga total alokasi tetap sama dengan nilai Income order.
- Grup produk tidak lagi memisahkan baris hanya karena bulan, sehingga ID Pesanan yang sama tetap satu order walaupun tanggal tampilan berbeda.
- Ringkasan import sekarang menampilkan jumlah **order cocok**, jumlah **baris produk cocok**, dan jumlah **baris dengan HPP Online terukur**.
- Jika master Produk/HPP gagal dibaca, proses preview berhenti dengan pesan error yang jelas, tidak diam-diam menampilkan HPP kosong.
- Kolom preview tetap persis: **Sumber | Bulan | Produk | Qty | Pemasukan | Uang Bersih | Modal/HPP | Profit**.

Tidak ada perubahan pada struktur Offline, pola HPP yang sudah disepakati, atau sumber data keuangan Income TikTok.


## v11 hotfix — 2026-09-19
- Fixed Data Lama Online Supabase master query: removed nonexistent `produk.hpp_offline` column.
- Master Produk now reads only `id,nama_produk,harga_online`.
- Master HPP continues to read `produk_id,hpp_unit,untung_online,harga_online`.
- No changes to HPP calculation pattern or historical data.
