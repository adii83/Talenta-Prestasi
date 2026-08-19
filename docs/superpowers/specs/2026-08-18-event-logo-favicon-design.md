# Desain Logo dan Favicon per Event

## Tujuan

Memperbaiki logo yang menghasilkan `404 Media not found`, menyimpan identitas logo per Event, menampilkan logo draf dengan aman di Admin, memakai logo sama sebagai favicon Public Site, dan memberi satu kontrol ukuran logo navbar untuk desktop, tablet, serta mobile.

## Keputusan Produk

- Logo dimiliki setiap `EventSite`, bukan `CompetitionCategory`.
- Logo berbeda dari maskot. `mascot_asset_id` tidak lagi dipakai sebagai tempat penyimpanan logo.
- Satu asset logo dipakai untuk navbar dan favicon.
- Satu nilai ukuran berlaku pada navbar desktop, tablet, dan mobile.
- Rentang ukuran adalah `24..44` piksel, default `36` piksel. Batas `44` menjaga logo tetap berada di dalam mobile header setinggi 52 piksel.
- Background dan bingkai CSS wadah logo dihapus hanya ketika gambar logo tersedia.
- Background yang merupakan bagian file JPG/WebP tetap dipertahankan. Transparansi PNG tetap transparan.
- Gambar memakai `object-fit: contain`; gambar nonpersegi tidak dipotong.
- Form memberi rekomendasi rasio 1:1 dan background transparan, tetapi tidak memaksakannya.
- Format logo hanya PNG, JPG/JPEG, atau WebP dengan ukuran maksimum 5 MB.
- Tidak ada penghapus background otomatis, Python, AI, pemrosesan gambar, atau dependency baru.

## Model Data

Tambahkan:

```sql
event_sites.logo_asset_id uuid NULL REFERENCES media_assets(id) ON DELETE SET NULL
site_settings.navbar_logo_size smallint NOT NULL DEFAULT 36
CHECK (navbar_logo_size BETWEEN 24 AND 44)
```

Migration mengisi `event_sites.logo_asset_id` dari sumber lama tanpa menghapus sumber tersebut:

```sql
COALESCE(event_sites.mascot_asset_id, competition_categories.logo_asset_id)
```

`mascot_asset_id`, `competition_categories.logo_asset_id`, dan `competition_categories.favicon_asset_id` tetap tersedia untuk kompatibilitas data lama, tetapi flow settings dan Public Site baru tidak membacanya sebagai logo Event.

Entity TypeORM menambahkan `EventSite.logoAssetId`, relasi `logoAsset`, dan `SiteSettings.navbarLogoSize`.

## Kompatibilitas Snapshot

Workspace snapshot baru menangkap `event_sites.logo_asset_id`. Row `site_settings` otomatis membawa `navbar_logo_size`.

Snapshot lama tidak memiliki kedua field tersebut. Restore harus:

- mempertahankan logo Event saat key `logo_asset_id` benar-benar tidak ada pada snapshot lama;
- menghormati nilai `null` pada snapshot baru sebagai perintah menghapus logo;
- mengisi `navbar_logo_size=36` saat row settings snapshot lama tidak memiliki field tersebut;
- tetap menolak snapshot milik Event lain.

Public snapshot existing tidak ditulis ulang oleh migration. Logo Event baru menjadi publik setelah Admin memublikasikan workspace lagi.

## API Settings

`GET /api/v1/admin/events/:eventId/settings` mengembalikan:

```json
{
  "logoAssetId": "uuid-or-null",
  "navbarLogoSize": 36
}
```

`PUT /api/v1/admin/events/:eventId/settings` menerima field sama. Penghapusan mengirim `logoAssetId: null`; field yang tidak ada tidak digunakan sebagai perintah implisit untuk mengambil logo Kategori.

Sebelum menyimpan logo, backend memverifikasi:

- asset aktif;
- asset dan Event berasal dari organisasi sama;
- MIME asset adalah `image/png`, `image/jpeg`, atau `image/webp`.

Nilai ukuran divalidasi pada DTO dan constraint database dalam rentang `24..44`.

## Preview Media Admin

Upload tetap memakai endpoint existing:

```text
POST /api/v1/admin/events/:eventId/media
```

Tambah endpoint:

```text
GET /api/v1/admin/events/:eventId/media/:assetId
Authorization: Bearer <JWT>
```

Endpoint hanya mengembalikan asset aktif jika pengguna memiliki membership pada organisasi Event dan asset dimiliki organisasi sama. Asset tidak harus sudah direferensikan agar hasil upload baru dapat langsung dipreview.

Admin tidak memasang URL endpoint tersebut langsung pada `<img>`, karena elemen gambar tidak membawa bearer token. `TalentaApi.request(..., { responseType: "blob" })` mengambil binary menggunakan JWT existing. `TalentaMedia.adminPreviewUrl()` membuat Object URL lokal. Object URL hanya hidup pada state memori dan tidak disimpan ke `localStorage`; cache browser menyimpan `logoAssetId` saja. Object URL lama dicabut ketika logo diganti, dihapus, dimuat ulang, atau halaman dilepas.

Public endpoint tetap ketat:

```text
GET /api/v1/public/media/:assetId
```

Asset draf tanpa preview token atau allowlist publik tetap menghasilkan `404 Media not found`. Endpoint preview publik memperbolehkan `event.logo_asset_id` yang direferensikan workspace token tersebut.

