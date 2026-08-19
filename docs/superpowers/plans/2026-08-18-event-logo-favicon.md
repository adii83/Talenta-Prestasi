# Event Logo and Favicon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperbaiki preview logo draf yang `404`, menyimpan logo per Event, memakai logo sama sebagai favicon, dan menyediakan satu ukuran logo navbar untuk desktop, tablet, serta mobile.

**Architecture:** `event_sites.logo_asset_id` menjadi sumber logo Event, sedangkan `site_settings.navbar_logo_size` menyimpan satu ukuran responsif `24..44` piksel. Admin membaca media draf lewat endpoint JWT menjadi Blob/Object URL; preview publik memakai preview token dan website published tetap memakai snapshot serta allowlist media. Runtime Public Site menerapkan logo, ukuran, dan favicon dari bootstrap Event yang sama.

**Tech Stack:** NestJS 11, TypeORM 1.1, PostgreSQL, Jest, JavaScript browser native, HTML/CSS responsif, Node.js assert audit, Puppeteer/Chrome DevTools.

**Spec:** `docs/superpowers/specs/2026-08-18-event-logo-favicon-design.md`

## Global Constraints

- Logo dimiliki setiap `EventSite`; jangan membaca logo Kategori atau maskot sebagai sumber runtime baru.
- `mascot_asset_id` tetap khusus maskot dan tidak boleh ditulis oleh flow Logo & Tema.
- Satu asset logo dipakai untuk navbar dan favicon.
- Satu `navbarLogoSize` berlaku pada desktop, tablet, dan mobile; rentang `24..44`, default `36`.
- Footer mempertahankan ukuran existing dan tidak mengikuti slider.
- Logo hanya PNG, JPEG, atau WebP, maksimum 5 MB; validasi MIME dan signature backend existing tetap berlaku.
- Rasio 1:1 serta background transparan adalah rekomendasi, bukan validasi keras.
- Tidak ada remove-background, Python, AI, pemrosesan gambar, atau dependency baru.
- Public media tanpa preview token/allowlist tetap tertutup; jangan melemahkan `404 Media not found`.
- Jangan mengubah `.env`, CORS, credential, Ruflo, MCP, AgentDB Bridge, atau `CLAUDE_FLOW_DISABLE_BRIDGE=1`.
- Jangan menjalankan migration atau seed tanpa izin operasional terpisah.
- Jangan commit, push, merge, release, publish ke layanan eksternal, atau deploy.
- Pertahankan semua perubahan existing dan jangan mengubah file di luar scope.
- Catat hasil faktual di `docs/WORK_LOG.md`; jangan ubah `PROGRESS.md` kecuali status proyek keseluruhan benar-benar berubah.

## Struktur File

**Schema dan snapshot:**

- Create `apps/backend/src/database/migrations/1786759200000-AddEventLogoSettings.ts` untuk field, constraint, backfill, dan rollback non-destruktif.
- Modify `apps/backend/src/entities/event-site.entity.ts` untuk `logoAssetId` dan relasi logo.
- Modify `apps/backend/src/entities/site-settings.entity.ts` untuk `navbarLogoSize`.
- Modify `apps/backend/src/public/workspace-snapshot.service.ts` untuk capture/restore logo dan kompatibilitas snapshot lama.
- Modify `apps/backend/src/database/migrations/reset-category-event-schema.spec.ts` serta `apps/backend/src/public/public-content.service.spec.ts` untuk receipt migration/snapshot.

**Settings dan media Admin:**

- Modify `apps/backend/src/admin/admin.controller.ts` untuk DTO `logoAssetId: string | null` dan `navbarLogoSize`.
- Modify `apps/backend/src/admin/admin.service.ts` untuk read/write/validasi logo Event.
- Modify `apps/backend/src/admin/admin.service.spec.ts` untuk kontrak settings.
- Modify `apps/backend/src/media/media.controller.ts` dan `apps/backend/src/media/media.service.ts` untuk binary media Admin terautentikasi.
- Modify `apps/backend/src/media/media.controller.spec.ts` untuk route; create `apps/backend/src/media/media.service.spec.ts` untuk authorization dan MIME.

**Public snapshot dan runtime:**

- Modify `apps/backend/src/public/public-content.service.ts` dan spec untuk logo Event + ukuran.
- Modify `apps/backend/src/media/media.service.ts` agar preview token mengenali `event.logo_asset_id`.
- Modify `apps/backend/src/admin/event-publication.service.spec.ts` untuk allowlist logo.
- Modify `packages/shared/js/data/repositories/settings-repository.js` untuk schema settings client.
- Modify `apps/public-site/assets/js/runtime.js` untuk variable ukuran dan favicon dinamis.
- Modify `apps/public-site/assets/css/main.css` untuk navbar gambar responsif tanpa background/bingkai.

**Admin UI dan audit:**

