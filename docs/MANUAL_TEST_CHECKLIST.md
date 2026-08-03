# Checklist Pengujian Manual Talenta Prestasi

Dokumen ini dipakai untuk menguji integrasi aplikasi sebelum demonstrasi.

> **Status integrasi:** seluruh modul frontend yang tersedia sudah terhubung ke backend NestJS dan PostgreSQL. Media disimpan sebagai file nyata di filesystem backend, sementara metadata dan referensinya disimpan di PostgreSQL. Pengujian otomatis sudah lulus; checklist browser ini memverifikasi alur nyata pada perangkat Anda.

## 1. Persiapan

- [ ] PostgreSQL aktif dan database `talenta_prestasi` dapat diakses.
- [ ] Dari `apps/backend`, jalankan `npm run start:dev`.
- [ ] Backend tidak menampilkan error dan tersedia di `http://localhost:3000/api/v1`.
- [ ] Dari root repository, jalankan `npm run dev`.
- [ ] Buka alamat frontend dari terminal, biasanya `http://localhost:4173`.
- [ ] Siapkan gambar PNG/JPG/WebP kurang dari 2 MB.
- [ ] Siapkan PDF kurang dari 10 MB.
- [ ] Buka Developer Tools → Console dan Network → Fetch/XHR.

> Jangan memakai data penting saat pertama menguji tombol hapus. Gunakan record uji.

## 2. Login dan sesi Admin

- [ ] Buka halaman Admin dan login dengan akun hasil seed.
- [ ] Dashboard Admin tampil tanpa error.
- [ ] Request login sukses (`200`/`201`).
- [ ] Password dan token tidak terlihat pada URL.
- [ ] Refresh halaman; sesi masih dapat digunakan.
- [ ] Logout berhasil dan editor tidak dapat dipakai tanpa login ulang.
- [ ] Login kembali untuk melanjutkan pengujian.

## 3. Pengaturan Global dan logo

- [ ] Nama event, penyelenggara, warna, navigasi, kontak, dan footer dimuat dari API.
- [ ] Ubah satu teks kecil, simpan, lalu refresh; perubahan tetap ada.
- [ ] Upload logo yang valid; preview langsung berubah.
- [ ] Simpan dan refresh Admin; logo tetap tampil.
- [ ] Buka halaman publik; logo tampil pada header/footer.
- [ ] Network menunjukkan URL `/api/v1/public/media/<asset-id>`.
- [ ] URL logo bukan `data:image/...`.

## 4. Beranda

- [ ] Hero, jadwal, biaya, benefit, highlight pemenang, dan mitra dimuat.
- [ ] Ubah judul/deskripsi Hero, simpan, dan refresh; perubahan tetap ada.
- [ ] Beranda publik menampilkan perubahan tersebut.
- [ ] Toggle satu section, simpan, dan periksa visibilitasnya di publik.
- [ ] Upload ikon kustom; preview Admin tampil.
- [ ] Simpan dan refresh; ikon tetap ada dan tampil di publik.
- [ ] URL ikon memakai endpoint public media, bukan Data URL.
- [ ] Tombol Hero menuju route/URL yang benar.

## 5. FAQ

- [ ] Kategori dan pertanyaan dimuat dari backend.
- [ ] Tambah kategori/pertanyaan uji lalu simpan.
- [ ] Refresh; record tetap ada.
- [ ] Ubah jawaban dan simpan; perubahan tetap ada.
- [ ] Nonaktifkan item; item tidak tampil di publik.
- [ ] FAQ publik dapat dibuka/ditutup sebagai accordion.
- [ ] Hapus record uji melalui dialog konfirmasi UI.
- [ ] Refresh; record yang dihapus tidak kembali.

## 6. Pemenang dan foto

- [ ] Kategori dan daftar pemenang dimuat dari backend.
- [ ] Tambah pemenang uji dengan data lengkap.
- [ ] Upload foto kurang dari 2 MB; preview tampil.
- [ ] Simpan dan refresh; data serta foto tetap tampil.
- [ ] Halaman Pemenang publik menampilkan data dan foto.
- [ ] URL foto memakai `/api/v1/public/media/<asset-id>`.
- [ ] Ubah satu field dan simpan; hasil muncul setelah refresh.
- [ ] Nonaktifkan pemenang; data tidak muncul di publik.
- [ ] Aktifkan kembali atau hapus record uji setelah selesai.

## 7. Arsip, Detail Arsip, dan maskot

- [ ] Competition arsip dimuat dari backend.
- [ ] Ubah nama pendek/deskripsi lalu simpan dan refresh.
- [ ] Upload maskot/logo Competition; preview tampil.
- [ ] Simpan dan refresh; maskot tetap ada.
- [ ] Arsip publik menampilkan Competition dan maskot.
- [ ] URL maskot memakai endpoint public media.
- [ ] Detail Arsip menampilkan informasi Competition yang benar.
- [ ] Kategori, pemenang, dan dokumen sesuai Competition terkait.
- [ ] Toggle visibilitas kategori/dokumen tetap berlaku setelah refresh.

## 8. PDF dan halaman Unduh

