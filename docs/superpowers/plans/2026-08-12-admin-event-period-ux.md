# Admin Event Period UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengganti slug periode acak dan Reset template dengan identitas Event tahun/batch yang terstruktur, dashboard profesional, dan siklus draf yang langsung dipahami Admin.

**Architecture:** `event_sites` menyimpan identitas periode Admin (`period_year`, batch opsional, catatan internal) serta `activated_at` untuk membedakan Event masa depan dari arsip. Snapshot tetap mengisolasi konten publik; resolver hanya meng-overlay nama periode operasional ketika batch kedua pernah diaktifkan, sehingga aktivasi atomik tidak membangun ulang konten atau membocorkan Event masa depan. Semua editor menyediakan kontrak `TalentaEditor.revert()` yang mengambil ulang workspace tersimpan tanpa menulis template ke database.

**Tech Stack:** NestJS 11, TypeORM 1.1, PostgreSQL, Jest/Supertest, JavaScript browser native, HTML/CSS responsif, Node.js assert audits, Puppeteer/Chrome DevTools.

## Global Constraints

- `CompetitionCategory` adalah identitas ajang; nama Event tidak diterima dari form pembuatan.
- `period_year` valid pada rentang `2000..2100`; nomor batch selalu dialokasikan server.
- Nomor batch yang pernah dipakai tidak didaur ulang setelah soft delete.
- Event masa depan yang belum pernah aktif tidak boleh tampil sebagai arsip publik.
- Nama batch existing baru berubah untuk pengunjung ketika Event batch berikutnya diaktifkan.
- Satu Kategori tetap memiliki paling banyak satu Event aktif.
- Publikasi Kategori, publikasi konten Event, dan aktivasi Event tetap terpisah.
- **Urungkan edit** tidak menulis database dan tidak memulihkan template bawaan.
- Tidak menambah dependency baru.
- Jangan mengubah `docs/AI_SESSION_PROMPT.md`.
- Database yang boleh dimigrasikan/di-seed hanya PostgreSQL development lokal yang terkonfigurasi dan telah diverifikasi host lokal; jangan menyentuh production.
- Jangan commit, push, merge, release, atau deploy.
- Catat perubahan faktual di `docs/WORK_LOG.md`; perbarui `PROGRESS.md` hanya setelah implementasi dan validasi selesai.

## Struktur File

**Schema dan domain:**

- Create `apps/backend/src/database/migrations/1786672800000-AddEventPeriodIdentity.ts` untuk kolom, backfill kandidat aman, constraint, dan index identitas.
- Modify `apps/backend/src/entities/event-site.entity.ts` untuk metadata periode/batch dan `activatedAt`.
- Modify `apps/backend/src/database/migrations/reset-category-event-schema.spec.ts` untuk receipt source migration.

**Backend Event dan identitas publik:**

- Modify `apps/backend/src/admin/admin.controller.ts` untuk DTO pembuatan terstruktur dan konfirmasi identitas legacy.
- Modify `apps/backend/src/admin/admin.service.ts` untuk alokasi, konflik terstruktur, sinkronisasi nama Kategori, list badge, dan aktivasi atomik.
- Modify `apps/backend/src/public/public-content.service.ts` untuk DTO identitas periode dan mode workspace/public.
- Modify `apps/backend/src/public/public.service.ts` untuk filter arsip `activated_at` dan overlay identitas batch.
- Modify `apps/backend/src/public/workspace-snapshot.service.ts` hanya agar metadata konten yang boleh didiscard tetap terpisah dari identitas periode operasional.
- Modify `apps/backend/src/database/seed-local.ts` untuk Event 2025/2026 eksplisit dan `activated_at`.
- Modify unit/E2E specs terkait.

**Admin:**

