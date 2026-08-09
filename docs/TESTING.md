# Pengujian Talenta Prestasi

## Gate Otomatis

Dari root repository:

```bash
npm run check:routes
npm run check:js
npm run check:theme
npm run test:category-events
npm run test:download-relations
npm run test:winner-relations
npm run test:archive-relations
npm run test:faq-relations
npm run test:admin-dialogs
npm run test:home-parity
npm run test:theme-browser
```

Dari `apps/backend`:

```bash
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

E2E memerlukan PostgreSQL writable dengan schema migration terbaru. Test membuat dan menghapus record uji; jangan arahkan ke database berisi data penting. Receipt aktual berada di `PROGRESS.md`.

## Persiapan Manual

- Jalankan migration dan seed sesuai `docs/OPERATIONS.md`.
- Hidupkan PostgreSQL, backend, frontend, dan gateway.
- Siapkan gambar valid di bawah 5 MB, PDF di bawah 10 MB, dan file negatif (terlalu besar/signature palsu).
- Pantau Console dan Network tanpa mencatat credential/JWT.

## Auth dan Sesi

- Login dengan akun seed; password/JWT tidak muncul di URL/log.
- Daftar kategori tampil sesuai membership.
- Pilih kategori lalu Event; refresh mempertahankan konteks sesi.
- Logout membersihkan JWT dan pilihan.
- Endpoint tanpa JWT merespons `401`; tenant lain mendapat `403`.

## Kategori dan Subdomain

- Buat kategori dengan nama dan slug lowercase yang valid.
- Slug invalid/duplikat ditolak.
- Editor/viewer tidak dapat melakukan tindakan administratif owner/admin.
- Publikasikan kategori; hostname dibuat pada kategori dan bootstrap publik tersedia jika ada Event aktif.
- Nonaktifkan kategori; route publik menjadi `404` tanpa menghapus konten Event.
- Hapus kategori uji melalui dialog konfirmasi.

## Event/Periode

- Buka kategori lalu buat dua Event.
- Pastikan keduanya memiliki `site_settings` dan slug unik dalam kategori.
- Aktifkan Event pertama, lalu Event kedua; hanya Event terakhir yang aktif.
- Event sebelumnya otomatis tampil sebagai Arsip tanpa menghubungkan sumber manual.
- Ubah nama/deskripsi Event; slug kategori tidak berubah.
- Hapus Event uji; Event hilang dari list aktif/arsip.

## Pengaturan dan Beranda

- Ubah warna, navigasi, kontak, footer, SEO, nama/deskripsi Event; simpan dan refresh.
- Pastikan perubahan hanya memengaruhi Event terpilih.
- Ubah Hero/section Beranda dan cocokkan preview dengan Public Site pada 1440px, 768px, dan 390px.
- Viewer tidak dapat menyimpan perubahan; editor dapat.

## FAQ

- Tambah kategori/pertanyaan, ubah urutan, simpan, dan refresh.
- Nonaktifkan item; Public Site tidak menampilkannya.
- Accordion berfungsi dengan pointer dan keyboard.
- Hapus item melalui dialog konfirmasi.

## Dokumen dan Unduh

- Tambah Event Document dan tab Unduh.
- Hanya satu tab default diizinkan.
- Dokumen Event lain tidak dapat direferensikan.
- Sembunyikan dokumen; record sumber tetap ada.
- PDF menggunakan `/api/v1/public/media/<asset-id>` dengan MIME dan header keamanan benar.

## Pemenang dan SK

- Tambah kategori pemenang dan pemenang lengkap; simpan/refresh.
- Nonaktifkan kategori/pemenang; data hilang dari Public Site.
- Upload foto dan PDF SK valid.
- SK direferensikan sebagai Event Document dan dapat muncul di Unduh tanpa file duplikat.
- Pemenang Sebelumnya hanya berasal dari Event arsip dalam kategori yang sama.

## Arsip Otomatis

- Siapkan satu Event aktif dan satu Event nonaktif pada kategori yang sama.
- `/public/sites/:categorySlug/archives` mengembalikan Event nonaktif.
- `/public/sites/:categorySlug/archives/:eventSlug` menampilkan detail Event arsip.
- URL browser Detail Arsip memakai `?event=...`, bukan `?id=` atau Competition slug.
- Ubah visibilitas kategori/dokumen pada Detail Arsip; simpan dan refresh.
- Event dari kategori lain tidak masuk list arsip.

## Media

- Upload gambar/PDF melalui `/admin/events/:eventId/media`.
- Viewer mendapat `403`; editor/owner/admin yang sesuai dapat upload.
- MIME, ukuran, dan signature palsu ditolak.
- URL publik hanya mengekspos UUID asset, bukan storage key/path.

## Persistensi dan Keamanan

- Setelah setiap perubahan, refresh Admin/Public Site dan login ulang untuk membuktikan PostgreSQL sebagai sumber data.
- Field DTO asing ditolak.
- Hanya satu Event aktif per kategori dapat dibuat, termasuk pada akses bersamaan/SQL langsung.
- Event suspended tidak dipilih resolver publik.
- UI/API tidak membocorkan password/hash, JWT, credential database, atau path filesystem.

## Responsivitas dan Aksesibilitas

Uji seluruh halaman Public Site serta editor Admin pada 1440px, 768px, dan 390px:

- tidak ada overlap atau horizontal scroll tidak sengaja;
- form, card, preview, header, dan navigasi dapat digunakan;
- fokus keyboard terlihat dan urutan Tab logis;
- dialog dapat digunakan dengan Enter, Space, dan Escape;
- preview Admin mempertahankan tema/markup Public Site.

## Gateway

Verifikasi `/`, `/unduh/`, `/pemenang/`, `/arsip/`, `/arsip/detail/`, dan `/faq/`. Gateway harus meneruskan `/api/`, tetapi mengembalikan `404` untuk `/apps/admin/`, `/README.md`, dan file repository lain.

## Format Laporan Bug

```markdown
### [Modul] Ringkasan masalah

- Route/modul:
- URL:
- Prasyarat/data uji:
- Langkah reproduksi:
- Hasil yang diharapkan:
- Hasil aktual:
- Status HTTP/endpoint:
- Evidence:
- Browser/OS/viewport:
- Severity:
```

Jangan mengubah failure menjadi lulus tanpa evidence.