- Modify `packages/shared/js/core/api-client.js` untuk mode response Blob yang tetap memakai bearer JWT.
- Modify `packages/shared/js/core/media-client.js` untuk `adminPreviewUrl()` dan `revokePreviewUrl()`.
- Modify `apps/admin/index.html` untuk copy upload dan slider.
- Modify `apps/admin/js/shell/settings-editor.js` untuk Blob preview, ukuran, save/revert, dan cleanup.
- Modify `scripts/audit-theme-sync.mjs`; create `scripts/audit-event-logo.mjs`; modify `package.json` untuk test audit terfokus.
- Modify `docs/ARCHITECTURE.md`, `docs/ADMIN_SPEC.md`, `docs/DATA_MODEL.md`, `docs/TESTING.md`, dan `docs/WORK_LOG.md` setelah receipt tersedia.

---

### Task 1: Schema logo Event dan kompatibilitas snapshot

**Files:**

- Create: `apps/backend/src/database/migrations/1786759200000-AddEventLogoSettings.ts`
- Modify: `apps/backend/src/entities/event-site.entity.ts`
- Modify: `apps/backend/src/entities/site-settings.entity.ts`
- Modify: `apps/backend/src/public/workspace-snapshot.service.ts`
- Modify: `apps/backend/src/database/migrations/reset-category-event-schema.spec.ts`
- Modify: `apps/backend/src/public/public-content.service.spec.ts`

**Interfaces:**

```ts
EventSite.logoAssetId: string | null;
EventSite.logoAsset: MediaAsset | null;
SiteSettings.navbarLogoSize: number;
```

Migration:

```sql
event_sites.logo_asset_id uuid NULL REFERENCES media_assets(id) ON DELETE SET NULL
site_settings.navbar_logo_size smallint NOT NULL DEFAULT 36
CHECK (navbar_logo_size BETWEEN 24 AND 44)
```

- [ ] **Step 1: Tulis failing migration test**

Tambahkan import dan test pada `reset-category-event-schema.spec.ts`:

```ts
import { AddEventLogoSettings1786759200000 } from "./1786759200000-AddEventLogoSettings";

it("adds Event-scoped logo and bounded navbar size without deleting legacy assets", async () => {
  const queries: string[] = [];
  const runner = {
    query: jest.fn((sql: string) => {
      queries.push(sql.trim());
      return Promise.resolve();
    }),
  };

  await new AddEventLogoSettings1786759200000().up(runner as never);

  const source = queries.join("\n");
  expect(source).toContain("ADD COLUMN logo_asset_id uuid");
  expect(source).toContain("ADD COLUMN navbar_logo_size smallint");
  expect(source).toContain("BETWEEN 24 AND 44");
  expect(source).toContain("event.mascot_asset_id");
  expect(source).toContain("category.logo_asset_id");
  expect(source).not.toContain("DROP COLUMN mascot_asset_id");
  expect(source).not.toContain("DROP COLUMN logo_asset_id");
});
```

- [ ] **Step 2: Tulis failing snapshot compatibility tests**

Di `public-content.service.spec.ts`, tambah dua test pada `WorkspaceSnapshotService`:

```ts
it("captures Event logo with the workspace", async () => {
  const db = {
    query: jest.fn((sql: string) =>
      Promise.resolve(
        sql.includes("FROM event_sites")
          ? [
              {
                id: "event-1",
                name: "Octal",
                description: "",
                logo_asset_id: "logo-1",
                mascot_asset_id: null,
                fallback_icon: "star",
              },
            ]
          : [{ rows: [] }],
      ),
    ),
  };

  const snapshot = await new WorkspaceSnapshotService(db as never).capture(
    "event-1",
  );

  expect(snapshot.rows.event_sites[0].logo_asset_id).toBe("logo-1");
});

it("restores legacy snapshots without clearing the current Event logo", async () => {
  const calls: Array<{ sql: string; parameters?: unknown[] }> = [];
  const executor = {
    query: jest.fn((sql: string, parameters?: unknown[]) => {
      calls.push({ sql, parameters });
      return Promise.resolve([]);
    }),
  };
  const service = new WorkspaceSnapshotService({} as never);

  await service.restore(
    "event-1",
    {
      schemaVersion: 1,
      eventId: "event-1",
      rows: {
        event_sites: [
          {
            id: "event-1",
            name: "Octal",
            description: "",
            mascot_asset_id: null,
            fallback_icon: "star",
          },
        ],
        site_settings: [
          {
            event_site_id: "event-1",
            primary_color: "#123456",
            navigation: {},
            contact: {},
            footer: {},
            seo: {},
          },
        ],
      },
    },
    executor,
  );

  const eventUpdate = calls.find(({ sql }) =>
    sql.includes("UPDATE event_sites"),
  );
  expect(eventUpdate?.sql).toContain(
    "CASE WHEN $6 THEN $7::uuid ELSE logo_asset_id END",
  );
  const settingsInsert = calls.find(({ sql }) =>
    sql.includes("jsonb_populate_recordset"),
  );
  expect(settingsInsert?.parameters?.[0]).toContain('"navbar_logo_size":36');
});
```

Snapshot baru dengan `logo_asset_id: null` juga harus memiliki assertion bahwa restore menghapus logo; gunakan flag boolean terpisah agar `undefined` berbeda dari `null`.

- [ ] **Step 3: Jalankan tests dan pastikan RED**

```bash
npm --prefix apps/backend test -- --runInBand database/migrations/reset-category-event-schema.spec.ts public/public-content.service.spec.ts
```

Expected: FAIL karena migration, entity field, query capture, dan restore kompatibel belum tersedia.