- Modify `apps/admin/js/shell/portal-dashboard.js` untuk form tahun/batch, konflik, hero aktif, arsip ringkas, dan badge tiga dimensi.
- Modify `apps/admin/index.html` dan `apps/public-site/assets/css/main.css` untuk header/status/action bar responsif.
- Modify `apps/admin/js/shell/router.js` untuk status badge dan kontrak `TalentaEditor.revert()`.
- Modify editor Pengaturan, Beranda, Unduh, FAQ, Pemenang, Arsip, dan Detail Arsip agar revert mengambil ulang workspace tersimpan.
- Modify savebar HTML editor untuk label **Urungkan edit** dan selector eksplisit `data-editor-revert`/`data-editor-save`.

**Audit dan dokumentasi:**

- Create `scripts/audit-admin-event-period-ux.mjs` dan register `test:event-period-ux` di `package.json`.
- Modify `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/ADMIN_SPEC.md`, `docs/TESTING.md`, `docs/SETUP_LOKAL.md`, `docs/WORK_LOG.md`, dan `PROGRESS.md` setelah receipt tersedia.

---

### Task 1: Schema identitas periode dan backfill aman

**Files:**

- Create: `apps/backend/src/database/migrations/1786672800000-AddEventPeriodIdentity.ts`
- Modify: `apps/backend/src/entities/event-site.entity.ts`
- Modify: `apps/backend/src/database/migrations/reset-category-event-schema.spec.ts`

**Interfaces:**

- `EventSite.periodYear: number | null`
- `EventSite.batchNumber: number | null`
- `EventSite.batchLabel: string | null`
- `EventSite.batchNote: string`
- `EventSite.activatedAt: Date | null`

- [ ] **Step 1: Tambahkan failing migration test**

Assert query migration memuat:

```ts
expect(source).toContain("ADD COLUMN period_year int");
expect(source).toContain("ADD COLUMN batch_number int");
expect(source).toContain("ADD COLUMN batch_label varchar(40)");
expect(source).toContain("ADD COLUMN batch_note varchar(240)");
expect(source).toContain("ADD COLUMN activated_at timestamptz");
expect(source).toContain("CHECK (period_year BETWEEN 2000 AND 2100)");
expect(source).toContain("uq_event_period_unbatched");
expect(source).toContain("uq_event_period_batch");
expect(source).not.toContain("DROP TABLE event_sites");
```

- [ ] **Step 2: Jalankan test dan pastikan gagal**

Run:

```bash
npm --prefix apps/backend test -- --runInBand database/migrations/reset-category-event-schema.spec.ts
```

Expected: FAIL karena migration baru belum tersedia.

- [ ] **Step 3: Implementasikan migration minimum**

`up()` menambahkan kolom nullable, backfill `activated_at=created_at` untuk Event aktif/existing yang sudah memiliki publikasi, lalu mengisi `period_year` hanya untuk kandidat slug `^[0-9]{4}(-.*)?$` yang tidak bertabrakan dalam Kategori. Tambahkan constraint:

```sql
CHECK (period_year IS NULL OR period_year BETWEEN 2000 AND 2100)
CHECK (batch_number IS NULL OR batch_number > 0)
CHECK ((batch_number IS NULL AND batch_label IS NULL) OR
       (batch_number IS NOT NULL AND length(trim(batch_label)) > 0))
```

Event tahunan tanpa batch tetap unik hanya selama aktif secara data. Nomor batch tidak memakai filter `deleted_at` agar nomor yang dihapus tidak didaur ulang:

```sql
CREATE UNIQUE INDEX uq_event_period_unbatched
ON event_sites(category_id, period_year)
WHERE period_year IS NOT NULL AND batch_number IS NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX uq_event_period_batch
ON event_sites(category_id, period_year, batch_number)
WHERE period_year IS NOT NULL AND batch_number IS NOT NULL;
```

`down()` hanya menghapus index, constraint, dan lima kolom baru.

- [ ] **Step 4: Tambahkan entity columns dan jalankan test/build**

Run:

```bash
npm --prefix apps/backend test -- --runInBand database/migrations/reset-category-event-schema.spec.ts
npm --prefix apps/backend run build
```

Expected: PASS dan build exit `0`.

### Task 2: Kontrak pembuatan Event, alokasi batch, dan data legacy

**Files:**

