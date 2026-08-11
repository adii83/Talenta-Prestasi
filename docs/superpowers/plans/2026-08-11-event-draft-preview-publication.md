# Event Draft, Secure Preview, and Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memisahkan workspace/draf Event dari versi publik sehingga seluruh modul Event dapat disimpan, dipreview secara aman, dan dipublikasikan atomik tanpa melakukan unpublish atau mengganggu pengunjung.

**Architecture:** Tabel relasional yang ada tetap menjadi workspace Admin. Satu `event_publications` per Event menyimpan snapshot publik serta snapshot workspace internal untuk pemulihan, sedangkan `event_publication_assets` menjadi allowlist media publik. Public API membaca snapshot untuk request biasa dan membangun DTO dari workspace hanya ketika menerima token preview Event yang valid; Admin mengelola satu status draf dan satu aksi publish untuk seluruh Event.

**Tech Stack:** NestJS 11, TypeORM 1.1, PostgreSQL JSONB, `@nestjs/jwt`, class-validator, Jest/Supertest, JavaScript browser native, `sessionStorage`, cookie HttpOnly, Node.js audit scripts, Prettier 3.9.6.

## Global Constraints

- Admin tidak perlu melakukan unpublish ketika mengedit Event aktif.
- Satu Event memiliki satu workspace/draf terpadu untuk seluruh modul.
- Publish mengganti seluruh versi publik Event secara atomik.
- Publish kategori, publish isi Event, dan aktivasi Event tetap tiga tindakan terpisah.
- Token preview berlaku tepat 15 menit, read-only, dan terikat ke pengguna, Organization, kategori, serta Event.
- Token login Admin tidak pernah dibawa ke Public Site.
- Token preview tidak boleh berada di query string; fragment dibersihkan segera setelah dibaca.
- Media draf hanya boleh diakses oleh preview Event yang sesuai; UUID asset saja tidak memberikan akses.
- Tidak menambah dependency baru.
- Migration dibuat dan diuji secara statis, tetapi tidak dijalankan pada database development utama tanpa instruksi terpisah.
- E2E hanya boleh dijalankan pada PostgreSQL writable/disposable sesuai `docs/TESTING.md`.
- Pertahankan perubahan existing `docs/AI_SESSION_PROMPT.md`; jangan mengedit atau memformat ulang file tersebut.
- Jangan commit, push, deploy, release, atau publish keluar.
- Setiap perubahan file dicatat faktual di `docs/WORK_LOG.md`; `PROGRESS.md` diperbarui karena status fitur produk berubah.

## Struktur File

**Database dan model:**

- Create `apps/backend/src/entities/event-publication.entity.ts`: entity snapshot aktif per Event.
- Create `apps/backend/src/entities/event-publication-asset.entity.ts`: allowlist asset snapshot publik.
- Modify `apps/backend/src/entities/event-site.entity.ts`: relasi satu-ke-satu publikasi.
- Modify `apps/backend/src/entities/index.ts`: ekspor entity baru.
- Create `apps/backend/src/database/migrations/1786586400000-AddEventDraftPublications.ts`: tabel, FK, index, dan rollback non-destruktif.

**Snapshot, preview, dan publikasi:**

- Create `apps/backend/src/public/public-content.service.ts`: membangun DTO publik lengkap dari workspace Event.
- Create `apps/backend/src/public/workspace-snapshot.service.ts`: capture/restore seluruh row workspace dengan urutan FK yang tetap.
- Create `apps/backend/src/public/preview-token.service.ts`: sign/verify token preview dan cookie.
- Modify `apps/backend/src/public/public.module.ts`: provider/export service bersama.
- Create `apps/backend/src/admin/event-publication.service.ts`: status, publish atomik, discard, token preview, dan readiness.
- Modify `apps/backend/src/admin/admin.module.ts`: wiring service.
- Modify `apps/backend/src/admin/admin.controller.ts`: empat endpoint publikasi Event.
- Modify `apps/backend/src/admin/admin.service.ts`: metadata status Event, guard aktivasi/publish kategori, dan audit.
- Modify `apps/backend/src/database/seed-local.ts`: membangun snapshot demo melalui service yang sama setelah seed workspace.

