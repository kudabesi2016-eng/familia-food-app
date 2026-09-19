# Familia Food POS FINAL v14

## Perbaikan Data Lama Online
- Setiap bulan tetap tampil sebagai tabel/section terpisah.
- Ditambahkan Ringkasan Bulanan untuk: Pemasukan, Uang Bersih, Modal/HPP, Profit, dan Qty produk.
- Pemasukan dan Uang Bersih dihitung dari Income TikTok yang benar-benar terbaca pada bulan tersebut.
- Modal/HPP diperbaiki agar mencari `hpp_unit` berdasarkan `produk_id`, nama master produk, dan alias produk Tempura/Naget yang eksplisit.
- Profit hanya dihitung bila Uang Bersih dan Modal/HPP keduanya tersedia.
- Tidak mengubah struktur database atau pola HPP.
- Detail yang tidak punya pasangan Income/HPP tetap ditampilkan `—` dan tidak ditebak.
