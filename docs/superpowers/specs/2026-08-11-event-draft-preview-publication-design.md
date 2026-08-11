# Desain Draf, Preview Aman, dan Publikasi Event

## Tujuan

Menyediakan satu draf terpadu untuk seluruh Event sehingga Admin dapat mengubah Beranda, Pengaturan, Unduh, FAQ, Pemenang, Arsip, dokumen, dan media tanpa langsung mengubah website yang dilihat pengunjung.

Admin dapat melihat draf menggunakan Public Site asli melalui akses preview sementara. Pengunjung hanya melihat versi Event yang terakhir dipublikasikan.

## Prinsip Utama

- Admin tidak perlu melakukan unpublish ketika mengedit Event aktif.
- Satu Event memiliki satu workspace/draf terpadu untuk seluruh modul.
- Tabel konten Event yang sudah ada tetap menjadi workspace yang diedit Admin.
- Versi publik disimpan sebagai snapshot Event yang konsisten dan tidak ikut berubah ketika Admin menyimpan draf berikutnya.
- Preview aman membaca workspace/draf melalui Public Site asli.
- Publish mengganti seluruh versi publik Event secara atomik.
- Publish kategori dan aktivasi Event tetap menjadi tindakan terpisah.

## Status dan Istilah

### Status kategori

- `draft` atau `unpublished`: website kategori tidak tersedia bagi pengunjung umum.
- `published`: kategori dapat tersedia jika memiliki Event aktif dengan snapshot publik yang valid.

### Status Event

- **Aktif**: Event yang dipilih sebagai periode utama kategori.
- **Nonaktif**: Event persiapan atau Event arsip.
- **Draf bersih**: workspace Admin sama dengan snapshot publik terakhir.
- **Draf berubah**: workspace Admin memiliki perubahan yang belum dipublikasikan.
- **Belum pernah dipublikasikan**: Event belum memiliki snapshot publik.

Aktivasi tidak berarti memublikasikan isi draf. Publikasi isi Event tidak berarti mengaktifkan Event.

## Model Penyimpanan

### Workspace/draf

Entity dan tabel Event yang sudah ada tetap menjadi sumber data editor Admin. Semua endpoint simpan Admin menulis ke tabel normal tersebut.

Workspace mencakup seluruh aggregate Event:

- identitas dan pengaturan visual Event;
- navigasi, kontak, footer, dan SEO;
- Beranda dan item section;
- FAQ;
- tab Unduh, dokumen, dan pengaturannya;
- kategori pemenang, pemenang, dan SK;
- pengaturan Arsip serta Detail Arsip;
- referensi media yang digunakan oleh semua modul.

### Snapshot publik

Tambahkan penyimpanan snapshot publik pada level Event. Satu snapshot berisi DTO lengkap yang dibutuhkan semua endpoint Public Site, metadata versi, waktu publikasi, dan pengguna yang memublikasikan.

Struktur konseptual:

```text
event_publications
- event_site_id (unik untuk snapshot aktif)
- organization_id
- category_id
- version
- snapshot (JSONB)
- source_event_version
- published_at
- published_by
```

Snapshot dibuat dari workspace melalui satu transaksi. Public Site normal membaca snapshot, bukan tabel workspace.

Snapshot hanya memuat data milik Event tersebut. Daftar Arsip publik dibentuk dinamis dari Event nonaktif dalam kategori yang sama yang sudah memiliki snapshot publik. Detail Arsip membaca snapshot milik Event arsip, bukan workspace/draf Event tersebut. Dengan demikian aktivasi Event tidak memerlukan penyalinan data arsip dan draf Event lama tidak bocor ke publik.

JSONB dipilih untuk snapshot karena:

- kontrak Public Site sudah berbentuk DTO terstruktur;
- snapshot harus konsisten lintas banyak tabel;
- tidak perlu menggandakan semua tabel konten;
- publikasi dapat mengganti satu aggregate secara atomik;
- editor Admin tetap memakai model relasional dan validasi yang sudah ada.

Schema snapshot memiliki versi eksplisit agar perubahan kontrak berikutnya dapat dimigrasikan atau dibangun ulang dengan aman.

### Media publik

Saat publish, backend mengumpulkan seluruh asset ID yang direferensikan snapshot dan menyimpan relasi publikasi–media. Endpoint media publik hanya melayani asset yang:

- direferensikan snapshot publik yang valid; atau
- direferensikan workspace Event yang cocok dengan token preview valid.

Asset draf tidak boleh menjadi publik hanya karena UUID-nya diketahui. Membatalkan draf tidak boleh menghapus asset yang masih direferensikan snapshot publik.

## Alur Admin

### Mengedit Event aktif

1. Kategori dan Event tetap online menggunakan snapshot publik terakhir.
2. Admin mengubah satu atau beberapa modul.
3. Admin menekan **Simpan draf**.
4. Workspace tersimpan, tetapi snapshot publik tidak berubah.
5. Indikator editor berubah menjadi **Ada perubahan draf**.
6. Admin menekan **Lihat preview** untuk membuka Public Site asli dengan workspace terbaru.
7. Setelah yakin, Admin menekan **Publikasikan perubahan**.
8. Backend memvalidasi dan membangun snapshot baru dalam satu transaksi.
9. Setelah transaksi berhasil, pengunjung mendapat versi baru.