- Modify: `apps/backend/src/admin/admin.controller.ts`
- Modify: `apps/backend/src/admin/admin.service.ts`
- Create: `apps/backend/src/admin/event-period.service.spec.ts`
- Modify: `apps/backend/test/admin.e2e-spec.ts`

**Interfaces:**

```ts
interface NewEvent {
  periodYear: number;
  batchEnabled: boolean;
  batchLabel?: string;
  batchNote?: string;
  confirmBatchConversion?: boolean;
}
```

Konflik `409`:

```json
{
  "statusCode": 409,
  "message": "Event tahun ini sudah ada. Konfirmasi konversi ke beberapa gelombang.",
  "code": "EVENT_YEAR_REQUIRES_BATCH_CONVERSION",
  "existingEvent": { "id": "uuid", "periodYear": 2026, "nextBatchNumber": 2 }
}
```

Endpoint legacy:

```text
PATCH /admin/events/:eventId/period-identity
{ periodYear, batchEnabled, batchLabel?, batchNote?, confirmBatchConversion? }
```

- [ ] **Step 1: Tulis failing service tests**

Test minimal mencakup tahun di luar batas, nama diambil dari Kategori, Event unik tanpa batch, batch pertama nomor 1, nomor berikut `MAX(batch_number)+1` termasuk row soft-deleted, konflik unbatched `409`, konversi existing menjadi batch 1 + Event baru batch 2 setelah konfirmasi, serta rollback ketika insert gagal.

- [ ] **Step 2: Jalankan tests dan pastikan gagal**

```bash
npm --prefix apps/backend test -- --runInBand admin/event-period.service.spec.ts
```

- [ ] **Step 3: Ganti DTO dan implementasikan alokasi dalam transaksi**

Lock Kategori dan row tahun target:

```sql
SELECT id FROM competition_categories WHERE id=$1 FOR UPDATE;
SELECT id,batch_number,batch_label,deleted_at
FROM event_sites
WHERE category_id=$1 AND period_year=$2
ORDER BY batch_number NULLS FIRST,created_at,id
FOR UPDATE;
```

Aturan service:

- tanpa existing + `batchEnabled=false` → Event tanpa batch;
- tanpa existing + `batchEnabled=true` → batch 1;
- existing unbatched + tanpa konfirmasi → `ConflictException` terstruktur;
- existing unbatched + konfirmasi → update existing ke batch 1 dan insert batch 2 dalam transaksi sama;
- existing batched → gunakan label group existing dan alokasikan `MAX+1`;
- slug baru deterministik: `YYYY` untuk unbatched dan `YYYY-<label-slug>-N` untuk batch;
- `name=category.name`; input nama asing ditolak global ValidationPipe.

- [ ] **Step 4: Implementasikan endpoint konfirmasi legacy dengan allocator yang sama**

Event `period_year IS NULL` dapat ditetapkan eksplisit. Urutan konfirmasi Admin menentukan urutan batch; service tidak menebak dari waktu pembuatan. Endpoint menolak Event yang identitasnya sudah confirmed atau berasal dari Kategori lain.

- [ ] **Step 5: Perbarui E2E dan jalankan unit/build**

```bash
npm --prefix apps/backend test -- --runInBand admin/event-period.service.spec.ts
npm --prefix apps/backend run build
```

E2E disiapkan tetapi baru dijalankan setelah Task 8 memastikan database lokal testing.

### Task 3: Aktivasi atomik, snapshot, dan identitas publik

**Files:**

- Modify: `apps/backend/src/admin/admin.service.ts`
- Modify: `apps/backend/src/public/public-content.service.ts`
- Modify: `apps/backend/src/public/public.service.ts`
- Modify: `apps/backend/src/public/workspace-snapshot.service.ts`
- Modify: `apps/backend/src/public/public-content.service.spec.ts`
- Modify: `apps/backend/src/public/public.service.spec.ts`
- Modify: `apps/backend/test/public.e2e-spec.ts`

**Interfaces:**

