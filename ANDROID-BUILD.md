# Familia Food Android

Aplikasi web Familia Food dibungkus menjadi Android menggunakan Capacitor 8.

## Identitas
- Nama aplikasi: Familia Food
- Application ID: com.familiafood.pos
- Backend: Supabase yang sama dengan versi web
- Data dan struktur modul web tidak diubah.

## Build APK
GitHub Actions akan membuat APK Debug pada workflow **Build Familia Food Android APK**.

Artifact yang dihasilkan:
- familia-food-debug-apk
- app-debug.apk

Build dipicu otomatis saat file aplikasi utama berubah, atau bisa dijalankan manual melalui **Actions → Build Familia Food Android APK → Run workflow**.

## Catatan
Versi Android pertama ini mempertahankan UI dan logika web Familia Food. Tidak ada perubahan pada HPP, Data Lama, Penjualan, atau Rekap.