- [ ] **Step 4: Implementasikan migration minimum**

`up()`:

```ts
await runner.query(`
  ALTER TABLE event_sites
    ADD COLUMN logo_asset_id uuid REFERENCES media_assets(id) ON DELETE SET NULL
`);
await runner.query(`
  UPDATE event_sites event
  SET logo_asset_id=COALESCE(event.mascot_asset_id,category.logo_asset_id)
  FROM competition_categories category
  WHERE category.id=event.category_id AND event.logo_asset_id IS NULL
`);
await runner.query(`
  ALTER TABLE site_settings
    ADD COLUMN navbar_logo_size smallint NOT NULL DEFAULT 36,
    ADD CONSTRAINT chk_site_settings_navbar_logo_size
      CHECK (navbar_logo_size BETWEEN 24 AND 44)
`);
```

`down()` hanya menghapus constraint, `navbar_logo_size`, lalu `event_sites.logo_asset_id`. Jangan mengubah asset lama.

- [ ] **Step 5: Tambahkan entity fields**

Pada `EventSite`:

```ts
@Column({ name: 'logo_asset_id', type: 'uuid', nullable: true })
logoAssetId!: string | null;

@ManyToOne(() => MediaAsset, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn({ name: 'logo_asset_id' })
logoAsset!: MediaAsset | null;
```

Pada `SiteSettings`:

```ts
@Column({ name: 'navbar_logo_size', type: 'smallint', default: 36 })
navbarLogoSize!: number;
```

- [ ] **Step 6: Implementasikan snapshot baru dan compatibility shim**

Capture:

```sql
SELECT id,name,description,logo_asset_id,mascot_asset_id,fallback_icon
FROM event_sites
WHERE id=$1 AND deleted_at IS NULL
```

Restore Event memakai flag:

```ts
const hasLogo = Object.prototype.hasOwnProperty.call(event, "logo_asset_id");
```

SQL:

```sql
UPDATE event_sites
SET name=$2,description=$3,mascot_asset_id=$4,fallback_icon=$5,
    logo_asset_id=CASE WHEN $6 THEN $7::uuid ELSE logo_asset_id END,
    version=version+1,updated_at=now()
WHERE id=$1
```

Sebelum `jsonb_populate_recordset`, clone row `site_settings` dan isi:

```ts
navbar_logo_size: row.navbar_logo_size ?? 36;
```

- [ ] **Step 7: Jalankan tests dan build sampai GREEN**

```bash
npm --prefix apps/backend test -- --runInBand database/migrations/reset-category-event-schema.spec.ts public/public-content.service.spec.ts
npm --prefix apps/backend run build
```

Expected: seluruh command exit `0`.

### Task 2: Kontrak settings logo Event

**Files:**

- Modify: `apps/backend/src/admin/admin.controller.ts`
- Modify: `apps/backend/src/admin/admin.service.ts`
- Modify: `apps/backend/src/admin/admin.service.spec.ts`

**Interfaces:**

```ts
interface EventSettingsInput {
  eventDescription?: string;
  primaryColor: string;
  logoAssetId?: string | null;
  navbarLogoSize: number;
  navigation: Record<string, boolean>;
  contact: Record<string, string>;
  footer: Record<string, string>;
  seo?: Record<string, string>;
}
```

Settings response:

```ts
{
  eventName: string;
  eventDescription: string;
  logoAssetId: string | null;
  logoUrl: string | null;
  navbarLogoSize: number;
  primaryColor: string;
  navigation: Record<string, boolean>;
  contact: Record<string, string>;
  footer: Record<string, string>;
  seo: Record<string, string>;
}
```

- [ ] **Step 1: Tulis failing settings read test**

Tambahkan pada `admin.service.spec.ts` fixture repository/query builder yang mengembalikan Event dengan `logoAssetId: 'logo-1'`, lalu:

```ts
expect(result.data).toMatchObject({
  logoAssetId: "logo-1",
  logoUrl: "/api/v1/admin/events/event-1/media/logo-1",
  navbarLogoSize: 40,
});
expect(dataSource.query).toHaveBeenCalledWith(
  expect.stringContaining('navbar_logo_size AS "navbarLogoSize"'),
  ["event-1"],
);
```

- [ ] **Step 2: Tulis failing settings write tests**

Test pertama memberi PNG aktif organisasi sama dan memeriksa:

```ts
expect(manager.query).toHaveBeenCalledWith(
  expect.stringContaining("SET description=$2,logo_asset_id=$3"),
  ["event-1", "Deskripsi", "logo-1"],
);
expect(manager.query).toHaveBeenCalledWith(
  expect.stringContaining("navbar_logo_size"),
  expect.arrayContaining(["event-1", 40]),
);
```

Test kedua memakai `logoAssetId: null` dan memastikan parameter update `null`.

Test table-driven menolak `application/pdf`, `image/svg+xml`, asset nonaktif, dan asset organisasi lain dengan `Invalid logo asset`.

- [ ] **Step 3: Jalankan tests dan pastikan RED**

```bash
npm --prefix apps/backend test -- --runInBand admin/admin.service.spec.ts
```

Expected: FAIL karena settings masih membaca/menulis maskot dan belum mengembalikan ukuran/logo.

- [ ] **Step 4: Perketat DTO**

