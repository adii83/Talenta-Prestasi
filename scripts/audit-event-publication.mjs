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
assert.match(files.media, /JOIN event_publication_assets/);
assert.match(files.publicApi, /location\.hash\.slice\(1\)/);
assert.match(files.publicApi, /history\.replaceState/);
assert.match(files.publicApi, /sessionStorage\.setItem\(PREVIEW_KEY/);
assert.doesNotMatch(files.publicApi, /searchParams\.get\(["']preview["']\)/);
assert.match(files.admin, /preview-token/);
assert.match(files.admin, /discard-draft/);
assert.match(files.admin, /\/publish/);
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