**Public API dan media:**

- Modify `apps/backend/src/public/public.controller.ts`: membaca header/cookie preview dan menandai response preview `private, no-store`.
- Modify `apps/backend/src/public/public.service.ts`: resolver snapshot publik vs workspace preview, arsip snapshot, dan syarat published.
- Modify `apps/backend/src/media/media.controller.ts`: meneruskan cookie/header preview dan cache policy.
- Modify `apps/backend/src/media/media.service.ts`: hanya melayani allowlist publik atau asset workspace Event preview yang valid.
- Modify `apps/backend/src/media/media.module.ts`: import provider preview.

**Frontend:**

- Modify `packages/shared/js/core/api-client.js`: header preview opt-in, `credentials: include`, dan event mutasi Admin.
- Modify `packages/shared/js/core/media-client.js`: tetap memakai URL media yang sama; cookie HttpOnly mengotorisasi media preview.
- Modify `apps/public-site/assets/js/public-api.js`: ambil fragment, simpan token per tab, exchange cookie, header preview, dan error expiry tanpa fallback.
- Create `apps/public-site/assets/js/preview-banner.js`: banner read-only dan pesan kedaluwarsa.
- Modify enam HTML Public Site: muat banner sebelum renderer.
- Modify `apps/admin/index.html`: status draf dan tombol Preview/Publish/Discard.
- Modify `apps/admin/js/shell/router.js`: status, preview route, publish/discard, dirty form, dan konfirmasi navigasi.
- Modify `apps/admin/js/shell/portal-dashboard.js`: badge publikasi Event dan readiness aktivasi.
- Modify `apps/public-site/assets/css/main.css`: status Admin dan banner preview.

**Test dan dokumentasi:**

- Create `apps/backend/src/public/public-content.service.spec.ts`.
- Create `apps/backend/src/public/preview-token.service.spec.ts`.
- Create `apps/backend/src/admin/event-publication.service.spec.ts`.
- Modify `apps/backend/src/public/public.service.spec.ts`.
- Modify `apps/backend/src/media/media.controller.spec.ts`.
- Modify `apps/backend/test/admin.e2e-spec.ts` dan `apps/backend/test/public.e2e-spec.ts`.
- Create `scripts/audit-event-publication.mjs` dan modify `package.json`.
- Modify dokumentasi aktif yang disebut pada Task 8 serta spesifikasi untuk detail cookie media.

---

### Task 1: Schema snapshot publik dan allowlist media

**Files:**

- Create: `apps/backend/src/entities/event-publication.entity.ts`
- Create: `apps/backend/src/entities/event-publication-asset.entity.ts`
- Modify: `apps/backend/src/entities/event-site.entity.ts`
- Modify: `apps/backend/src/entities/index.ts`
- Create: `apps/backend/src/database/migrations/1786586400000-AddEventDraftPublications.ts`
- Test: `apps/backend/src/database/migrations/reset-category-event-schema.spec.ts`

**Interfaces:**

- Produces `EventPublication` dengan field `eventSiteId`, `organizationId`, `categoryId`, `version`, `schemaVersion`, `publicSnapshot`, `workspaceSnapshot`, `workspaceChecksum`, `publishedAt`, dan `publishedBy`.
- Produces `EventPublicationAsset` dengan composite primary key `(eventSiteId, assetId)`.
- Migration tidak mengubah atau menghapus data konten yang ada.

- [ ] **Step 1: Tambahkan test migration yang gagal**

Tambahkan assertion source migration baru:

```ts
expect(source).toContain("CREATE TABLE event_publications");
expect(source).toContain("public_snapshot jsonb");
expect(source).toContain("workspace_snapshot jsonb");
expect(source).toContain("CREATE TABLE event_publication_assets");
expect(source).not.toContain("DROP TABLE competition_categories");
```

- [ ] **Step 2: Jalankan test migration**

Run: `npm --prefix apps/backend test -- --runInBand src/database/migrations/reset-category-event-schema.spec.ts`

Expected: FAIL karena migration/entity belum tersedia.