Gunakan validasi null eksplisit:

```ts
@IsOptional()
@ValidateIf((_object, value) => value !== null)
@IsUUID()
logoAssetId?: string | null;

@Type(() => Number)
@IsInt()
@Min(24)
@Max(44)
navbarLogoSize!: number;
```

Import `ValidateIf`.

- [ ] **Step 5: Implementasikan settings read**

Query event harus menyediakan `logoAssetId`. Query settings menambah:

```sql
navbar_logo_size AS "navbarLogoSize"
```

Response:

```ts
logoAssetId: event.logoAssetId,
logoUrl: event.logoAssetId
  ? `/api/v1/admin/events/${eventId}/media/${event.logoAssetId}`
  : null,
navbarLogoSize: rows[0]?.navbarLogoSize ?? 36,
```

- [ ] **Step 6: Implementasikan settings write dan MIME validation**

Owned query harus memeriksa organisasi, status, dan MIME:

```sql
SELECT asset.id
FROM media_assets asset
JOIN event_sites event ON event.organization_id=asset.organization_id
WHERE asset.id=$1 AND event.id=$2 AND asset.status='active'
  AND asset.mime_type=ANY($3::text[])
```

Parameter MIME:

```ts
["image/png", "image/jpeg", "image/webp"];
```

Update:

```sql
UPDATE event_sites
SET description=$2,logo_asset_id=$3,updated_at=now()
WHERE id=$1
```

Upsert `site_settings` menambah `navbar_logo_size` pada insert dan conflict update. Jangan menyentuh `mascot_asset_id`.

- [ ] **Step 7: Jalankan test fokus dan build sampai GREEN**

```bash
npm --prefix apps/backend test -- --runInBand admin/admin.service.spec.ts
npm --prefix apps/backend run build
```

### Task 3: Endpoint media Admin terautentikasi

**Files:**

- Modify: `apps/backend/src/media/media.controller.ts`
- Modify: `apps/backend/src/media/media.service.ts`
- Modify: `apps/backend/src/media/media.controller.spec.ts`
- Create: `apps/backend/src/media/media.service.spec.ts`

**Interfaces:**

```ts
MediaService.adminFile(eventId: string, userId: string, assetId: string): Promise<{
  asset: MediaAsset;
  buffer: Buffer;
}>;
```

Route:

```text
GET /api/v1/admin/events/:eventId/media/:assetId
```

- [ ] **Step 1: Tulis failing route metadata test**

Di `media.controller.spec.ts`:

```ts
expect(
  Reflect.getMetadata(PATH_METADATA, MediaController.prototype.adminFile),
).toBe("admin/events/:eventId/media/:assetId");
```

Pastikan `GUARDS_METADATA` memuat `JwtAuthGuard` untuk method tersebut.

- [ ] **Step 2: Tulis failing service authorization tests**

`media.service.spec.ts` memakai direktori temporary OS, file kecil nyata, repository `findOneBy`, DB `query`, `ConfigService`, dan `PreviewTokenService` stub. Setup minimum:

```ts
const root = await mkdtemp(resolve(tmpdir(), "talenta-media-"));
const asset = {
  id: "22222222-2222-4222-8222-222222222222",
  organizationId: "organization-1",
  storageKey: "organization-1/logo.png",
  originalName: "logo.png",
  mimeType: "image/png",
  byteSize: 8,
  status: "active",
};
await mkdir(resolve(root, "organization-1"), { recursive: true });
await writeFile(resolve(root, asset.storageKey), Buffer.from("logo"));
const assets = { findOneBy: jest.fn().mockResolvedValue(asset) };
const db = { query: jest.fn().mockResolvedValue([{ id: asset.id }]) };
const config = { get: jest.fn().mockReturnValue(root) };
const service = new MediaService(
  assets as never,
  db as never,
  config as never,
  { verify: jest.fn() } as never,
);
```

Test sukses:

```ts
const result = await service.adminFile(
  "11111111-1111-4111-8111-111111111111",
  "33333333-3333-4333-8333-333333333333",
  asset.id,
);
expect(result.asset).toBe(asset);
expect(result.buffer.toString()).toBe("logo");
```

Test denial mengganti `db.query` menjadi `mockResolvedValue([])` dan memeriksa `rejects.toThrow("Media not found")`. Test status/tenant memastikan SQL memuat status aktif dan equality organisasi. Bersihkan root dengan `rm(root, { recursive: true, force: true })` pada `afterEach`.

Authorized SQL harus mengandung:

```sql
JOIN organization_memberships membership
  ON membership.organization_id=event.organization_id
WHERE event.id=$1 AND membership.user_id=$2
  AND asset.id=$3 AND asset.organization_id=event.organization_id
  AND asset.status='active' AND event.deleted_at IS NULL
```

Failure selalu `NotFoundException('Media not found')` agar tenant existence tidak bocor.

- [ ] **Step 3: Jalankan tests dan pastikan RED**

```bash
npm --prefix apps/backend test -- --runInBand media/media.controller.spec.ts media/media.service.spec.ts
```

- [ ] **Step 4: Implementasikan `adminFile()`**