## Data Flow Draf dan Publikasi

1. Admin mengunggah file dan menerima `assetId`.
2. Admin mengambil Blob melalui endpoint media terautentikasi dan melihat Object URL lokal.
3. **Simpan draf** menulis `event_sites.logo_asset_id` dan `site_settings.navbar_logo_size`.
4. **Lihat preview** membangun public workspace snapshot dan membaca logo Event melalui preview token.
5. **Publikasikan perubahan** memasukkan `logoAssetId` ke public snapshot.
6. `collectAssetIds()` menemukan UUID tersebut dan menambahkannya ke `event_publication_assets`.
7. Public Site published dapat mengambil logo melalui endpoint public media.
8. **Batalkan draf** memulihkan logo dan ukuran dari workspace snapshot publik terakhir.

Asset lama tidak langsung dihapus dari storage karena masih mungkin direferensikan snapshot publik atau Event lain dalam organisasi.

## Public Site dan Favicon

`PublicContentService` membaca `event.logo_asset_id`, bukan logo Kategori atau maskot. DTO bootstrap menyediakan:

```json
{
  "site": {
    "logoAssetId": "uuid-or-null",
    "logoUrl": "/api/v1/public/media/<uuid>"
  },
  "settings": {
    "navbarLogoSize": 36
  }
}
```

Runtime:

- memasang logo pada `.navbar__logo`, `.mobile-header__logo`, dan perilaku footer existing;
- menerapkan `--navbar-logo-size: <n>px` pada document root;
- membuat atau memperbarui `<link rel="icon" data-talenta-event-icon>` memakai URL logo sama;
- menghapus link favicon dinamis ketika Event tidak memiliki logo.

Public snapshot published tetap menjadi sumber website publik. Perubahan draf tidak mengubah favicon atau navbar website published sebelum publikasi.

## Tampilan Responsif

Satu slider native pada form settings:

```html
<input id="navbarLogoSize" type="range" min="24" max="44" step="1" />
```

Label menampilkan nilai saat ini dalam piksel. Slider memperbarui preview desktop, tablet, dan mobile secara langsung.

CSS gambar navbar:

- desktop memakai `.navbar__logo`;
- tablet dan mobile memakai `.mobile-header__logo`;
- keduanya memakai variable sama;
- ketika berisi gambar: ukuran sama, background transparan, tanpa radius bingkai, dan `object-fit: contain`;
- fallback inisial tanpa gambar mempertahankan kotak warna existing;
- footer tidak mengikuti slider dan mempertahankan ukuran existing.

## Error Handling

- File format atau ukuran salah ditolak sebelum upload dan diverifikasi lagi backend.
- Signature file tidak cocok dengan MIME ditolak backend.
- PDF/SVG tidak dapat disimpan sebagai logo meskipun media uploader umum mendukungnya.
- Asset organisasi lain, asset nonaktif, Event tanpa akses, dan UUID salah ditolak.
- Gagal mengambil Blob mempertahankan `logoAssetId`, menampilkan fallback inisial, dan menampilkan toast error.
- Gagal menyimpan tidak mengubah snapshot publik.
- Favicon gagal dimuat tidak menghambat bootstrap halaman.

## Pengujian

### Otomatis

- Migration source menambah field, constraint, backfill non-destruktif, dan rollback terarah.
- Settings GET/PUT membaca, menulis, menghapus, dan memvalidasi logo Event serta ukuran.
- Endpoint media Admin menguji JWT route, membership, tenant ownership, status asset, MIME, dan header aman.
- Preview public media mengenali `event.logo_asset_id`; public asset draf tetap ditolak tanpa token/allowlist.
- Workspace capture/restore menguji snapshot baru dan kompatibilitas snapshot lama.
- Public snapshot memakai logo Event dan memasukkan UUID ke allowlist saat publish.
- Frontend audit menguji copy upload, range `24..44`, Blob URL Admin, favicon dinamis, CSS `contain`, dan penerapan ukuran pada desktop/tablet/mobile.
- Regression tema antar-Event tetap lulus.

### Browser

- Upload PNG transparan langsung tampil pada Admin tanpa `404`.
- Reload settings tetap memuat logo melalui endpoint Admin.
- Slider mengubah logo pada preview desktop, tablet, dan mobile tanpa keluar dari header.
- Background/bingkai CSS hilang untuk gambar, tetapi fallback inisial tetap berbentuk kotak.
- **Lihat preview** menampilkan logo draf dan favicon Event.
- Website published tetap memakai logo lama sebelum publikasi dan logo baru setelah publikasi.
- Dua Event satu Kategori mempertahankan logo serta ukuran masing-masing.
- Hapus logo, simpan, preview, publish, dan batalkan draf bekerja konsisten.

## Batas Operasional

- Migration file boleh dibuat dan diuji secara source, tetapi migration tidak dijalankan tanpa izin operasional terpisah.
- Jangan mengubah `.env`, CORS, credential, Ruflo, MCP, atau AgentDB Bridge.
- Jangan commit, push, release, publish ke layanan eksternal, atau deploy.
- Catat implementasi faktual di `docs/WORK_LOG.md`; `PROGRESS.md` hanya berubah bila status proyek keseluruhan benar-benar berubah.