```ts
type IdentityMode = 'public' | 'workspace';
PublicContentService.build(eventId, executor?, identityMode?: IdentityMode)
```

`workspace` selalu menampilkan batch Admin. `public` hanya memakai suffix batch jika dalam Kategori+tahun sudah ada Event `batch_number > 1 AND activated_at IS NOT NULL`.

- [ ] **Step 1: Tulis failing identity tests**

Test membuktikan:

- preview workspace menampilkan `OSN 2026 · Gelombang 2`;
- snapshot/public existing tetap `OSN 2026` sebelum batch 2 aktif;
- setelah batch 2 aktif, active response dan arsip batch 1 memakai suffix;
- Event published tetapi `activated_at IS NULL` tidak masuk list arsip;
- metadata period/batch tidak ikut dipulihkan oleh **Batalkan draf**.

- [ ] **Step 2: Jalankan test dan pastikan gagal**

```bash
npm --prefix apps/backend test -- --runInBand public/public-content.service.spec.ts public/public.service.spec.ts
```

- [ ] **Step 3: Implementasikan formatter identitas tunggal**

```ts
function eventDisplayName(
  baseName: string,
  periodYear: number,
  batchLabel: string | null,
  batchNumber: number | null,
  showBatch: boolean,
) {
  const period = `${baseName} ${periodYear}`;
  return showBatch && batchLabel && batchNumber
    ? `${period} · ${batchLabel} ${batchNumber}`
    : period;
}
```

Tambahkan `periodYear`, `batchNumber`, dan `batchLabel` pada object Event publik; jangan pernah mengirim `batchNote` ke Public API.

- [ ] **Step 4: Overlay identitas tanpa membangun ulang snapshot**

Resolver mengambil metadata Event saat memilih active/archive, clone snapshot response, lalu mengganti hanya:

```text
bootstrap.currentEvent
winners.event
archiveDetail.event
```

Konten lain tetap dari snapshot. `archiveSnapshots()` dan detail arsip mensyaratkan `event.activated_at IS NOT NULL`.

- [ ] **Step 5: Perluas transaksi aktivasi**

Aktivasi mengunci seluruh Event Kategori, memvalidasi `period_year`, readiness snapshot pada Kategori published, menonaktifkan active lama, mengaktifkan target, dan mengisi `activated_at=COALESCE(activated_at,now())` dalam transaksi yang sama. Audit mencatat ID transisi tanpa menyalin konten/media.

- [ ] **Step 6: Jalankan unit/build**

```bash
npm --prefix apps/backend test -- --runInBand public/public-content.service.spec.ts public/public.service.spec.ts admin/event-period.service.spec.ts
npm --prefix apps/backend run build
```

### Task 4: List Event, settings, dan seed konsisten dengan Kategori

**Files:**

- Modify: `apps/backend/src/admin/admin.controller.ts`
- Modify: `apps/backend/src/admin/admin.service.ts`
- Modify: `apps/backend/src/database/seed-local.ts`
- Modify: `scripts/audit-category-event-contracts.mjs`

**Interfaces:**

`categoryEvents()` mengembalikan:

```ts
{
  (id,
    name,
    slug,
    periodYear,
    batchNumber,
    batchLabel,
    batchNote,
    needsPeriodConfirmation,
    isActive,
    isArchive,
    publishedVersion,
    publicationState,
    draftChanged,
    createdAt);
}
```

- [ ] **Step 1: Tambahkan failing contract assertions**

Audit menolak `event.slug` sebagai label periode dan memastikan seed insert memuat `period_year`, `activated_at`, serta nama dasar yang sama dengan Kategori.

- [ ] **Step 2: Implementasikan list/status dalam satu query**

Gunakan checksum workspace terbaru vs `event_publications.workspace_checksum` untuk `draftChanged`; `isArchive = !is_active AND activated_at IS NOT NULL`; `needsPeriodConfirmation = period_year IS NULL`. Urutkan aktif dulu, lalu tahun/batch terbaru.

- [ ] **Step 3: Hapus edit nama Event dari settings boundary**

