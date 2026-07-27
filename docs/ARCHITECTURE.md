# Arsitektur Frontend Talenta Prestasi

## Prinsip

HTML di root adalah entry point dan kontrak URL situs statis. Implementasi dikelompokkan berdasarkan tanggung jawab di `assets/`.

## Dependency Direction

```text
HTML entry → core → mock data → repositories → shared runtime / feature
```

Feature tidak menjadi sumber data permanen. Repository saat ini memakai baseline JavaScript dan localStorage; nanti dapat diganti adapter HTTP tanpa menulis ulang form atau renderer.

## Struktur

- `assets/js/core/`: helper generik.
- `assets/js/data/`: baseline database dummy.
- `assets/js/data/repositories/`: kontrak baca/tulis state efektif.
- `assets/js/shared/`: runtime publik lintas halaman.
- `assets/js/features/`: editor, manager, renderer per domain.
- `assets/css/main.css`: design system dan style aktif.
- `assets/images/`: gambar statis.
- `docs/`: spesifikasi dan keputusan teknis.

## Storage Contracts

| Domain            | Repository/feature  | Key localStorage             |
| ----------------- | ------------------- | ---------------------------- |
| Pengaturan Global | settings repository | `talenta_event_settings_v1`  |
| Arsip             | archive repository  | `talenta_archive_manager_v2` |
| FAQ               | FAQ repository      | `talenta_faq_manager_v1`     |
| Unduh             | Downloads           | `talenta_download_editor_v2` |
| Pemenang          | Winners             | `talenta_winner_manager_v1`  |
| Tampilan Pemenang | Winners             | `talenta_winner_page_v1`     |

Key tidak boleh diganti tanpa migrasi schema eksplisit.

## Menambah Fitur

1. Tambahkan baseline di `assets/js/data/` bila data demo digunakan bersama.
2. Tambahkan repository bila data dipakai lebih dari satu halaman.
3. Tempatkan editor/renderer di `assets/js/features/<domain>/`.
4. Muat script sesuai dependency direction.
5. Pertahankan semantic HTML, ID unik, dan preview responsif.
6. Catat perubahan di `PROGRESS.md`.

## Migrasi ke Backend

Repository API mendatang mempertahankan bentuk data saat ini dan menyediakan operasi list/find/save/remove. Baseline mock tetap dapat dipakai untuk development dan test. Repository localStorage diganti HTTP adapter; editor dan renderer tidak perlu ditulis ulang. Autentikasi, otorisasi, upload, validasi final, dan tenant resolution dilakukan server.

## Aturan URL

Entry HTML tetap di root selama deployment statis. Jangan memindahkan HTML ke subfolder tanpa router/server rewrite karena akan merusak direct link, query parameter, iframe admin, dan tautan relatif.

## Batas Aplikasi

```text
apps/public  ─┐
apps/admin   ─┼─> packages/shared
apps/portal  ─┘
```

Aturan dependency:

1. Setiap app boleh bergantung pada `packages/shared`.
2. `packages/shared` tidak boleh mengimpor app.
3. Public tidak boleh mengimpor kode Admin atau Portal.
4. Admin tidak boleh mengimpor kode Portal.
5. File root hanyalah compatibility entry; pengembangan dilakukan pada file di `apps/`.
6. Kode khusus app harus tinggal di app tersebut, bukan di shared.

### Entry Points

| Area             | Entry                    |
| ---------------- | ------------------------ |
| Template publik  | `apps/public/index.html` |
| CMS admin        | `apps/admin/index.html`  |
| Portal kontingen | `apps/portal/login.html` |

Compatibility redirect root meneruskan `location.search` dan `location.hash` ke entry baru.

## Root-Zero-HTML Rule

Root workspace tidak boleh memiliki file HTML. Semua halaman menggunakan directory-index routing di bawah aplikasi masing-masing. Internal navigation tidak boleh merujuk nama file `.html`.

Canonical route didefinisikan di `packages/shared/js/core/paths.js`. Resolver menentukan base path dari URL script sehingga aplikasi tetap bekerja saat dipasang pada domain root atau subpath repository.

### Menambah Route

1. Buat `<app>/<route>/index.html`.
2. Daftarkan route ID pada `TalentaPaths`.
3. Untuk Admin, tambahkan metadata pada `apps/admin/js/config/routes.js`.
4. Gunakan `TalentaPaths.to()` untuk URL dinamis, query, dan hash.
5. Jalankan `npm run check`.

Static host harus menayangkan workspace root dan mendukung directory index. Jangan menjalankan melalui `file://`.
