import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dashboard = await readFile(
  "apps/admin/js/shell/portal-dashboard.js",
  "utf8",
);
const shell = await readFile("apps/admin/index.html", "utf8");
const router = await readFile("apps/admin/js/shell/router.js", "utf8");
const editorPaths = [
  "apps/admin/js/features/home/editor.js",
  "apps/admin/js/features/downloads/editor.js",
  "apps/admin/js/features/faq/manager.js",
  "apps/admin/js/features/winners/manager.js",
  "apps/admin/js/features/archive/manager.js",
  "apps/admin/js/features/archive/detail-editor.js",
];
const editors = await Promise.all(
  editorPaths.map(async (path) => [path, await readFile(path, "utf8")]),
);
const archiveManager = editors.find(([path]) =>
  path.endsWith("archive/manager.js"),
)[1];

assert.match(dashboard, /name="periodYear"/);
assert.match(dashboard, /name="batchEnabled"/);
assert.match(dashboard, /name="batchLabel"/);
assert.match(dashboard, /name="batchNote"/);
assert.match(dashboard, /event-card--active/);
assert.match(
  dashboard,
  /\.event-card--active,.event-dashboard__section-title,.event-dashboard__archive-grid\{grid-column:1\/-1\}/,
);
assert.match(dashboard, /event-dashboard__archive-grid/);
assert.match(
  dashboard,
  /<div class="event-card__content">.*<div class="event-card__side"><div class="event-card__badges">.*<div class="event-card__buttons"><\/div><\/div>/,
);
assert.match(
  dashboard,
  /\.event-card__side\{[^}]*align-items:center[^}]*gap:18px/,
);
assert.match(dashboard, /Ada draf|Draf bersih/);
assert.match(dashboard, /Publikasi v/);
assert.doesNotMatch(dashboard, /Periode: \$\{event\.slug\}/);
assert.doesNotMatch(dashboard, /id="newEventName"/);
assert.match(shell, /Urungkan edit/);
assert.match(router, /TalentaEditor/);
assert.match(router, /\.revert/);
assert.match(archiveManager, /class="archive-manager-item__identity"/);
assert.match(archiveManager, /formatArchivePeriod/);
assert.doesNotMatch(archiveManager, /Event nonaktif/);
for (const [path, source] of editors) {
  assert.match(source, /window\.TalentaEditor\s*=.*Object\.freeze/s, path);
  assert.match(source, /revert\s*:/, path);
  assert.doesNotMatch(
    source,
    /reset(?:Home|Download|Faq|Winner)AdminState\s*\(/,
    `${path} masih memanggil reset template`,
  );
}

console.log("PASS: UX periode Event dan action bar Admin tervalidasi.");