- [ ] **Step 3: Implementasikan entity dan migration minimum**

Gunakan mapping berikut:

```ts
@Entity("event_publications")
export class EventPublication {
  @PrimaryColumn({ name: "event_site_id", type: "uuid" }) eventSiteId!: string;
  @Column({ name: "organization_id", type: "uuid" }) organizationId!: string;
  @Column({ name: "category_id", type: "uuid" }) categoryId!: string;
  @Column({ type: "int", default: 1 }) version!: number;
  @Column({ name: "schema_version", type: "int", default: 1 })
  schemaVersion!: number;
  @Column({ name: "public_snapshot", type: "jsonb" }) publicSnapshot!: Record<
    string,
    unknown
  >;
  @Column({ name: "workspace_snapshot", type: "jsonb" })
  workspaceSnapshot!: Record<string, unknown>;
  @Column({ name: "workspace_checksum", length: 64 })
  workspaceChecksum!: string;
  @Column({ name: "published_at", type: "timestamptz" }) publishedAt!: Date;
  @Column({ name: "published_by", type: "uuid", nullable: true }) publishedBy!:
    string | null;
}
```

FK seluruh record memakai `ON DELETE CASCADE`; FK `published_by` memakai `ON DELETE SET NULL`. Tambahkan index kategori dan waktu publikasi. `down()` hanya menghapus dua tabel baru.

- [ ] **Step 4: Jalankan test dan build**

Run:

```bash
npm --prefix apps/backend test -- --runInBand src/database/migrations/reset-category-event-schema.spec.ts
npm --prefix apps/backend run build
```

Expected: PASS dan build exit `0`.

- [ ] **Step 5: Jangan jalankan migration**

Verifikasi hanya source migration; jangan menjalankan `migration:run` pada database development utama.

### Task 2: Builder DTO publik dan snapshot workspace

**Files:**

- Create: `apps/backend/src/public/public-content.service.ts`
- Create: `apps/backend/src/public/workspace-snapshot.service.ts`
- Create: `apps/backend/src/public/public-content.service.spec.ts`
- Modify: `apps/backend/src/public/public.module.ts`

**Interfaces:**

- Produces `PublicEventSnapshot`:

```ts
interface PublicEventSnapshot {
  schemaVersion: 1;
  bootstrap: {
    site: object;
    settings: object;
    routes: string[];
    currentEvent: object;
  };
  home: { site: object; sections: object[] };
  downloads: { site: object; page: object | null; tabs: object[] };
  faq: { site: object; page: object | null; categories: object[] };
  winners: {
    site: object;
    event: object;
    categories: object[];
    page: object | null;
    settings: object;
    decree: object | null;
  };
  archivePage: { site: object; page: object | null };
  archiveDetail: {
    event: object;
    settings: object | null;
    categories: object[];
    documents: object[];
  };
}
```

- `PublicContentService.build(eventId: string, executor?: QueryExecutor): Promise<PublicEventSnapshot>`.
- `WorkspaceSnapshotService.capture(eventId: string, executor?: QueryExecutor): Promise<WorkspaceSnapshot>`.
- `WorkspaceSnapshotService.restore(eventId: string, snapshot: WorkspaceSnapshot, executor: QueryExecutor): Promise<void>`.
- Capture menyertakan row aktif dan nonaktif; public snapshot hanya menyertakan konten yang lolos aturan visibilitas.

- [ ] **Step 1: Tulis failing test public builder**

Mock executor per query dan assert struktur lengkap, urutan section/document/winner stabil, serta `archiveDetail` tidak mengambil Event lain.

```ts
expect(snapshot.schemaVersion).toBe(1);
expect(snapshot.bootstrap.currentEvent).toMatchObject({ slug: "2027" });
expect(snapshot.home.sections).toEqual([
  expect.objectContaining({ type: "hero" }),
]);
expect(snapshot.archiveDetail.event).toMatchObject({ slug: "2027" });
```

- [ ] **Step 2: Jalankan test builder**

Run: `npm --prefix apps/backend test -- --runInBand src/public/public-content.service.spec.ts`

Expected: FAIL karena service belum ada.

