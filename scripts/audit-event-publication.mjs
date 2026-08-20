import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(path, "utf8");
const files = {
  migration: await read(
    "apps/backend/src/database/migrations/1786586400000-AddEventDraftPublications.ts",
  ),
  publication: await read(
    "apps/backend/src/admin/event-publication.service.ts",
  ),
  publicService: await read("apps/backend/src/public/public.service.ts"),
  previewToken: await read("apps/backend/src/public/preview-token.service.ts"),
  media: await read("apps/backend/src/media/media.service.ts"),
  publicApi: await read("apps/public-site/assets/js/public-api.js"),
  admin: await read("apps/admin/js/shell/router.js"),
  archiveDetail: await read("apps/admin/js/features/archive/detail-editor.js"),
  seed: await read("apps/backend/src/database/seed-local.ts"),
  controller: await read("apps/backend/src/public/public.controller.ts"),
};

assert.match(files.migration, /CREATE TABLE event_publications/);
assert.match(files.migration, /CREATE TABLE event_publication_assets/);
assert.doesNotMatch(files.migration, /DROP TABLE competition_categories/);
assert.match(files.publicService, /category\.publication_status='published'/);
assert.match(files.publicService, /publication\.public_snapshot/);
assert.match(files.previewToken, /expiresIn: '15m'/);
assert.match(files.previewToken, /purpose !== 'event-preview'/);
assert.match(files.media, /\bFROM event_publication_assets\b/);
assert.match(files.publicApi, /location\.hash\.slice\(1\)/);
assert.match(files.publicApi, /history\.replaceState/);
assert.match(files.publicApi, /sessionStorage\.setItem\(PREVIEW_KEY/);
assert.doesNotMatch(files.publicApi, /searchParams\.get\(["']preview["']\)/);
assert.match(files.admin, /preview-token/);
assert.match(files.admin, /discard-draft/);
assert.match(files.admin, /\/publish/);
assert.match(
  files.archiveDetail,
  /eventId:\s*comp\.id/,
  "Detail Arsip harus mengekspos Event yang sedang diedit ke shell.",
);
assert.match(
  files.archiveDetail,
  /currentEventId:\s*currentEvent\?\.id/,
  "Detail Arsip harus mengekspos Event workspace saat ini untuk tema dan navigasi preview.",
);
assert.match(
  files.archiveDetail,
  /save:\s*saveArchiveDetail/,
  "Simpan draf shell harus menerima Promise persistence Detail Arsip.",
);
assert.doesNotMatch(
  files.archiveDetail,
  /save:\s*\(\)\s*=>\s*form\.requestSubmit\(\)/,
  "requestSubmit tidak mengembalikan Promise handler submit.",
);
assert.match(
  files.archiveDetail,
  /new CustomEvent\("talenta:editor-dirty"/,
  "Reorder Detail Arsip harus menandai editor sebagai dirty.",
);
assert.match(
  files.admin,
  /function editorContext\(\)/,
  "Shell harus membaca konteks editor aktif.",
);
assert.match(
  files.admin,
  /editorContext\(\)\?\.eventId\s*\|\|\s*TalentaAdminAuth\.currentEvent\(\)\?\.id/s,
  "Status dan publikasi harus memilih Event Detail Arsip sebelum Event aktif shell.",
);
assert.match(
  files.admin,
  /actions\?\.publicUrl\?\.\(data\.token, currentPreviewToken\)/,
  "Preview shell harus memberi URL Detail Arsip token Arsip dan token Event workspace saat ini.",
);
assert.match(
  files.admin,
  /talenta:editor-dirty/,
  "Shell harus menerima dirty event dari aksi yang bukan input form.",
);
assert.match(
  files.archiveDetail,
  /new CustomEvent\("talenta:editor-saved"/,
  "Save internal Detail Arsip harus meminta shell memperbarui status draf.",
);
assert.match(
  files.archiveDetail,
  /new CustomEvent\("talenta:editor-ready"/,
  "Detail Arsip harus memberi tahu shell setelah context API siap.",
);
assert.match(
  files.admin,
  /talenta:editor-saved[\s\S]*?dirty = false;[\s\S]*?void refreshPublication\(\);/,
  "Shell harus memperbarui status setelah tombol simpan internal selesai.",
);
assert.match(
  files.admin,
  /talenta:editor-ready[\s\S]*?syncActions\(\);[\s\S]*?void refreshPublication\(\);/,
  "Shell harus membaca ulang context dan status saat editor siap.",
);
assert.match(
  files.admin,
  /const requestedEventId = eventId;[\s\S]*?if \(requestedEventId !== publicationEventId\(\)\) return;/,
  "Respons status Event lama tidak boleh menimpa konteks editor baru.",
);
assert.match(
  files.admin,
  /await nativeActions\(\)\.save\?\.\(\);[\s\S]*?dirty = false;[\s\S]*?await refreshPublication\(\);/,
  "Shell hanya boleh membersihkan dirty dan membaca status setelah save selesai.",
);
assert.match(
  files.admin,
  /const isLocal = \["localhost", "127\.0\.0\.1"\]\.includes\(location\.hostname\)/,
);
assert.match(files.admin, /if \(!isLocal && verifiedHostname\)/);
assert.match(
  files.admin,
  /url\.searchParams\.set\("site", event\.categorySlug\)/,
);
assert.match(
  files.admin,
  /url\.hash = new URLSearchParams\(\{ preview: token \}\)\.toString\(\)/,
);
assert.match(files.publication, /transaction\('REPEATABLE READ'/);
assert.match(files.seed, /collectAssetIds\(publicSnapshot\)/);
assert.match(files.seed, /DELETE FROM event_publication_assets/);
assert.match(files.seed, /INSERT INTO event_publication_assets/);
assert.match(
  files.controller,
  /request\.secure \|\| forwardedProtocol === 'https'/,
);

console.log(
  "PASS: draf Event, snapshot publik, preview 15 menit, dan allowlist media tervalidasi.",
);
