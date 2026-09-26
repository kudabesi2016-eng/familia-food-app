# Familia Food POS FINAL v8

Perbaikan Data Lama Online:
- File Income TikTok dan Pesanan/Seller Center sekarang dapat ditambahkan bertahap; memilih file berikutnya tidak menggantikan file sebelumnya.
- File yang dipilih ditampilkan beserta jenis sumber yang terdeteksi.
- Join Income + Pesanan memakai ID Pesanan yang dinormalisasi.
- Produk + Qty berasal dari Pesanan/Seller Center.
- Pemasukan + Uang Bersih berasal dari Income.
- Baris Income-only tidak lagi dipaksa menjadi Produk/Pesanan palsu; Produk dan Qty ditampilkan `—` sampai data Pesanan yang cocok tersedia.
- Seller Center dalam workbook yang punya beberapa sheet akan diproses dari semua sheet yang cocok, bukan berhenti di sheet pertama.
- Preview tetap menggunakan kolom: Sumber | Bulan | Produk | Qty | Pemasukan | Uang Bersih | Modal/HPP | Profit.
- Modal/HPP dan Profit hanya dihitung ketika HPP tersedia dari master.