`EventSettingsDto` dan `putSettings()` tidak menerima `eventName`; response settings mengembalikan `eventName` read-only. `updateCategory()` menyinkronkan `event_sites.name` ke nama Kategori baru tanpa mengubah snapshot publik existing.

- [ ] **Step 4: Selaraskan seed**

Seed 2025 dan 2026 memakai `period_year`, `activated_at`, nama dasar Kategori, dan slug deterministik. Snapshot tetap dibangun melalui service yang sama.

- [ ] **Step 5: Jalankan audit/unit/build**

```bash
npm run test:category-events
npm --prefix apps/backend test -- --runInBand
npm --prefix apps/backend run build
```

### Task 5: Dashboard Event profesional dan form tahun/batch

**Files:**

- Modify: `apps/admin/js/shell/portal-dashboard.js`
- Modify: `apps/public-site/assets/css/main.css`
- Create: `scripts/audit-admin-event-period-ux.mjs`
- Modify: `package.json`

**Interfaces:**

- Form mengirim `periodYear`, `batchEnabled`, `batchLabel`, `batchNote`.
- Konflik dibaca dari `error.details?.code` dan dikirim ulang dengan `confirmBatchConversion: true` hanya setelah `adminConfirm()`.

- [ ] **Step 1: Buat failing frontend audit**

Assert source memuat field tahun, checkbox batch, istilah publik, nomor read-only, catatan internal, tiga badge, active hero/archive section, dan tidak memuat `Periode: ${event.slug}` atau input nama Event.

- [ ] **Step 2: Jalankan audit dan pastikan gagal**

```bash
node scripts/audit-admin-event-period-ux.mjs
```

- [ ] **Step 3: Implementasikan form**

Nama Kategori read-only; tahun default `new Date().getFullYear()`; field batch hidden/disabled sampai checkbox aktif; nomor berikut hanya preview dari list tetapi server tetap authoritative. Error validasi tetap berada dalam dialog.

- [ ] **Step 4: Implementasikan konflik konversi**

Saat `EVENT_YEAR_REQUIRES_BATCH_CONVERSION`, tampilkan nama Event existing, perubahan menjadi batch 1, Event baru batch 2, dan waktu penerapan nama publik. Batal tidak mengirim request kedua; setuju mengirim body identik + `confirmBatchConversion:true`.

- [ ] **Step 5: Implementasikan hierarchy kartu**

Render satu `.event-card--active` bila ada Event aktif dan `.event-dashboard__archive-grid` untuk lainnya. Setiap kartu memiliki badge operasional, workspace, publikasi; **Kelola Event** utama; aktivasi/hapus berada dalam menu `<details>` berlabel jelas. Event belum pernah aktif diberi `Persiapan`, bukan `Arsip`.

- [ ] **Step 6: Implementasikan dialog identitas legacy**

Card `needsPeriodConfirmation` menonaktifkan aktivasi dan menyediakan **Tetapkan periode** yang memakai endpoint Task 2. Copy menjelaskan bahwa urutan konfirmasi menjadi urutan gelombang.

- [ ] **Step 7: Jalankan audit JS/routes**

```bash
npm run test:event-period-ux
npm run check:js
npm run check:routes
```

### Task 6: Action bar, badge editor, dan Urungkan edit

**Files:**

- Modify: `apps/admin/index.html`
- Modify: `apps/admin/js/shell/router.js`
- Modify: `apps/admin/js/shell/settings-editor.js`
- Modify: `apps/admin/js/features/home/editor.js`
- Modify: `apps/admin/js/features/downloads/editor.js`
- Modify: `apps/admin/js/features/faq/manager.js`
- Modify: `apps/admin/js/features/winners/manager.js`
- Modify: `apps/admin/js/features/archive/manager.js`
- Modify: `apps/admin/js/features/archive/detail-editor.js`
- Modify: enam savebar HTML editor terkait
- Modify: `apps/public-site/assets/css/main.css`
- Modify: `scripts/audit-admin-event-period-ux.mjs`

**Interfaces:**