- [ ] **Step 3: Ekstrak query workspace dari `PublicService`**

Pindahkan query konten Event ke `PublicContentService`; semua query menerima `eventId` eksplisit dan tidak memilih Event aktif sendiri. Pastikan object dibangun dalam urutan property tetap dan array selalu memakai `ORDER BY` untuk checksum deterministik.

- [ ] **Step 4: Implementasikan capture/restore workspace**

Capture tabel langsung Event dan child tidak langsung dengan ID asli. Restore dilakukan dalam urutan delete child→parent dan insert parent→child:

```text
faq_questions → faq_categories
pricing_facilities → pricing_packages
hero_badges/hero_actions/schedule_items/benefit_items/partner_items → home_sections
download_document_settings → download_tabs
archive settings/winners → winner_categories
event detail/page/site settings/event documents → event_sites metadata
```

Jangan capture `media_assets`, Organization, membership, kategori, domain, audit, atau publication. Sebelum insert, validasi `snapshot.schemaVersion === 1` dan `snapshot.event.id === eventId`.

- [ ] **Step 5: Tambahkan restore round-trip unit check**

Gunakan executor in-memory/mock call sequence dan assert restore menolak Event ID berbeda serta menghapus/memasukkan tabel dalam urutan FK yang benar.

- [ ] **Step 6: Jalankan test dan build**

Run:

```bash
npm --prefix apps/backend test -- --runInBand src/public/public-content.service.spec.ts
npm --prefix apps/backend run build
```

Expected: PASS.

### Task 3: Token preview dan publication service Admin

**Files:**

- Create: `apps/backend/src/public/preview-token.service.ts`
- Create: `apps/backend/src/public/preview-token.service.spec.ts`
- Create: `apps/backend/src/admin/event-publication.service.ts`
- Create: `apps/backend/src/admin/event-publication.service.spec.ts`
- Modify: `apps/backend/src/public/public.module.ts`
- Modify: `apps/backend/src/admin/admin.module.ts`
- Modify: `apps/backend/src/admin/admin.controller.ts`
- Modify: `apps/backend/src/admin/admin.service.ts`

**Interfaces:**

- `PreviewClaims = { purpose: 'event-preview'; sub; organizationId; categoryId; eventId }`.
- `PreviewTokenService.issue(claims): Promise<{ token: string; expiresAt: string }>` memakai audience `event-preview`, expiry `15m`.
- `PreviewTokenService.verify(token): Promise<PreviewClaims>` menolak purpose/audience/expiry salah.
- `EventPublicationService.status(eventId, userId)` menghasilkan `publicationState`, `draftChanged`, `publishedVersion`, `publishedAt`, `changedModules`, `readiness`, dan `eventVersion`.
- `publish(eventId, userId, expectedVersion?)`, `discardDraft(...)`, dan `previewToken(...)`.

- [ ] **Step 1: Tulis failing test token**

```ts
const issued = await service.issue(validClaims);
await expect(service.verify(issued.token)).resolves.toMatchObject(validClaims);
await expect(service.verify(expiredToken)).rejects.toThrow();
await expect(service.verify(adminJwt)).rejects.toThrow();
```

- [ ] **Step 2: Tulis failing test publish atomik**

Assert service:

- memerlukan role baca untuk status/preview;
- memerlukan owner/admin/editor untuk publish/discard;
- memakai transaction `REPEATABLE READ`;
- membangun public dan workspace snapshot;
- menghitung SHA-256 canonical JSON;
- upsert `event_publications` dan mengganti `event_publication_assets` dalam transaksi;
- mempertahankan versi lama jika builder gagal.

- [ ] **Step 3: Jalankan test service**

Run:

```bash
npm --prefix apps/backend test -- --runInBand src/public/preview-token.service.spec.ts src/admin/event-publication.service.spec.ts
```

Expected: FAIL.

- [ ] **Step 4: Implementasikan canonical checksum dan changed modules**

Gunakan fungsi lokal deterministic:

```ts
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
```

Module berubah dibatasi ke `Pengaturan`, `Beranda`, `Unduh`, `FAQ`, `Pemenang`, dan `Arsip` berdasarkan key snapshot; tidak membuat diff field-level.

