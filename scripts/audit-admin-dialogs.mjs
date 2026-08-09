import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? filesIn(target) : [target];
    }),
  );
  return nested.flat();
}

const adminFiles = (await filesIn("apps/admin")).filter((file) =>
  /\.(?:js|html)$/.test(file),
);
const nativeDialogPattern = /\b(?:confirm|alert|prompt)\s*\(/g;
const nativeUsages = [];
let sharedDialogUsages = 0;

for (const file of adminFiles) {
  const source = await readFile(file, "utf8");
  const matches = [...source.matchAll(nativeDialogPattern)];
  for (const match of matches)
    nativeUsages.push(
      `${file}:${source.slice(0, match.index).split("\n").length}`,
    );
  if (!file.endsWith(path.join("shared", "dialog.js")))
    sharedDialogUsages += (source.match(/\badminConfirm\s*\(/g) || []).length;
}

assert.deepEqual(
  nativeUsages,
  [],
  `Dialog native masih ditemukan:\n${nativeUsages.join("\n")}`,
);
assert.ok(
  sharedDialogUsages >= 14,
  `Minimal 14 action konfirmasi harus memakai adminConfirm(); ditemukan ${sharedDialogUsages}.`,
);

const htmlTargets = [
  "apps/admin/index.html",
  "apps/admin/editors/beranda/index.html",
  "apps/admin/editors/unduh/index.html",
  "apps/admin/editors/pemenang/index.html",
  "apps/admin/editors/arsip/index.html",
  "apps/admin/editors/arsip/detail/index.html",
  "apps/admin/editors/faq/index.html",
];
for (const file of htmlTargets) {
  const source = await readFile(file, "utf8");
  assert.match(source, /js\/shared\/dialog\.js/);
}

const dialogSource = await readFile("apps/admin/js/shared/dialog.js", "utf8");
for (const contract of [
  "showModal()",
  'addEventListener("cancel"',
  "window.parent.adminConfirm",
  "previousFocus",
  "data-dialog-cancel",
  "data-dialog-confirm",
])
  assert.ok(
    dialogSource.includes(contract),
    `Kontrak dialog belum lengkap: ${contract}`,
  );

console.log(
  `Audit dialog Admin lulus: ${sharedDialogUsages} action memakai dialog UI bersama; tidak ada confirm/alert/prompt native.`,
);