Pisahkan helper binary private agar `file()` public dan `adminFile()` berbagi lookup/read tanpa mengubah policy public. Jangan menambahkan role write requirement; semua membership yang bisa membaca Event boleh membaca preview media organisasi Event.

- [ ] **Step 5: Tambahkan controller response aman**

Method memakai `@UseGuards(JwtAuthGuard)`, dua `ParseUUIDPipe`, `@CurrentUser`, dan header:

```text
X-Content-Type-Options: nosniff
Cache-Control: private, no-store
Content-Disposition: inline; filename*=UTF-8''logo.png
```

Untuk PDF yang mungkin dipakai endpoint umum, tetap `attachment`; logo hanya image sehingga inline.

- [ ] **Step 6: Jalankan tests dan build sampai GREEN**

```bash
npm --prefix apps/backend test -- --runInBand media/media.controller.spec.ts media/media.service.spec.ts
npm --prefix apps/backend run build
```

### Task 4: Public snapshot, preview token, dan allowlist logo Event

**Files:**

- Modify: `apps/backend/src/public/public-content.service.ts`
- Modify: `apps/backend/src/public/public-content.service.spec.ts`
- Modify: `apps/backend/src/media/media.service.ts`
- Modify: `apps/backend/src/media/media.service.spec.ts`
- Modify: `apps/backend/src/admin/event-publication.service.spec.ts`

**Interfaces:**

`PublicContentService.build()` bootstrap:

```ts
bootstrap.site.logoAssetId: string | null;
bootstrap.site.logoUrl: string | null;
bootstrap.settings.navbarLogoSize: number;
```

- [ ] **Step 1: Tulis failing public content test**

Ubah fixture site dari `logoAssetId: null` menjadi:

```ts
logoAssetId: '11111111-1111-4111-8111-111111111111',
navbarLogoSize: 42,
```

Assert:

```ts
expect(snapshot.bootstrap.site).toMatchObject({
  logoAssetId: "11111111-1111-4111-8111-111111111111",
  logoUrl: "/api/v1/public/media/11111111-1111-4111-8111-111111111111",
});
expect(snapshot.bootstrap.settings).toMatchObject({ navbarLogoSize: 42 });
expect(db.query.mock.calls[0][0]).toContain(
  'event.logo_asset_id AS "logoAssetId"',
);
expect(db.query.mock.calls[0][0]).not.toContain(
  'category.logo_asset_id AS "logoAssetId"',
);
```

- [ ] **Step 2: Tulis failing preview media policy test**

Dalam `media.service.spec.ts`, verifikasi query preview token memuat:

```sql
event.logo_asset_id=asset.id
```

Test token valid + logo Event menghasilkan binary, sedangkan request tanpa token dan tanpa `event_publication_assets` tetap melempar `Media not found`.

- [ ] **Step 3: Perkuat publish allowlist test**

Gunakan UUID logo nyata dalam `publicSnapshot.bootstrap.site.logoAssetId`, lalu assert insert allowlist menerima array yang memuat UUID:

```ts
expect(manager.query).toHaveBeenCalledWith(
  expect.stringContaining("INSERT INTO event_publication_assets"),
  ["event-1", [logoId], "organization-1"],
);
```

- [ ] **Step 4: Jalankan tests dan pastikan RED**

```bash
npm --prefix apps/backend test -- --runInBand public/public-content.service.spec.ts media/media.service.spec.ts admin/event-publication.service.spec.ts
```

- [ ] **Step 5: Implementasikan query dan DTO public**

`SiteRow` menambah `navbarLogoSize`. `SITE_QUERY` mengganti logo Kategori dengan:

```sql
event.logo_asset_id AS "logoAssetId",
settings.navbar_logo_size AS "navbarLogoSize"
```

`settingsDto()` menambah:

```ts
navbarLogoSize: site.navbarLogoSize ?? 36;
```

- [ ] **Step 6: Perluas policy preview media**

Tambahkan `event.logo_asset_id=asset.id OR` di grup reference. Jangan mengubah branch public non-preview.

- [ ] **Step 7: Jalankan tests dan build sampai GREEN**

```bash
npm --prefix apps/backend test -- --runInBand public/public-content.service.spec.ts media/media.service.spec.ts admin/event-publication.service.spec.ts
npm --prefix apps/backend run build
```

### Task 5: Blob response dan Object URL media Admin

**Files:**

- Modify: `packages/shared/js/core/api-client.js`
- Modify: `packages/shared/js/core/media-client.js`
- Create: `scripts/audit-event-logo.mjs`
- Modify: `package.json`

**Interfaces:**

```js
TalentaApi.request(path, { responseType: 'blob' }) => Promise<Blob>
TalentaMedia.adminPreviewUrl(assetId, { siteId? }) => Promise<string>
TalentaMedia.revokePreviewUrl(url) => void
```

- [ ] **Step 1: Buat failing source/runtime audit**

`scripts/audit-event-logo.mjs` membaca kedua client, menjalankan `api-client.js` dalam VM dengan fake `fetch`, dan assert:

```js
assert.match(apiClient, /responseType === "blob"/);
assert.match(mediaClient, /async function adminPreviewUrl/);
assert.match(mediaClient, /URL\.createObjectURL/);
assert.match(mediaClient, /URL\.revokeObjectURL/);
```