- [ ] Buka Detail Arsip yang mempunyai record dokumen.
- [ ] Klik **Upload PDF** atau **Ganti PDF**.
- [ ] Pilih PDF kurang dari 10 MB; notifikasi sukses tampil.
- [ ] Simpan konfigurasi bila diperlukan.
- [ ] Refresh; dokumen tetap menunjukkan file tersedia.
- [ ] Halaman Unduh publik menampilkan Competition dan dokumen pada tab benar.
- [ ] Klik dokumen; PDF nyata dapat dibuka/diunduh.
- [ ] URL PDF memakai `/api/v1/public/media/<asset-id>`.
- [ ] Response memakai `Content-Type: application/pdf`.
- [ ] Response memiliki `X-Content-Type-Options: nosniff`.
- [ ] Ubah label dokumen, simpan, dan periksa hasil publik.
- [ ] Sembunyikan dokumen; dokumen tidak tampil di publik.

## 9. Bukti persistensi backend/PostgreSQL

- [ ] Tutup tab aplikasi dan buka kembali tanpa membersihkan database.
- [ ] Login kembali; seluruh perubahan tetap ada.
- [ ] Buka halaman publik melalui Incognito/Private Window.
- [ ] Konten yang sama tetap tampil pada browser tanpa data lama.
- [ ] File upload tersedia di `apps/backend/storage/uploads/`.
- [ ] Path fisik/storage key tidak terlihat pada response frontend.
- [ ] Konten publik tidak bergantung pada `localStorage` browser.

**Hasil yang diharapkan:** browser baru memperoleh konten dari API/PostgreSQL.

## 10. Validasi file dan keamanan dasar

- [ ] Gambar lebih dari 2 MB ditolak.
- [ ] PDF lebih dari 10 MB ditolak.
- [ ] Tipe file yang tidak didukung ditolak.
- [ ] File teks yang hanya diganti ekstensi menjadi `.png` tetap ditolak.
- [ ] Endpoint Admin tanpa login menghasilkan `401`.
- [ ] Role Viewer tidak dapat mengubah/upload (`403`) bila akun uji tersedia.
- [ ] UI/response tidak membocorkan stack trace, password, JWT, atau path filesystem.
- [ ] Console tidak memiliki error merah yang relevan.
- [ ] Network tidak memiliki request API berstatus `500`.

> Media publik saat ini menggunakan UUID opaque dan cocok untuk situs publik/demo satu instance lokal. Object storage baru diperlukan ketika deployment multi-instance/cloud dipilih.

## 11. Responsivitas dan aksesibilitas dasar

Uji Beranda, Unduh, Pemenang, Arsip, Detail Arsip, FAQ, dan editor utama Admin.

### Desktop — sekitar 1440 px

- [ ] Tidak ada elemen terpotong atau horizontal scroll.
- [ ] Navigasi, card, daftar, dialog, dan preview tersusun benar.

### Tablet — sekitar 768 px

- [ ] Layout menyesuaikan tanpa tumpang tindih.
- [ ] Tombol dan form tetap dapat digunakan.

### Mobile — sekitar 390 px

- [ ] Tidak ada horizontal scroll yang tidak disengaja.
- [ ] Header/bottom navigation tampil benar.
- [ ] Teks dapat dibaca dan tombol mudah ditekan.
- [ ] Gambar mempertahankan rasio dan tidak keluar container.

### Keyboard

- [ ] Urutan navigasi `Tab` logis.
- [ ] Focus indicator terlihat.
- [ ] Tombol dan dialog dapat digunakan tanpa mouse.
- [ ] Gambar konten memiliki teks alternatif yang sesuai.

## 12. Alur demonstrasi singkat

- [ ] Tampilkan Beranda publik.
- [ ] Login Admin.
- [ ] Ubah satu teks Beranda dan simpan.
- [ ] Upload satu gambar/foto/logo dan simpan.
- [ ] Upload atau ganti satu PDF.
- [ ] Refresh Admin untuk membuktikan persistensi.
- [ ] Buka halaman publik untuk menunjukkan perubahan.
- [ ] Buka Incognito untuk membuktikan data bukan dari browser lama.
- [ ] Klik PDF publik untuk membuktikan delivery file backend.
- [ ] Tampilkan tampilan mobile melalui device toolbar.

## 13. Rekap hasil

| Area                    | Status | Catatan |
| ----------------------- | ------ | ------- |
| Server frontend/backend | ⬜     |         |
| Login dan sesi          | ⬜     |         |
| Pengaturan Global       | ⬜     |         |
| Beranda                 | ⬜     |         |
| FAQ                     | ⬜     |         |
| Pemenang                | ⬜     |         |
| Arsip dan Detail Arsip  | ⬜     |         |
| PDF dan Unduh           | ⬜     |         |
| Persistensi PostgreSQL  | ⬜     |         |
| Media filesystem lokal  | ⬜     |         |
| Keamanan dasar          | ⬜     |         |
| Desktop/tablet/mobile   | ⬜     |         |
| Console dan Network     | ⬜     |         |

Gunakan status `✅ Lulus`, `❌ Gagal`, atau `⚠️ Perlu diperiksa`.

## 14. Format laporan bug

```markdown
### Judul masalah

- Halaman:
- Waktu pengujian:
- Perangkat/ukuran layar:
- Langkah reproduksi: 1. 2. 3.
- Hasil aktual:
- Hasil yang diharapkan:
- Status HTTP/API terkait:
- Pesan Console:
- Screenshot:
```
