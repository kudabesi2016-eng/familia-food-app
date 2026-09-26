# Familia Food POS — FINAL 2 CHANNEL

## Data Lama Online
Masukkan file asli TikTok Income dan file Pesanan/Seller Center. Keduanya digabung berdasarkan **ID Pesanan**.

Tampilan preview:
**Sumber | Bulan | Produk | Qty | Pemasukan | Uang Bersih | Modal/HPP | Profit**

- Income TikTok = Pemasukan + Uang Bersih.
- Pesanan/Seller Center = Produk + Qty.
- Join keuangan = hanya ID Pesanan yang benar-benar cocok.
- Jika satu order berisi beberapa produk, Pemasukan/Uang Bersih dialokasikan berdasarkan proporsi omzet produk pada Seller Center.
- Modal/HPP Online = **Harga Online − Untung Online** dari master HPP, bila tersedia.
- `hpp_unit` hanya fallback bila HPP Online master belum tersedia.
- Alias produk Online hanya dipakai untuk pola Familia Food yang sudah eksplisit; produk yang tidak jelas tidak ditebak.
- Profit = Uang Bersih − Modal/HPP hanya jika HPP tersedia.
- File baru ditambahkan ke antrean, tidak menggantikan file sebelumnya.
- Tidak perlu membuat Excel perantara.
- Seller Center tidak dipakai sebagai sumber settlement keuangan.
- Preview bukan data baru sampai bro menekan **Simpan Data Lama Online**.

## Catatan
Paket ini berisi halaman aplikasi. File support yang sudah ada di repo (misalnya `supabase.js`, `app-settings.js`, `ff-core.js`) tetap digunakan dari instalasi aplikasi yang sudah ada.

## v14
- Data Lama Online now has per-month financial KPI summary and stronger HPP mapping fallback.
