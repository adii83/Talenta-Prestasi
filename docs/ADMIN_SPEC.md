# Spesifikasi CMS Admin Talenta Prestasi

## Tujuan dan Scope

CMS Admin mengelola kategori lomba, Event/periode, konten Public Site, dokumen, pemenang, arsip otomatis, FAQ, dan media melalui REST API. Public Site tetap menjadi visual baseline; Admin bukan page builder bebas.

## Login dan Sesi

- Pengguna login dengan email/kata sandi; JWT disimpan pada `sessionStorage` dan dihapus saat logout atau respons `401`.
- `/api/v1/admin/session` mengembalikan Organization dan kategori yang dapat diakses.
- Kategori dan Event terpilih disimpan sebagai konteks sesi browser; konten tetap berasal dari API/PostgreSQL.
- Editor tidak dapat digunakan tanpa sesi autentikasi valid dan Event terpilih.

## Flow Navigasi

```text
Login → Daftar Kategori → Daftar Event/Periode → Editor Event
```

### Daftar Kategori

Kartu kategori menampilkan nama, slug/subdomain, status publikasi, dan Event aktif. Tindakan:

- buat kategori dengan nama dan slug valid;
- kelola daftar Event;
- publikasikan/nonaktifkan kategori;
- hapus kategori melalui konfirmasi.

Slug kategori ditentukan saat pembuatan, unik per Organization, dan tidak diedit melalui Pengaturan Event.

### Daftar Event

Event dibuat di dalam kategori dengan nama ajang read-only, tahun eksplisit, dan batch/gelombang opsional. Backend mengalokasikan nomor batch serta slug teknis. Dashboard menonjolkan satu Event aktif dan menampilkan Event lain sebagai Persiapan atau Arsip, lengkap dengan badge operasional, workspace, dan publikasi. Tindakan:

- buat Event tahunan atau batch baru;
- jadikan Event aktif;
- kelola editor Event;
- hapus Event melalui konfirmasi.

Aktivasi satu Event otomatis menonaktifkan Event aktif sebelumnya dalam kategori. Event nonaktif menjadi arsip otomatis. Jika kategori sudah published, Event baru hanya dapat diaktifkan setelah memiliki snapshot publik.

## Draf, Preview, dan Publikasi Event

Setiap Event memiliki satu workspace draf untuk seluruh modul. Menekan **Simpan draf** tidak mengubah versi yang dilihat pengunjung, termasuk ketika Admin sedang mengedit Event aktif.

Tindakan utama:

- **Urungkan edit** memuat ulang modul aktif dari workspace terakhir yang tersimpan tanpa menulis database atau memulihkan template;
- **Lihat preview** membuka Public Site asli dengan token read-only 15 menit;
- **Simpan draf** menyimpan perubahan workspace ke PostgreSQL;
- **Publikasikan perubahan** mengganti seluruh snapshot publik Event secara atomik;
- **Batalkan draf** mengembalikan workspace ke snapshot terakhir dan dinonaktifkan untuk Event yang belum pernah dipublikasikan.

Preview dapat menampilkan kategori unpublished serta Event nonaktif/suspended yang dipilih Admin, tetapi tetap menolak soft delete, lintas tenant, dan token kedaluwarsa. Tautan **Lihat halaman** pada editor Detail Arsip meminta token milik Event Arsip yang sedang diedit agar nama, ikon, serta media workspace Event tersebut tampil tanpa memakai scope Event aktif. Pengunjung umum tetap memerlukan kategori published, Event aktif/operasional, dan snapshot publik. Publish/unpublish kategori tidak digunakan untuk setiap edit.

## Role dan Tenant

Membership mengikat pengguna ke Organization dengan role `owner`, `admin`, `editor`, atau `viewer`.

- `owner`/`admin`: tindakan administratif kategori dan Event.
- `owner`/`admin`/`editor`: mutasi konten dan media Event.
- `viewer`: baca saja.
- Backend memverifikasi membership/ownership pada setiap operasi; UI bukan lapisan keamanan.

## Pengaturan Event

Pengaturan Event mencakup:

- nama/deskripsi Event, maskot, fallback icon, dan warna;
- logo Event yang terpisah dari maskot serta logo/favicon Kategori legacy;
- satu ukuran logo navbar 24–44 piksel, default 36 piksel, untuk desktop, tablet, dan mobile;
- navigasi, kontak, footer, dan SEO;
- settings visual yang berlaku khusus pada periode tersebut.