- [ ] **Step 5: Implementasikan endpoint Admin**

Tambahkan:

```text
POST /admin/events/:eventId/preview-token
GET  /admin/events/:eventId/publication-status
POST /admin/events/:eventId/publish
POST /admin/events/:eventId/discard-draft
```

Body publish/discard menerima `expectedVersion` integer positif opsional. Response tidak pernah mengembalikan workspace snapshot atau JWT Admin.

- [ ] **Step 6: Tambahkan guard aktivasi dan kategori**

Pada kategori published, `activateEvent` menolak Event tanpa `event_publications`. `publishCategory` menolak jika tidak ada Event aktif bersnapshot. Pesan error harus menjelaskan tindakan: publikasikan isi Event terlebih dahulu.

- [ ] **Step 7: Jalankan test dan build**

Run:

```bash
npm --prefix apps/backend test -- --runInBand src/public/preview-token.service.spec.ts src/admin/event-publication.service.spec.ts src/admin/admin.service.spec.ts
npm --prefix apps/backend run build
```

Expected: PASS.

### Task 4: Resolver Public snapshot/preview dan media aman

**Files:**

- Modify: `apps/backend/src/public/public.controller.ts`
- Modify: `apps/backend/src/public/public.service.ts`
- Modify: `apps/backend/src/public/public.service.spec.ts`
- Modify: `apps/backend/src/media/media.controller.ts`
- Modify: `apps/backend/src/media/media.service.ts`
- Modify: `apps/backend/src/media/media.module.ts`
- Modify: `apps/backend/src/media/media.controller.spec.ts`

**Interfaces:**

- Header API preview: `X-Talenta-Preview`.
- Cookie media preview: `talenta_preview`, HttpOnly, SameSite=Lax, path `/api/v1/public`, max age 900 detik.
- Endpoint exchange: `POST /public/preview/session`, menerima header token, memverifikasi ulang, lalu memasang cookie tanpa mengembalikan token.
- Public resolver normal mengembalikan snapshot hanya untuk kategori published + Event aktif/operasional + Organization aktif.
- Preview resolver memverifikasi token, membership saat ini, ownership, dan soft delete lalu membangun workspace Event tepat.

- [ ] **Step 1: Perbarui unit test PublicService agar gagal**

Assert request normal SQL/flow mensyaratkan `publication_status='published'` dan membaca `event_publications.public_snapshot`; preview Event nonaktif memakai ID claim dan tidak fallback ke Event aktif.

- [ ] **Step 2: Tambahkan failing test media**

Assert media tanpa preview hanya dilayani jika ada row `event_publication_assets`. Preview asset harus direferensikan Event/kategori scope token; asset Organization lain ditolak.

- [ ] **Step 3: Jalankan test target**

Run:

```bash
npm --prefix apps/backend test -- --runInBand src/public/public.service.spec.ts src/media/media.controller.spec.ts
```

Expected: FAIL.

- [ ] **Step 4: Implementasikan resolver Public**

Request normal membaca JSONB snapshot dan membentuk:

- bootstrap/home/downloads/faq langsung dari snapshot aktif;
- winners menambahkan daftar Event nonaktif bersnapshot sesuai `archiveLimit`;
- archives memakai `archivePage` snapshot aktif + ringkasan snapshot Event nonaktif;
- archive detail memakai `archiveDetail` snapshot Event arsip dan `site` snapshot Event aktif.

Preview menggunakan `PublicContentService.build(eventId)`; daftar/detail arsip preview tetap hanya membaca snapshot Event arsip agar draf Event lain tidak bocor.

- [ ] **Step 5: Implementasikan response dan cookie preview**

Semua response preview menggunakan:

```text
Cache-Control: private, no-store
Vary: X-Talenta-Preview, Cookie
```

Response normal tetap dapat memakai cache publik yang sesuai. Parse cookie dengan parser kecil berbasis string; jangan menambah `cookie-parser`.

- [ ] **Step 6: Implementasikan allowlist media**