Jika publish gagal, snapshot lama tetap tayang dan draf tetap tersimpan.

### Menyiapkan Event baru

1. Admin membuat Event baru; Event belum memiliki snapshot publik.
2. Admin mengisi dan menyimpan workspace.
3. Admin memeriksa seluruh halaman melalui preview aman.
4. Admin memublikasikan isi Event sehingga snapshot publik pertama terbentuk.
5. Admin menjadikan Event tersebut aktif.
6. Event aktif sebelumnya menjadi arsip otomatis.

Event baru tidak dapat diaktifkan pada kategori published sebelum memiliki snapshot publik yang valid. UI menampilkan alasan dan checklist kesiapan.

### Kategori unpublished

Admin tetap dapat menyimpan draf, preview, dan membuat snapshot publik Event. Pengunjung tetap mendapat `404` sampai kategori dipublish.

### Membatalkan draf

**Batalkan draf** mengembalikan workspace ke snapshot publik terakhir. Tindakan ini:

- memerlukan dialog konfirmasi;
- tidak menghapus Event;
- tidak mengubah status kategori atau Event;
- tidak mengubah snapshot publik;
- dinonaktifkan untuk Event yang belum pernah dipublikasikan; Admin tetap dapat menghapus Event baru melalui alur hapus Event yang terpisah.

## Preview Aman

### Pembuatan token

Endpoint Admin terautentikasi menerbitkan token preview read-only:

```text
POST /api/v1/admin/events/:eventId/preview-token
```

Token berlaku 15 menit dan memuat sekurang-kurangnya:

- purpose/audience khusus preview;
- subject pengguna;
- `organizationId`;
- `categoryId`;
- `eventId`;
- waktu terbit dan kedaluwarsa.

Backend hanya menerbitkannya setelah memverifikasi membership dan akses baca terhadap Event. Semua role yang boleh membaca Event dapat preview; token tidak menambah hak tulis.

### Pembukaan halaman

1. Tombol **Lihat preview** meminta token untuk Event terpilih.
2. Admin membuka route Public Site asli dengan token pada URL fragment, bukan query string.
3. Public Site memindahkan token ke `sessionStorage` tab tersebut.
4. Fragment segera dihapus dari address bar menggunakan History API.
5. API client menambahkan token melalui header khusus hanya pada request Public Site.
6. Endpoint sesi preview memverifikasi token lalu memasang cookie `HttpOnly`, `SameSite=Lax`, berumur 15 menit, dan terbatas pada path `/api/v1/public`.
7. Cookie hanya diperlukan untuk request media dari elemen `<img>` atau tautan PDF yang tidak dapat mengirim header custom; token tetap tidak ditempatkan di query string.
8. Backend memverifikasi signature, purpose, expiry, scope, membership, tenant, dan kepemilikan Event.
9. Resolver preview membaca workspace Event yang tercantum dalam token, termasuk Event nonaktif atau kategori unpublished.

Token login Admin tidak pernah dibawa ke Public Site. Token/cookie preview tidak diterima endpoint mutasi.

### Kedaluwarsa

Preview yang kedaluwarsa tidak boleh jatuh diam-diam ke versi publik. Public Site menampilkan pesan bahwa sesi preview berakhir dan Admin perlu membuka ulang melalui tombol **Lihat preview**.

Response preview menggunakan `Cache-Control: private, no-store`.

## Resolusi Public Site

### Request publik biasa

Request tanpa token preview hanya berhasil ketika:

- Organization aktif dan belum dihapus;
- kategori aktif, `publication_status='published'`, dan belum dihapus;
- terdapat tepat satu Event aktif, operasional, belum dihapus;
- Event memiliki snapshot publik yang valid.

Endpoint mengembalikan data snapshot Event aktif. Hostname harus tetap terverifikasi untuk resolusi berbasis host.

### Request preview

Request dengan token valid:

- mengambil tepat Event dari token, bukan Event aktif kategori;
- dapat membaca kategori unpublished serta Event nonaktif/suspended;
- tidak dapat membaca Event soft-deleted;
- tidak dapat menyeberang Organization, kategori, Event, atau tenant;
- membaca workspace/draf, bukan snapshot publik.

## Publikasi Atomik

Aksi **Publikasikan perubahan** melakukan satu transaksi:

1. kunci Event atau verifikasi optimistic version;
2. validasi seluruh aggregate dan ownership relasi;
3. bangun DTO lengkap snapshot;
4. validasi schema snapshot;
5. kumpulkan referensi media;
6. tulis snapshot baru dan relasi medianya;
7. simpan metadata versi/audit;
8. commit transaksi.

Kegagalan pada langkah mana pun membatalkan seluruh transaksi. Snapshot sebelumnya tetap tersedia.

## Kemudahan Pengelolaan Admin

