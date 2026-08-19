import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(path, "utf8");
const files = {
  seed: await read("apps/backend/src/database/seed-local.ts"),
  admin: await read("apps/admin/js/shell/portal-dashboard.js"),
  publicApi: await read("apps/public-site/assets/js/public-api.js"),
  archiveList: await read("apps/public-site/assets/js/archive-list.js"),
  archiveDetail: await read("apps/public-site/assets/js/archive-detail.js"),
};

assert.match(files.seed, /INSERT INTO competition_categories/);
assert.match(files.seed, /category_id/);
assert.match(files.seed, /is_active/);
assert.match(files.seed, /site_domains\(category_id/);
const eventInsertColumns = [
  ...files.seed.matchAll(/INSERT INTO event_sites\(([^)]+)\)/g),
].map((match) => match[1]);
assert.equal(eventInsertColumns.length, 2);
for (const columns of eventInsertColumns)
  assert.doesNotMatch(
    columns,
    /organizer_name|publication_status|published_at/,
  );
assert.doesNotMatch(files.seed, /siteId|siteSlug|\n\s*email,?\s*\n/);

assert.match(files.admin, /\/admin\/categories/);
assert.match(files.admin, /\/admin\/events/);
assert.doesNotMatch(files.admin, /\/admin\/sites|\/admin\/competitions/);
assert.match(files.admin, /name="useLatestTemplate" type="checkbox"/);
assert.match(
  files.admin,
  /useLatestTemplate:\s*formBody\.useLatestTemplate === "on"/,
);
assert.match(files.admin, /eventTemplateFields/);
assert.match(
  files.admin,
  /Tema, tampilan halaman, konten Beranda, dan FAQ akan disalin/,
);
assert.match(
  files.admin,
  /Pemenang, dokumen, SK, dan detail Arsip tidak disalin/,
);
assert.match(files.admin, /right\.periodYear/);
assert.match(files.admin, /right\.batchNumber \?\? 1/);
assert.match(files.admin, /right\.createdAt/);
assert.match(files.admin, /right\.id/);
assert.doesNotMatch(files.admin, /templateSourceEventId|sourceEventId/);
assert.match(files.publicApi, /TalentaConfig\.categorySlug/);
assert.match(files.archiveList, /data\.events/);
assert.match(files.archiveDetail, /get\("event"\)/);
assert.doesNotMatch(files.archiveDetail, /get\("id"\)/);

console.log(
  "PASS: kontrak Category → Event, arsip otomatis, dan seed lokal tervalidasi.",
);