Normal: join `event_publication_assets` dan pastikan kategori/Event/Organization publik masih valid. Preview: verify cookie/header lalu query referensi asset pada kategori terikat atau tabel workspace Event terikat. Cache preview `private, no-store`; cache normal `public, max-age=3600`.

- [ ] **Step 7: Jalankan test dan build**

Run:

```bash
npm --prefix apps/backend test -- --runInBand src/public/public.service.spec.ts src/media/media.controller.spec.ts
npm --prefix apps/backend run build
```

Expected: PASS.

### Task 5: Seed dan E2E alur lengkap

**Files:**

- Modify: `apps/backend/src/database/seed-local.ts`
- Modify: `apps/backend/test/admin.e2e-spec.ts`
- Modify: `apps/backend/test/public.e2e-spec.ts`

**Interfaces:**

- Seed demo membuat snapshot untuk Event aktif dan arsip setelah workspace selesai, memakai builder/checksum yang sama; seed kedua tetap idempotent.
- E2E memakai database disposable dengan migration terbaru.

- [ ] **Step 1: Ubah E2E menjadi acceptance draf**

Tambahkan urutan:

```text
buat Event → simpan workspace → public 404 → issue preview → preview 200
→ publish Event → publish kategori/aktifkan → public 200
→ edit workspace aktif → public tetap payload lama → preview payload baru
→ publish ulang → public payload baru
```

Tambahkan kasus tenant token salah, token preview pada mutasi, Event soft-deleted, dan kegagalan publish mempertahankan snapshot lama.

- [ ] **Step 2: Jalankan E2E hanya jika DB test aman tersedia**

Sebelum command, baca `DB_DATABASE`; hentikan jika namanya sama dengan database development utama yang didokumentasikan (`talenta_prestasi`) atau tidak jelas disposable.

Run bila aman: `npm --prefix apps/backend run test:e2e -- --runInBand`

Expected sebelum implementasi seed/E2E lengkap: FAIL pada kontrak baru.

- [ ] **Step 3: Integrasikan snapshot seed idempotent**

Gunakan service/builder source yang sama, bukan JSON hard-coded. Upsert snapshot dan replace allowlist asset dalam transaksi. Jangan menjalankan seed pada database utama dalam sesi ini.

- [ ] **Step 4: Jalankan unit/build dan E2E aman**

Run:

```bash
npm --prefix apps/backend run build
npm --prefix apps/backend test -- --runInBand
npm --prefix apps/backend run test:e2e -- --runInBand  # hanya DB disposable
```

Expected: seluruh suite PASS; bila E2E dilewati, catat alasan eksplisit.

### Task 6: Transport preview Public Site

**Files:**

- Modify: `packages/shared/js/core/api-client.js`
- Modify: `apps/public-site/assets/js/public-api.js`
- Create: `apps/public-site/assets/js/preview-banner.js`
- Modify: `apps/public-site/index.html`
- Modify: `apps/public-site/unduh/index.html`
- Modify: `apps/public-site/pemenang/index.html`
- Modify: `apps/public-site/arsip/index.html`
- Modify: `apps/public-site/arsip/detail/index.html`
- Modify: `apps/public-site/faq/index.html`
- Modify: `apps/public-site/assets/css/main.css`

**Interfaces:**

- Fragment input: `#preview=<token>`.
- Session key: `talenta_event_preview_token`.
- `TalentaApi.request(path, { previewToken, auth: false })` menambahkan `X-Talenta-Preview` tanpa Authorization.
- `TalentaPublic.preview()` mengembalikan `{ active, expiresAt }` tanpa mengekspos token.

- [ ] **Step 1: Tambahkan audit statis yang gagal untuk transport**

Pada Task 8 script, assert `public-api.js` membaca fragment, memanggil `history.replaceState`, memakai `sessionStorage`, menukar cookie, dan tidak memakai query `preview`.

- [ ] **Step 2: Implementasikan ekstraksi fragment**

Urutan wajib:

```js
const token = new URLSearchParams(location.hash.slice(1)).get("preview");
if (token) sessionStorage.setItem(PREVIEW_KEY, token);
history.replaceState(
  history.state,
  "",
  `${location.pathname}${location.search}`,
);
```

