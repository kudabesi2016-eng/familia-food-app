# Familia Food — AI Agent Architecture

## Tujuan
Agen AI bukan chatbot generik. Ia harus membaca angka Familia Food dari database yang sama dengan POS, Rekap, dan Dashboard.

## Alur
1. Android/Web membuka **Agen AI**.
2. Aplikasi membuat sesi Supabase Anonymous Auth secara transparan; tidak ada menu User/Hak Akses.
3. Pertanyaan dikirim ke Edge Function `familia-ai` dengan JWT sesi.
4. Edge Function membaca data melalui Supabase menggunakan publishable key + JWT pengguna.
5. Server membentuk **snapshot read-only**: periode, Offline, Online, HPP/modal, produk teratas, pembelian, pengeluaran, retur, supplier/pelanggan aktif, dan kualitas data.
6. Snapshot + pertanyaan diberikan ke OpenAI Responses API.
7. Jawaban dikembalikan ke aplikasi.
8. Tidak ada operasi INSERT/UPDATE/DELETE dari Agen AI pada tahap ini.

## Aturan bisnis yang dikunci
- Satuan qty: **bungkus**, bukan pcs.
- Histori Online Jan–Agustus 2026: **8.085 bungkus**.
- Online Baru sudah berupa **Uang Bersih setelah potongan**, sehingga potongan tidak dihitung dua kali.
- Profit hanya ditampilkan bila modal/HPP tersedia.
- Data Lama dan Data Baru tidak ditimpa atau digandakan.
- HPP Familia Food mengikuti master HPP yang sudah ada.
- Tidak menyentuh stok, pembayaran, mutasi stok, multi outlet, atau User/Hak Akses.

## Tahap berikutnya
Setelah mode read-only stabil, agen dapat diberi tool terkontrol seperti:
- `get_rekap_bulan`
- `get_produk_summary`
- `get_hpp_produk`
- `get_pengeluaran_bulan`
- `get_pembelian_supplier`
- `get_retur_bulan`

Tool tersebut tetap read-only. Aksi tulis hanya boleh dibuat pada tahap terpisah dengan konfirmasi eksplisit.

## Keamanan
OpenAI API key tetap server-side di Supabase Edge Function dan tidak masuk APK/browser. Sesi AI memakai Supabase Auth; Edge Function menolak request tanpa Bearer JWT.