Fake response memiliki `blob()` yang mengembalikan sentinel. Simpan token uji `test-access-token` pada fake `sessionStorage`, panggil:

```js
const result = await TalentaApi.request("/admin/events/event-1/media/asset-1", {
  responseType: "blob",
});
assert.equal(result, blobSentinel);
assert.equal(
  fetchCalls[0].options.headers.get("Authorization"),
  "Bearer test-access-token",
);
```

Token hanya fixture lokal audit, bukan credential nyata.

Daftarkan:

```json
"test:event-logo": "node scripts/audit-event-logo.mjs"
```

- [ ] **Step 2: Jalankan audit dan pastikan RED**

```bash
npm run test:event-logo
```

- [ ] **Step 3: Implementasikan response mode pada API client**

Jangan meneruskan `responseType` ke native `fetch`; destructure internal option sebelum fetch:

```js
const { responseType, timeoutMs, ...fetchOptions } = options;
```

Setelah `fetch`, sebelum parse payload sukses:

```js
if (responseType === "blob" && response.ok) return response.blob();

const text = await response.text();
let payload = null;
try {
  payload = text ? JSON.parse(text) : null;
} catch {
  if (!response.ok)
    throw new ApiError(
      `Permintaan gagal (${response.status})`,
      response.status,
    );
  throw new ApiError("Respons server tidak valid");
}
if (!response.ok) {
  if (response.status === 401 && accessToken) setToken("");
  const message = Array.isArray(payload?.message)
    ? payload.message.join(", ")
    : payload?.message || `Permintaan gagal (${response.status})`;
  throw new ApiError(message, response.status, payload);
}
return payload;
```

Pertahankan timeout, bearer JWT, credentials, dan handling `401` existing.

- [ ] **Step 4: Implementasikan helper Object URL**

```js
async function adminPreviewUrl(assetId, { siteId } = {}) {
  const event = siteId || window.parent?.TalentaAdminAuth?.currentEvent?.()?.id;
  if (!event || !assetId) return "";
  const blob = await TalentaApi.request(
    `/admin/events/${event}/media/${assetId}`,
    { responseType: "blob" },
  );
  return URL.createObjectURL(blob);
}

function revokePreviewUrl(value) {
  if (String(value || "").startsWith("blob:")) URL.revokeObjectURL(value);
}
```

Export kedua helper melalui `TalentaMedia`.

- [ ] **Step 5: Jalankan audit dan JS check sampai GREEN**

```bash
npm run test:event-logo
npm run check:js
```

### Task 6: Form Admin, ukuran lintas device, dan lifecycle preview logo

**Files:**

- Modify: `apps/admin/index.html`
- Modify: `apps/admin/js/shell/settings-editor.js`
- Modify: `packages/shared/js/data/repositories/settings-repository.js`
- Modify: `apps/public-site/assets/css/main.css`
- Modify: `scripts/audit-event-logo.mjs`
- Modify: `scripts/audit-theme-sync.mjs`

**Interfaces:**

Client settings:

```js
identity.logoAssetId: string | null
identity.logo: string // Object URL hanya pada state memori Admin; jangan persist blob: ke localStorage
identity.navbarLogoSize: number // normalized 24..44, default 36
```

API body:

```js
logoAssetId: globalState.identity.logoAssetId ?? null,
navbarLogoSize: globalState.identity.navbarLogoSize,
```

- [ ] **Step 1: Perluas failing audit untuk form dan state**

Assert `apps/admin/index.html` memuat:

```html
<small
  >Rekomendasi: rasio 1:1 dengan background transparan. PNG, JPG, atau WebP,
  maksimal 5 MB.</small
>
<input id="navbarLogoSize" type="range" min="24" max="44" step="1" />
<output id="navbarLogoSizeValue" for="navbarLogoSize">36 px</output>
```

Assert editor memuat:

```js
TalentaMedia.adminPreviewUrl;
globalState.identity.navbarLogoSize;
TalentaMedia.revokePreviewUrl;
```

Assert repository normalize clamp:

```js
Math.min(44, Math.max(24, ...))
```

- [ ] **Step 2: Jalankan audit dan pastikan RED**

```bash
npm run test:event-logo
npm run check:theme
```

- [ ] **Step 3: Tambahkan field form dan CSS kontrol**

Letakkan slider di blok upload, setelah tombol hapus. Label:

```text
Ukuran logo navbar
Berlaku pada desktop, tablet, dan mobile.
```

Style range menggunakan native control, visible focus, dan output monospace. Ubah `.admin-logo-preview img` menjadi `object-fit: contain`; preview upload tidak memotong gambar.

- [ ] **Step 4: Normalisasi settings client**

Baseline `identity`:

```js
logoAssetId: null,
navbarLogoSize: 36,
```

Pada `normalizeGlobalSettings()` schema v3:

```js
identity: {
  ...b.identity,
  ...source.identity,
  logoAssetId: source.identity?.logoAssetId ?? null,
  navbarLogoSize: Math.min(
    44,
    Math.max(24, Number(source.identity?.navbarLogoSize) || 36),
  ),
},
```

Schema tidak perlu dinaikkan karena field additive memiliki fallback. `saveGlobalSettings()` tidak boleh menyimpan Object URL; clone state sebelum serialize:

