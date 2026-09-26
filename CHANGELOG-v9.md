# Familia Food POS FINAL v9

Perbaikan lanjutan Data Lama Online berdasarkan uji v8:
- Pembacaan workbook Excel historis menggunakan nilai tampilan (`raw:false`) agar ID Pesanan panjang dibaca sebagai teks, bukan angka JavaScript yang berpotensi berubah presisi.
- Normalisasi ID Pesanan lebih aman: whitespace/non-breaking-space dan tanda kutip dibersihkan; akhiran `.0` dibuang bila muncul dari Excel.
- Baris yang sudah berhasil digabung `Income + Pesanan` ditempatkan lebih dulu di preview agar data gabungan terlihat terlebih dahulu.
- Kolom preview tetap: Sumber | Bulan | Produk | Qty | Pemasukan | Uang Bersih | Modal/HPP | Profit.
- Pemasukan + Uang Bersih tetap hanya berasal dari Income TikTok; Produk + Qty tetap dari Pesanan/Seller Center.
- Tidak menggunakan pencocokan berdasarkan nama produk/tanggal untuk mengisi angka keuangan, sehingga tidak menebak dan tidak berisiko menggandakan uang.