```ts
window.TalentaEditor = Object.freeze({
  revert: async () => void,
  save: async () => void,
});
```

- [ ] **Step 1: Perluas failing audit**

Assert urutan DOM: Urungkan edit, Preview | Simpan draf, Batalkan draf, separator, Publikasikan. Assert setiap editor mengekspos `TalentaEditor.revert`, selector memakai `[data-editor-revert]`, dan handler revert tidak memanggil helper `reset*AdminState` atau API save.

- [ ] **Step 2: Implementasikan kontrak revert per editor**

Setiap `revert()` mengambil API workspace ke object sementara; hanya setelah request sukses mengganti state/form dan render. Kegagalan melempar error sehingga shell mempertahankan form. Reset template helper boleh tetap internal tetapi tidak terhubung ke action bar/savebar.

- [ ] **Step 3: Ganti forwarding selector shell**

```js
function nativeActions() {
  const scope = activeDocument();
  return {
    revert: scope?.defaultView?.TalentaEditor?.revert,
    save: scope?.defaultView?.TalentaEditor?.save,
  };
}
```

Jika `dirty`, shell meminta konfirmasi **Buang edit yang belum disimpan?**. Setelah sukses, `dirty=false`; setelah gagal, dirty/form tetap dan toast error tampil.

- [ ] **Step 4: Render badge dan pesan status**

Header menampilkan badge Aktif/Arsip/Persiapan, Ada draf/Draf bersih, dan Belum dipublikasikan/Publikasi vN. Kegagalan status menghasilkan `Status tidak tersedia` dan menonaktifkan publish/discard.

- [ ] **Step 5: Implementasikan responsive action bar**

Desktop memisahkan group kiri/kanan. Di bawah 800px gunakan grid dua kolom; publish `grid-column:1/-1`. Pertahankan focus-visible, target sentuh, dan tidak ada horizontal scroll pada 390px.

- [ ] **Step 6: Jalankan audit dan checks**

```bash
npm run test:event-period-ux
npm run test:event-publication
npm run check:js
npm run check:routes
```

### Task 7: Dokumentasi aktif dan gate source

**Files:**

- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DATA_MODEL.md`
- Modify: `docs/ADMIN_SPEC.md`
- Modify: `docs/TESTING.md`
- Modify: `docs/SETUP_LOKAL.md`
- Modify: `docs/WORK_LOG.md`
- Modify: `PROGRESS.md`

- [ ] **Step 1: Sinkronkan dokumentasi aktif**

Dokumentasikan tahun/batch, Event persiapan vs arsip, konflik konversi, activation-time naming, tiga badge, dan arti lima action editor. Hapus klaim aktif bahwa nama Event diisi bebas atau slug adalah periode.

- [ ] **Step 2: Tambahkan checklist browser baru**

`docs/TESTING.md` memuat acceptance 1/2/5/10 Event, batal/setuju konflik, nama publik sebelum/sesudah aktivasi, revert vs discard, serta desktop/tablet/mobile.

- [ ] **Step 3: Catat Work Log dan Progress secara faktual**

Work Log menyebut file/keputusan/validasi yang benar-benar selesai. `PROGRESS.md` baru menyatakan implemented setelah Task 8–9 lulus; kegagalan atau validasi tertunda tetap ditulis terbuka.

- [ ] **Step 4: Jalankan format terfokus dan diff check**

```bash
npx -y prettier@3.9.6 --check docs/ARCHITECTURE.md docs/DATA_MODEL.md docs/ADMIN_SPEC.md docs/TESTING.md docs/SETUP_LOKAL.md docs/WORK_LOG.md PROGRESS.md docs/superpowers/plans/2026-08-12-admin-event-period-ux.md