```js
const persisted = globalClone(s);
if (String(persisted.identity.logo || "").startsWith("blob:"))
  persisted.identity.logo = "";
localStorage.setItem(globalSettingsStorageKey(), JSON.stringify(persisted));
```

Return dan `CustomEvent.detail` tetap boleh membawa `s` agar preview satu dokumen menggunakan Object URL aktif. Audit membaca nilai `localStorage` setelah save dan memastikan tidak memuat `blob:`.

- [ ] **Step 5: Implementasikan lifecycle Blob preview**

Buat helper dalam settings editor:

```js
let logoPreviewObjectUrl = "";

function replaceLogoPreviewUrl(next = "") {
  if (logoPreviewObjectUrl && logoPreviewObjectUrl !== next)
    TalentaMedia.revokePreviewUrl(logoPreviewObjectUrl);
  logoPreviewObjectUrl = next.startsWith("blob:") ? next : "";
  globalState.identity.logo = next;
}

async function hydrateLogoPreview(assetId) {
  if (!assetId) return replaceLogoPreviewUrl("");
  const url = await TalentaMedia.adminPreviewUrl(assetId);
  replaceLogoPreviewUrl(url);
}
```

Upload: validasi `file.type` lagi terhadap PNG/JPEG/WebP, upload, lalu `await hydrateLogoPreview(asset.assetId)`. Reset input value pada `finally` agar file sama dapat dipilih ulang.

Load/revert: hydrate state dari data API terlebih dahulu; setelah object settings tersimpan ke cache, panggil `await hydrateLogoPreview(data.logoAssetId)`, lalu `fill()`/render. Jika Blob gagal, simpan asset ID, kosongkan visual, render fallback, dan lempar agar toast error tampil.

Delete: set `logoAssetId = null`, revoke URL, kosongkan logo. `pagehide` dan `beforeunload` mencabut URL.

- [ ] **Step 6: Hubungkan ukuran ke save/load/preview**

`fill()` mengisi range/output. `readForm()` mengisi integer. `renderPreview()` menetapkan pada root preview:

```js
root.style.setProperty(
  "--navbar-logo-size",
  `${globalState.identity.navbarLogoSize}px`,
);
```

GET mapping memakai `data.navbarLogoSize ?? 36`; PUT selalu mengirim angka.

- [ ] **Step 7: Jalankan audit/theme/JS sampai GREEN**

```bash
npm run test:event-logo
npm run check:theme
npm run check:js
```

### Task 7: Navbar responsif, favicon, dan Public Site runtime

**Files:**

- Modify: `apps/public-site/assets/js/runtime.js`
- Modify: `apps/public-site/assets/css/main.css`
- Modify: `scripts/audit-event-logo.mjs`

**Interfaces:**

```js
function applyEventFavicon(url) => void
```

CSS variable:

```css
--navbar-logo-size: 36px;
```

- [ ] **Step 1: Perluas failing audit runtime/CSS**

Assert runtime memuat:

```js
assert.match(runtime, /link\[rel="icon"\]\[data-talenta-event-icon\]/);
assert.match(runtime, /settings\.identity\.navbarLogoSize/);
assert.match(runtime, /--navbar-logo-size/);
```

Assert CSS memuat selector gambar desktop dan mobile, `object-fit: contain`, `background: transparent`, `border-radius: 0`, serta tidak membatasi hanya media query desktop.

- [ ] **Step 2: Jalankan audit dan pastikan RED**

```bash
npm run test:event-logo
```

- [ ] **Step 3: Implementasikan favicon dinamis**

```js
function applyEventFavicon(url) {
  let link = document.querySelector(
    'link[rel="icon"][data-talenta-event-icon]',
  );
  if (!url) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.dataset.talentaEventIcon = "";
    document.head.append(link);
  }
  link.href = url;
}
```

Panggil setelah logo settings diterapkan. Jangan menghapus favicon statis lain yang tidak memiliki marker.

- [ ] **Step 4: Terapkan ukuran runtime**

Di `applyGlobalSettings()`:

```js
const logoSize = Math.min(
  44,
  Math.max(24, Number(settings.identity.navbarLogoSize) || 36),
);
document.documentElement.style.setProperty(
  "--navbar-logo-size",
  `${logoSize}px`,
);
```

Bootstrap identity menyalin `navbarLogoSize: data.settings.navbarLogoSize ?? 36`.

- [ ] **Step 5: Implementasikan CSS desktop/tablet/mobile**

Base fallback tetap 36/32. Image state:

```css
.navbar__logo:has(img),
.mobile-header__logo:has(img) {
  width: var(--navbar-logo-size, 36px);
  height: var(--navbar-logo-size, 36px);
  flex: none;
  background: transparent;
  border-radius: 0;
}

.navbar__logo img,
.mobile-header__logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 0;
}
```

Pisahkan footer dari rule gabungan existing agar `.footer__logo img` tetap ukuran/radius existing dan tidak ikut slider. Variable maksimum 44 tetap muat pada navbar 68 dan mobile header 52.

- [ ] **Step 6: Jalankan audit dan checks sampai GREEN**

```bash
npm run test:event-logo
npm run check:theme
npm run check:js
npm run check:routes
```

### Task 8: Dokumentasi aktif dan receipt faktual

