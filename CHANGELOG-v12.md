# Familia Food POS — v12

## Fix Data Lama Online

1. HPP Online sekarang dicari memakai **Produk + Variation + Seller SKU**, bukan hanya `Product Name`.
2. Varian ukuran dipisahkan secara eksplisit: 10 / 12 / 20 / 25 / 30 / 40 / 50 pcs.
3. Pola seperti `2 bungkus isi 24 pcs` dibaca sebagai **2 bungkus isi 12**, sehingga HPP tetap dihitung per bungkus dan tidak mencampur varian isi 12 dengan 20/25/30/40/50.
4. Listing TEMPURA ACI dengan `Variation=Default` dan nama yang jelas `isi 12` dipetakan ke master `Naget isi 12`.
5. Listing bentuk ESKRIM/KOTAK/STIK/BULAT/LIDAH/MIE/OPAL hanya fallback ke `Naget isi 12` ketika tidak ada ukuran lain yang disebutkan pada nama/variasi/SKU.
6. Rumus HPP Online **tidak diubah**: menggunakan master HPP yang sudah ada, dengan pola `Harga Online - Untung Online` bila tersedia dan fallback sesuai pola aplikasi sebelumnya.
7. Tidak mengubah struktur Data Lama, Penjualan, Produk, HPP, atau data Supabase.

## Alasan perubahan

Hasil uji menunjukkan `HPP Online terukur = 0` walaupun preview sudah mengenali beberapa listing Tempura Aci. Penyebab yang terlihat pada alur v11 adalah pemetaan HPP hanya membaca `Product Name`; padahal Seller Center menyimpan ukuran penting pada kolom `Variation`.
