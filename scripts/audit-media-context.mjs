import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(path, "utf8");
const [
  winnerApi,
  winnerManager,
  winnerHighlight,
  settingsEditor,
  homeEditor,
  winnerRenderer,
  archiveList,
  downloadRenderer,
] = await Promise.all([
  read("apps/admin/js/features/winners/api.js"),
  read("apps/admin/js/features/winners/manager.js"),
  read("apps/admin/js/features/home/winner-highlight-editor.js"),
  read("apps/admin/js/shell/settings-editor.js"),
  read("apps/admin/js/features/home/editor.js"),
  read("apps/public-site/assets/js/winner-renderer.js"),
  read("apps/public-site/assets/js/archive-list.js"),
  read("apps/public-site/assets/js/download-renderer.js"),
]);

assert.match(
  winnerApi,
  /adminPreviewUrl\(winner\.photoAssetId,\s*\{\s*siteId: event\.id/,
  "Foto Pemenang di Admin harus memakai endpoint media Admin dengan Event eksplisit.",
);
assert.match(
  winnerManager,
  /adminPreviewUrl\(asset\.assetId,\s*\{\s*siteId: wmState\.competitionId/,
  "Foto baru di Admin harus memakai Blob terautentikasi.",
);
assert.match(
  winnerHighlight,
  /adminPreviewUrl\(winner\.photoAssetId,\s*\{\s*siteId: site\.id/,
  "Foto Highlight Admin harus memakai Blob terautentikasi.",
);
assert.match(
  settingsEditor,
  /adminPreviewUrl\(w\.photoAssetId,\s*\{\s*siteId: site\.id/,
  "Foto preview Global Admin harus memakai Blob terautentikasi.",
);
assert.match(
  homeEditor,
  /adminPreviewUrl\(asset\.assetId,\s*\{[\s\S]*?siteId:/,
  "Ikon Beranda baru di Admin harus memakai Blob terautentikasi.",
);
assert.match(
  settingsEditor,
  /async function hydrateGlobalHeroPreview\(hero, siteId\)[\s\S]*?adminPreviewUrl\(heroAssetId,\s*\{\s*siteId\s*\}\)/,
  "Hero preview Global Admin harus memakai Blob terautentikasi dengan Event eksplisit.",
);
assert.match(
  winnerRenderer,
  /return TalentaPublic\.mediaUrl\(source\)/,
  "Media halaman Pemenang harus membawa token saat Preview.",
);
assert.match(
  archiveList,
  /TalentaPublic\.mediaUrl\([\s\S]*?`\/api\/v1\/public\/media\/\$\{event\.mascotAssetId\}`[\s\S]*?\)/,
  "Maskot daftar Arsip harus membawa token saat Preview.",
);
assert.match(
  downloadRenderer,
  /TalentaPublic\.mediaUrl\(value\)/,
  "Dokumen Unduh harus membawa token saat Preview.",
);

console.log("PASS: resolver media Admin dan Public sesuai konteks akses.");