Jika token ada, panggil `/public/preview/session` dengan header sebelum bootstrap. Error exchange menandai preview expired dan tidak fallback ke request publik.

- [ ] **Step 3: Kirim header pada seluruh GET data**

`resolveBootstrap` dan `load` selalu meneruskan preview token ketika sesi preview aktif. Jangan hapus JWT Admin pada response preview `401`; `api-client` hanya menghapus token Admin jika request memang memakai Authorization.

- [ ] **Step 4: Tambahkan banner dan expiry state**

Banner:

```text
Preview draf — hanya Anda yang dapat melihat versi ini. Berlaku maksimal 15 menit.
```

Pada `401/403` preview, ganti konten banner dengan instruksi membuka ulang dari Admin; jangan meneruskan ke slug/config fallback.

- [ ] **Step 5: Muat script di enam halaman dan format**

Pastikan script preview dimuat setelah `public-api.js` tetapi sebelum renderer halaman. Gunakan CSS fixed/non-overlapping dengan fokus dan kontras yang cukup.

- [ ] **Step 6: Jalankan gate frontend**

Run:

```bash
npm run check:routes
npm run check:js
npm run check:theme
```

Expected: PASS.

### Task 7: UX satu draf pada Admin

**Files:**

- Modify: `apps/admin/index.html`
- Modify: `apps/admin/js/shell/router.js`
- Modify: `apps/admin/js/shell/portal-dashboard.js`
- Modify: `apps/admin/js/shell/settings-editor.js`
- Modify: `apps/public-site/assets/css/main.css`
- Modify: `scripts/audit-admin-dialogs.mjs`

**Interfaces:**

- Status UI memakai response `publication-status`.
- Preview membuka route editor aktif dengan token pada fragment; token tidak disimpan Admin.
- Publish/discard selalu memakai `adminConfirm`.
- Parent router memantau form settings dan iframe editor; mutasi sukses dari `TalentaApi` mengirim event `talenta:admin-mutated` untuk refresh status.

- [ ] **Step 1: Tambahkan markup status dan tindakan**

Header harus memuat:

```text
Kategori: Published/Unpublished
Event: Aktif/Nonaktif
Konten: Belum dipublikasikan/Draf bersih/Ada perubahan draf
Simpan draf | Lihat preview | Publikasikan perubahan | Batalkan draf
```

Label tombol editor existing diubah dari “Simpan perubahan” menjadi “Simpan draf”. Viewer melihat status/preview tetapi tombol simpan/publish/discard dinonaktifkan sesuai role.

- [ ] **Step 2: Implementasikan status refresh dan preview route**

`router.js` mengambil status setelah Event siap dan setelah event mutasi. `Lihat preview` meminta token lalu membuka `r.public` dengan hash `preview=<token>`. Untuk hostname production-like, route bersih tetap dipakai hanya setelah hostname lolos validasi existing.

- [ ] **Step 3: Implementasikan publish dan discard**

Publish dialog menyebut modul berubah dan dampak ke pengunjung. Discard dialog menyatakan seluruh perubahan draf akan hilang. Setelah success, reload editor aktif agar workspace sesuai snapshot.

- [ ] **Step 4: Implementasikan dirty form**

Pasang listener `input/change` pada form settings dan `frame.contentDocument` setelah load. Sebelum pindah route atau unload:

```text
Perubahan belum disimpan. Simpan sebagai draf sebelum meninggalkan halaman.
```

Setelah mutasi save sukses, clear dirty. Jangan gunakan autosave.

- [ ] **Step 5: Perbarui dashboard Event dan readiness**

Card menampilkan `Belum dipublikasikan`, `Draf bersih`, atau `Ada perubahan draf`. Aktivasi Event pada kategori published menampilkan checklist dan dinonaktifkan jika belum ada snapshot; backend tetap menjadi enforcement utama.

- [ ] **Step 6: Jalankan audit Admin dan browser smoke**

Run:

```bash
npm run test:admin-dialogs
npm run test:category-events
npm run check:js
```