Logo yang diunggah direkomendasikan berasio 1:1 dengan background transparan. Format yang diterima untuk logo adalah PNG, JPG/JPEG, atau WebP maksimal 5 MB. File disimpan apa adanya; CMS tidak menyediakan remove-background atau pemrosesan gambar otomatis. Asset logo yang sama dipakai sebagai favicon Event.

Slug/subdomain dan identitas penyelenggara berada pada kategori, bukan form Pengaturan Event.

## Beranda

Editor Beranda mengelola section terstruktur:

1. Hero;
2. Highlight Pemenang;
3. Jadwal Penting;
4. Biaya Pendaftaran;
5. Benefit;
6. Mitra/Partner.

Section memiliki status aktif dan urutan. Preview Admin memakai markup/tema Public Site yang sama pada desktop, tablet, dan mobile.

## Unduh dan Dokumen

Dokumen dimiliki Event (`event_documents`). Editor Unduh mengatur tab Event (`download_tabs`) serta visibilitas, label, dan urutan referensi dokumen.

- Satu tab dapat menjadi default.
- Menyembunyikan referensi tidak menghapus dokumen sumber.
- Tab Unduh dapat mereferensikan dokumen dari Event lain dalam Kategori Lomba yang sama; dokumen lintas kategori atau tenant ditolak backend.
- PDF disajikan melalui endpoint public media.

## Pemenang dan SK

Kategori pemenang dan pemenang dimiliki Event. Data pemenang mencakup peringkat, nama, sekolah, nomor ujian, kabupaten, provinsi, foto, status, dan urutan. Tidak ada impor Excel.

SK Pemenang adalah Event Document yang direferensikan oleh `event_detail_settings`; upload PDF maksimal 10 MB. Dokumen yang sama dapat ditampilkan pada Unduh tanpa menggandakan file.

Bagian **Pemenang Sebelumnya** membaca Event nonaktif dalam kategori yang sama sesuai pengaturan halaman.

## Arsip dan Detail Arsip

Arsip dibentuk otomatis dari semua Event nonaktif yang belum dihapus dalam kategori terpilih. Tidak ada tombol atau tabel sumber arsip manual.

- List arsip menggunakan slug Event.
- URL detail browser memakai `?event=<event-slug>`.
- Detail dapat mengatur heading, metadata, visibilitas kategori/pemenang/dokumen, maskot, dan SK.
- Data tidak disalin; setiap record tetap dimiliki Event arsipnya.
- Event dari kategori/tenant lain tidak dapat direferensikan.

## FAQ

Editor FAQ mengelola aggregate kategori dan pertanyaan per Event: tambah, ubah, urutkan, aktif/nonaktifkan, dan hapus. Item nonaktif tidak tampil pada Public Site.

## Media

Upload Admin menggunakan `/api/v1/admin/events/:eventId/media` dan menerima:

- PNG, JPEG, WebP, SVG maksimal 5 MB;
- PDF maksimal 10 MB.

Backend memeriksa MIME, ukuran, signature file, pola SVG berbahaya dasar, dan ownership Organization. Logo hanya dapat mereferensikan asset PNG, JPEG, atau WebP aktif milik Organization Event.

Preview logo pada editor tidak memasang URL publik langsung. Browser membaca `GET /api/v1/admin/events/:eventId/media/:assetId` menggunakan JWT, menerima Blob, lalu membuat Object URL lokal. Endpoint memverifikasi tenant/Event. Object URL tidak pernah masuk `localStorage`; cache hanya menyimpan ID asset. Website publik dan **Lihat preview** tetap memakai `/api/v1/public/media/<asset-id>` dengan kebijakan allowlist snapshot publik atau token preview.

## Dialog dan Aksesibilitas

- Tindakan destruktif/publikasi memakai dialog UI bersama, bukan `window.confirm/alert/prompt`.
- Dialog memiliki label, tombol batal, fokus keyboard, dan tindakan jelas.
- Form menampilkan error API tanpa membocorkan JWT, password, stack trace, atau path filesystem.

## Error

- `400`: input tidak valid/field asing.
- `401`: sesi tidak valid; autentikasi lokal diakhiri.
- `403`: role/tenant tidak mengizinkan akses.
- `404`: resource tidak tersedia, tidak aktif, terhapus, atau di luar kontrak publik.
- Konflik slug/constraint ditampilkan tanpa menimpa data diam-diam.

## Kontrak Validasi

Perubahan CMS diverifikasi melalui build/unit/E2E backend, audit Category→Event dan relasi modul, audit dialog, browser parity, serta checklist `docs/TESTING.md`. Receipt hasil terakhir berada di `PROGRESS.md`.