git diff --check
```

### Task 8: Terapkan schema dan seed pada PostgreSQL development lokal

**Files:** Tidak ada file baru; langkah operasional memakai `.env` ignored.

- [ ] **Step 1: Verifikasi target lokal tanpa mencetak credential**

Jalankan script yang hanya mencetak boolean/ringkasan aman:

```text
hostIsLocal=true|false
databaseConfigured=true|false
productionMarker=false|true
```

Lanjut hanya jika host adalah `localhost`, `127.0.0.1`, atau socket lokal, nama database terisi, dan tidak memiliki marker production. Jangan mencetak username/password/JWT/email.

- [ ] **Step 2: Jalankan migration dan verifikasi ledger**

```bash
npm --prefix apps/backend exec typeorm-ts-node-commonjs migration:run -- -d src/database/data-source.ts
npm --prefix apps/backend exec typeorm-ts-node-commonjs migration:show -- -d src/database/data-source.ts
```

Expected: `AddEventPeriodIdentity1786672800000` bertanda `[X]`.

- [ ] **Step 3: Jalankan seed idempotent dua kali**

```bash
npm --prefix apps/backend run seed:local
npm --prefix apps/backend run seed:local
```

Query verifikasi read-only memastikan satu active Event, tahun 2025/2026 valid, tidak ada identitas duplikat, dan snapshot tetap tersedia. Jangan menampilkan credential atau token.

- [ ] **Step 4: Jalankan backend E2E pada database lokal testing yang diotorisasi**

```bash
npm --prefix apps/backend run test:e2e -- --runInBand
```

Expected: seluruh suite PASS; jika data seed terganggu, jalankan seed kembali setelah test sebelum browser acceptance.

### Task 9: Acceptance browser manusiawi dan perbaikan berulang

**Files:** Modify hanya file sumber yang terbukti menyebabkan defect; setiap fix mendapat assertion audit/unit sebelum perubahan.

- [ ] **Step 1: Jalankan backend dan frontend**

Start backend port 3000 dan frontend port 4173. Tunggu health/halaman siap berdasarkan output proses, bukan sleep tetap. Jangan menampilkan credential pada log/chat.

- [ ] **Step 2: Uji alur Create Event melalui UI**

Login, buka Kategori, periksa nama read-only/tahun default/field batch hidden. Buat tahun unik; buat Event kedua tahun sama, batalkan konfirmasi dan verifikasi database/list tidak berubah; ulangi dan setujui agar batch 1/2 terbentuk.

- [ ] **Step 3: Uji publikasi dan aktivasi**

Edit + Simpan draf + Preview + Publikasikan batch 2. Sebelum aktivasi, Public Site Event lama tetap tanpa suffix dan Event baru tidak muncul sebagai arsip. Aktifkan batch 2 dari UI; Public Site menampilkan batch 2 dan arsip menampilkan batch 1.

- [ ] **Step 4: Uji Urungkan edit dan Batalkan draf**

Ubah field tanpa simpan lalu **Urungkan edit**; nilai kembali ke workspace tersimpan dan tidak ke template. Simpan perubahan lintas modul, lalu **Batalkan draf**; seluruh workspace kembali ke snapshot publik terakhir.

- [ ] **Step 5: Uji hierarchy/status/responsive**

Dengan data 1, 2, 5, dan 10 Event, verifikasi hero aktif, grid ringkas, menu tindakan, badge backend, keyboard dialog, serta tidak ada overlap/horizontal scroll pada 1440×900, 768×1024, dan 390×844.

- [ ] **Step 6: Perbaiki defect dengan TDD dan ulangi skenario gagal**

Untuk tiap defect: catat langkah reproduksi, tambahkan unit/assert audit yang gagal, lakukan diff minimum, jalankan test fokus, lalu ulangi interaksi browser yang sama. Jangan menandai selesai berdasarkan inspeksi source saja.

- [ ] **Step 7: Jalankan final gate**

```bash
npm run test:event-period-ux
npm run test:event-publication
npm run test:category-events
npm run check:routes
npm run check:js
npm run check:theme
npm --prefix apps/backend test -- --runInBand
npm --prefix apps/backend run build
git diff --check
```

Periksa `git status --short`; pastikan `.env`, upload, database/dump, key, token, dan `.superpowers/` tidak disiapkan untuk commit. Jangan commit atau push.