Browser smoke: buka Admin, pastikan status dapat dibaca keyboard, dialog fokus benar, fragment token tidak tersisa setelah Public Site terbuka, dan preview expired tidak fallback.

Expected: PASS.

### Task 8: Audit kontrak, dokumentasi, dan validasi akhir

**Files:**

- Create: `scripts/audit-event-publication.mjs`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `PROGRESS.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/ADMIN_SPEC.md`
- Modify: `docs/DATA_MODEL.md`
- Modify: `docs/OPERATIONS.md`
- Modify: `docs/TESTING.md`
- Modify: `docs/WORK_LOG.md`
- Modify: `docs/superpowers/specs/2026-08-11-event-draft-preview-publication-design.md`
- Modify: `docs/superpowers/plans/2026-08-11-event-draft-preview-publication.md`
- Preserve unchanged: `docs/AI_SESSION_PROMPT.md`

**Interfaces:**

- Root script `test:event-publication` menjalankan audit Node assert-based.
- Dokumentasi membedakan empat aksi: simpan draf, publish isi Event, aktifkan Event, publish kategori.

- [ ] **Step 1: Tulis audit kontrak**

Assert source berikut:

- migration/entity snapshot dan allowlist media ada;
- resolver normal mengandung syarat kategori published;
- preview token 15 menit dan purpose khusus;
- Public Site membersihkan fragment dan tidak memakai query preview;
- Admin memiliki Preview/Publish/Discard;
- aktivasi kategori published memerlukan snapshot;
- `docs/AI_SESSION_PROMPT.md` tidak termasuk scope audit edit.

- [ ] **Step 2: Daftarkan script root**

Tambahkan:

```json
"test:event-publication": "node scripts/audit-event-publication.mjs"
```

Masukkan ke `npm run check` sebelum format check.

- [ ] **Step 3: Selaraskan dokumentasi aktif**

Perbarui klaim secara faktual:

- publik normal selalu memerlukan kategori published + Event aktif + snapshot;
- Admin dapat preview Event apa pun dengan token sementara;
- edit Event aktif tidak langsung mengubah publik;
- media draf tidak publik;
- migration baru non-destruktif tetapi belum dijalankan pada database utama dalam sesi ini;
- prosedur publish/activate/unpublish dan failure behavior;
- test baru dan batas database E2E.

Catat perubahan dan hasil command aktual pada `docs/WORK_LOG.md`. `PROGRESS.md` hanya menyatakan implemented setelah seluruh test relevan lulus; jika E2E tidak dapat dijalankan, status harus menyebut blocker validasi tersebut.

- [ ] **Step 4: Perbarui spesifikasi dengan cookie media**

Tambahkan bahwa token fragment/header ditukar menjadi cookie HttpOnly 15 menit hanya untuk request GET media karena elemen `<img>`/tautan PDF tidak dapat menambahkan header custom. Cookie tidak memberikan akses mutasi.

- [ ] **Step 5: Jalankan validasi fokus**

Run:

```bash
npm run test:event-publication
npm run check:routes
npm run check:js
npm run check:theme
npm run test:category-events
npm run test:download-relations
npm run test:winner-relations
npm run test:archive-relations
npm run test:faq-relations
npm run test:admin-dialogs
npm --prefix apps/backend run build
npm --prefix apps/backend test -- --runInBand
```

Jalankan E2E hanya bila database disposable terverifikasi. Jalankan browser parity/smoke bila backend, frontend, dan gateway dapat dinyalakan tanpa migration/database destructive.

- [ ] **Step 6: Validasi format dan scope**

Run:

```bash
npx -y prettier@3.9.6 --check <semua-file-yang-diubah-kecuali-docs/AI_SESSION_PROMPT.md>
git diff --check
git status --short
git diff --stat
```

Expected: seluruh pemeriksaan yang dijalankan PASS. Laporkan kegagalan/bagian yang tidak dijalankan apa adanya.

- [ ] **Step 7: Jangan commit atau push**

Biarkan perubahan uncommitted. Pastikan perubahan existing `docs/AI_SESSION_PROMPT.md` masih ada dan tidak tercampur dengan diff implementasi.