**Files:**

- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/ADMIN_SPEC.md`
- Modify: `docs/DATA_MODEL.md`
- Modify: `docs/TESTING.md`
- Modify: `docs/WORK_LOG.md`

**Interfaces:** Tidak ada API baru selain kontrak yang sudah ditetapkan Task 1–7.

- [ ] **Step 1: Selaraskan arsitektur dan data model**

Dokumentasikan:

- logo berada di `event_sites.logo_asset_id`;
- ukuran berada di `site_settings.navbar_logo_size`;
- logo berbeda dari maskot dan logo Kategori legacy;
- media Admin JWT berbeda dari media publik preview/allowlist;
- snapshot lama kompatibel dan migration tidak menulis ulang public snapshot.

- [ ] **Step 2: Selaraskan Admin spec**

Copy aktif menyebut rekomendasi 1:1/transparan, PNG/JPG/WebP 5 MB, slider `24..44`, satu ukuran untuk desktop/tablet/mobile, favicon sama, dan tidak ada remove-background.

- [ ] **Step 3: Tambahkan testing checklist**

`docs/TESTING.md` memuat unit/security/browser scenarios dari spec, termasuk dua Event satu Kategori, published-vs-draft, reload Blob preview, favicon, hapus/discard, dan viewport 1440/768/390.

- [ ] **Step 4: Catat Work Log secara faktual**

Tambahkan entri 2026-08-18 hanya setelah command dijalankan. Cantumkan failure RED, GREEN, file aktual, hasil unit/build/audit/browser, serta kendala. Jangan menyatakan migration diterapkan karena plan melarang menjalankannya.

- [ ] **Step 5: Jalankan format terfokus dan diff check**

```bash
npx -y prettier@3.9.6 --check docs/ARCHITECTURE.md docs/ADMIN_SPEC.md docs/DATA_MODEL.md docs/TESTING.md docs/WORK_LOG.md docs/superpowers/specs/2026-08-18-event-logo-favicon-design.md docs/superpowers/plans/2026-08-18-event-logo-favicon.md
git diff --check
```

### Task 9: Regression gate dan acceptance browser

**Files:** Modify hanya sumber yang terbukti menyebabkan defect; setiap fix baru mendapat regression assertion sebelum production edit.

**Interfaces:** Tidak ada interface baru.

- [ ] **Step 1: Jalankan backend regression penuh**

```bash
npm --prefix apps/backend test -- --runInBand
npm --prefix apps/backend run build
```

Expected: seluruh suite PASS dan build exit `0`.

- [ ] **Step 2: Jalankan frontend gate relevan**

```bash
npm run test:event-logo
npm run check:routes
npm run check:js
npm run check:theme
npm run test:event-publication
npm run test:event-period-ux
```

Jangan klaim `npm run test:theme-browser` lulus bila fixture Unduh masih berhenti pada `#unduh .doc-card`; jalankan skenario logo terfokus terpisah.

- [ ] **Step 3: Jalankan server tanpa memigrasikan database secara implisit**

`DatabaseModule` memakai `migrationsRun: true`; karena migration belum diizinkan, jangan start backend yang menunjuk database existing. Untuk acceptance sebelum izin migration, gunakan database disposable yang sudah diotorisasi atau berhenti dan minta izin migration. Jangan mengubah config untuk menyiasati gate.

- [ ] **Step 4: Setelah migration diizinkan terpisah, uji alur Admin nyata**

Pada database development lokal yang targetnya diverifikasi tanpa mencetak credential:

1. upload PNG transparan;
2. pastikan preview Admin memakai URL `blob:` dan network endpoint Admin `200`, bukan public `404`;
3. reload settings dan pastikan logo kembali;
4. atur slider ke 24, 36, dan 44;
5. periksa preview desktop/tablet/mobile;
6. hapus logo lalu Urungkan edit;
7. simpan draf dan buka **Lihat preview**;
8. pastikan favicon draf sama dengan logo;
9. pastikan website published masih memakai logo lama;
10. publish dan pastikan navbar/favicon berubah;
11. buat/pilih Event sibling dan pastikan logo/ukuran tidak bocor.

- [ ] **Step 5: Uji viewport dan style computed**

Pada `1440x900`, `768x1024`, dan `390x844`, assert:

```text
logo.width <= header.height - 8
logo.height <= header.height - 8
object-fit = contain
background-color = transparent
border-radius = 0px
body.scrollWidth <= viewport width
```

Fallback tanpa logo tetap memiliki background warna dan radius existing.

- [ ] **Step 6: Uji security failure path**

- URL public asset draf tanpa token menghasilkan `404`.
- Endpoint Admin tanpa JWT menghasilkan `401`.
- User organisasi lain tidak mendapat binary dan menerima `404`.
- PDF/SVG sebagai `logoAssetId` ditolak `400`.
- Ukuran 23 atau 45 ditolak DTO `400`.

- [ ] **Step 7: Final diff dan status audit**

```bash
git diff --check
git status --short
git diff -- apps/backend/src apps/admin apps/public-site packages/shared scripts package.json docs
```

Pastikan tidak ada `.env`, upload binary, database/dump, token, credential, private key, file root sementara, atau perubahan Ruflo/MCP. Jangan commit atau push.