Header editor menampilkan:

- status kategori: Published/Unpublished;
- status Event: Aktif/Nonaktif;
- status konten: Belum dipublikasikan/Draf bersih/Ada perubahan draf;
- waktu dan pengguna penyimpan terakhir;
- waktu publikasi terakhir.

Tindakan utama:

- **Simpan draf**;
- **Lihat preview**;
- **Publikasikan perubahan**;
- **Batalkan draf**.

Sebelum publish, tampilkan ringkasan modul berubah, bukan diff teknis per-field. Sebelum aktivasi Event baru, tampilkan checklist kesiapan dan dampak bahwa Event aktif lama akan menjadi arsip.

Perubahan form yang belum disimpan memicu peringatan saat Admin berpindah halaman atau menutup tab.

## Konflik Antar-Admin

Publish dan batalkan draf menggunakan checksum workspace yang diambil dari status publikasi. Jika aggregate berubah setelah status dimuat, backend menolak tindakan tersebut dengan konflik `409`.

Endpoint simpan editor mempertahankan transaksi dan validasi ownership yang sudah ada, tetapi initial scope belum menyediakan satu revision token lintas seluruh endpoint simpan. Karena itu dua Admin yang menyimpan modul yang sama secara bersamaan masih dapat menghasilkan last-write-wins. Perlindungan `409` seragam untuk setiap save memerlukan revision workspace persisten dan pengiriman revision tersebut oleh seluruh editor; tambahkan ketika kolaborasi multi-Admin aktif menjadi kebutuhan operasional. Kolaborasi real-time dan merge otomatis tidak termasuk scope awal.

## Error Handling

- `401`: sesi Admin/token preview tidak valid atau kedaluwarsa.
- `403`: role, membership, tenant, atau scope token tidak sesuai.
- `404`: kategori/Event tidak tersedia untuk mode akses tersebut.
- `409`: versi draf berubah, publish bersamaan, atau constraint aktivasi dilanggar.
- `422` atau `400`: aggregate belum valid untuk publish.

Error publish harus mempertahankan draf dan snapshot publik lama. UI tidak boleh mengklaim publish berhasil tanpa receipt backend.

## Perubahan API Konseptual

Endpoint baru:

```text
POST /admin/events/:eventId/preview-token
GET  /admin/events/:eventId/publication-status
POST /admin/events/:eventId/publish
POST /admin/events/:eventId/discard-draft
```

Endpoint Public Site yang ada mempertahankan route dan bentuk response. Implementasi resolver memilih snapshot publik atau workspace preview berdasarkan konteks akses.

## Pengujian

### Unit

- request publik mensyaratkan kategori published dan snapshot Event aktif;
- preview memilih tepat Event dalam token;
- token expired, purpose salah, scope salah, dan tenant lain ditolak;
- publish membangun snapshot lengkap;
- publish gagal tidak mengganti snapshot lama;
- deteksi perubahan draf dan konflik checksum saat publish/batalkan draf bekerja;
- media draf tidak dapat dibaca tanpa token preview.

### E2E

- kategori unpublished tanpa preview menghasilkan `404`;
- kategori unpublished dengan preview valid menampilkan workspace;
- Event nonaktif dapat dipreview tanpa menjadi aktif;
- edit Event aktif tidak mengubah response publik sebelum publish;
- publish mengganti seluruh aggregate dalam satu versi;
- aktivasi Event tanpa snapshot ditolak pada kategori published;
- token preview tidak dapat digunakan untuk mutasi;
- tenant lain dan Event soft-deleted ditolak;
- snapshot lama tetap tayang ketika publish gagal.

### Frontend dan browser

- token tidak berada di query string dan fragment dibersihkan;
- preview expired tidak fallback ke versi publik;
- tombol preview memakai Event terpilih dan route halaman yang tepat;
- indikator unsaved/draft/published akurat;
- dialog publish, discard, dan activate dapat digunakan dengan keyboard;
- Public Site normal dan preview mempertahankan parity visual di viewport aktif.

## Dokumentasi Aktif

Implementasi harus menyelaraskan klaim pada:

- `README.md`;
- `PROGRESS.md` setelah status implementasi benar-benar berubah;
- `docs/ARCHITECTURE.md`;
- `docs/ADMIN_SPEC.md`;
- `docs/DATA_MODEL.md`;
- `docs/OPERATIONS.md`;
- `docs/TESTING.md`;
- `docs/WORK_LOG.md`.

Dokumentasi harus membedakan secara eksplisit publikasi kategori, publikasi versi Event, aktivasi Event, penyimpanan draf, dan preview aman.

## Di Luar Scope Awal

- autosave penuh;
- publish per halaman atau per komponen;
- approval bertingkat;
- publikasi terjadwal;
- kolaborasi real-time;
- komentar antar-Admin;
- perbandingan visual lengkap antarversi;
- rollback langsung ke publik;
- penyimpanan riwayat snapshot tanpa batas.

Riwayat versi atau pemulihan versi lama dapat ditambahkan setelah alur satu draf dan satu snapshot publik terbukti stabil.
