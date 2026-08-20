import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const storage = new Map();
const localStorage = {
  getItem(key) {
    return storage.has(key) ? storage.get(key) : null;
  },
  setItem(key, value) {
    storage.set(key, String(value));
  },
  removeItem(key) {
    storage.delete(key);
  },
  clear() {
    storage.clear();
  },
};

class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
}

const context = vm.createContext({
  console,
  structuredClone,
  localStorage,
  CustomEvent,
  window: { dispatchEvent() {} },
});

for (const path of [
  "packages/shared/js/data/mock-archive-database.js",
  "packages/shared/js/data/repositories/archive-repository.js",
  "packages/shared/js/data/repositories/download-repository.js",
  "packages/shared/js/data/repositories/winner-repository.js",
]) {
  vm.runInContext(await readFile(path, "utf8"), context, { filename: path });
}

const evaluate = (source) => vm.runInContext(source, context);
const clone = (value) => JSON.parse(JSON.stringify(value));
const database = clone(evaluate("MOCK_ARCHIVE_DATABASE.competitions"));
const archived = clone(evaluate("getEffectiveArchivedCompetitions()"));
const readSource = (path) => readFile(path, "utf8");

const competitionIds = database.map((competition) => competition.id);
assert.equal(
  new Set(competitionIds).size,
  competitionIds.length,
  "Competition.id harus unik secara global.",
);
const globalDocumentIds = database.flatMap((competition) =>
  (competition.documents || []).map((document) => document.id),
);
assert.equal(
  new Set(globalDocumentIds).size,
  globalDocumentIds.length,
  "Document.id harus unik secara global.",
);
for (const competition of archived) {
  const categoryIds = competition.winnerCategories.map(
    (category) => category.id,
  );
  assert.equal(new Set(categoryIds).size, categoryIds.length);
  const winnerIds = competition.winnerCategories.flatMap((category) =>
    category.winners.map((winner) => winner.id),
  );
  assert.equal(new Set(winnerIds).size, winnerIds.length);
  const documentIds = competition.documents.map((document) => document.id);
  assert.equal(new Set(documentIds).size, documentIds.length);
  if (competition.skDocument?.documentId)
    assert.ok(
      documentIds.includes(competition.skDocument.documentId),
      "SK documentId harus dimiliki lomba yang sama.",
    );
}

const source = archived.find(
  (competition) =>
    competition.documents.length && competition.winnerCategories.length,
);
const category = source.winnerCategories[0];
const winner = category.winners[0];
const document = source.documents[0];
context.__dirtyArchiveCompetition = {
  ...source,
  uploadedIcon: "javascript:alert(1)",
  winnerCategories: [
    {
      ...category,
      winners: [
        { ...winner, name: "  Nama Bersih  " },
        { ...winner, name: "Duplikat" },
        { id: "", name: "Tanpa ID" },
      ],
    },
    { ...category, name: "Kategori Duplikat" },
  ],
  documents: [
    { ...document, title: "  Dokumen Bersih  " },
    { ...document, title: "Duplikat" },
    { id: "", title: "Tanpa ID" },
  ],
  detail: {
    ...source.detail,
    hiddenCategoryIds: [category.id, "kategori-asing", category.id],
    hiddenDocumentIds: [document.id, "dokumen-asing", document.id],
    documentLabelOverrides: {
      [document.id]: "  Label Bersih  ",
      "dokumen-asing": "Tidak boleh lolos",
    },
  },
  skDocument: {
    documentId: "dokumen-asing",
    title: document.title,
  },
};
const normalizedDirty = clone(
  evaluate("normalizeArchiveCompetition(__dirtyArchiveCompetition)"),
);
assert.equal(normalizedDirty.winnerCategories.length, 1);
assert.equal(normalizedDirty.winnerCategories[0].winners.length, 1);
assert.equal(
  normalizedDirty.winnerCategories[0].winners[0].name,
  "Nama Bersih",
);
assert.equal(normalizedDirty.documents.length, 1);
assert.equal(normalizedDirty.documents[0].title, "Dokumen Bersih");
assert.deepEqual(normalizedDirty.detail.hiddenCategoryIds, [category.id]);
assert.deepEqual(normalizedDirty.detail.hiddenDocumentIds, [document.id]);
assert.deepEqual(normalizedDirty.detail.documentLabelOverrides, {
  [document.id]: "Label Bersih",
});
assert.equal(normalizedDirty.skDocument.documentId, document.id);
assert.equal(normalizedDirty.uploadedIcon, "");

context.__detailSource = normalizedDirty;
const resolvedDetail = clone(
  evaluate("resolveArchiveDetailState(__detailSource)"),
);
assert.equal(resolvedDetail.categories.length, 0);
assert.equal(resolvedDetail.documents.length, 0);
assert.equal(resolvedDetail.sk.documentId, document.id);

context.__customSkCompetition = {
  ...source,
  skDocument: {
    documentId: document.id,
    title: "Judul SK khusus Event",
    description: "Deskripsi SK khusus Event.",
  },
};
const customSk = clone(
  evaluate(
    "resolveArchiveDetailState(normalizeArchiveCompetition(__customSkCompetition)).sk",
  ),
);
assert.equal(customSk.documentId, document.id);
assert.equal(customSk.title, "Judul SK khusus Event");
assert.equal(customSk.description, "Deskripsi SK khusus Event.");
context.__customSkState = clone(
  evaluate(
    "resolveArchiveDetailState(normalizeArchiveCompetition(__customSkCompetition))",
  ),
);
const customSkMarkup = evaluate("buildArchiveDetailMarkup(__customSkState)");
assert.match(customSkMarkup, />Unduh SK<\/a>/);
assert.doesNotMatch(customSkMarkup, /Unduh PDF/);

const designAssetId = "11111111-1111-4111-8111-111111111111";
context.__customWinnerCompetition = {
  ...source,
  winnerCategories: [
    {
      ...category,
      winners: [
        {
          ...winner,
          displayMode: "custom",
          designAssetId,
          design: "https://assets.test/custom-winner.webp",
          photoAssetId: null,
          photo: "",
        },
      ],
    },
  ],
};
const normalizedCustomWinner = clone(
  evaluate("normalizeArchiveCompetition(__customWinnerCompetition)"),
).winnerCategories[0].winners[0];
assert.equal(normalizedCustomWinner.displayMode, "custom");
assert.equal(normalizedCustomWinner.designAssetId, designAssetId);
assert.equal(
  normalizedCustomWinner.design,
  "https://assets.test/custom-winner.webp",
);
assert.equal(normalizedCustomWinner.photoAssetId, null);
assert.equal(normalizedCustomWinner.photo, "");
context.__customWinnerState = clone(
  evaluate(
    "resolveArchiveDetailState(normalizeArchiveCompetition(__customWinnerCompetition))",
  ),
);
const customWinnerMarkup = evaluate(
  "buildArchiveDetailMarkup(__customWinnerState)",
);
assert.match(customWinnerMarkup, /champion-card--custom/);
assert.match(
  customWinnerMarkup,
  /src="https:\/\/assets\.test\/custom-winner\.webp"/,
);
assert.match(
  customWinnerMarkup,
  new RegExp(`alt="${winner.rank.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}"`),
);
assert.doesNotMatch(
  customWinnerMarkup,
  new RegExp(`champion-card__name[^>]*>${winner.name}`),
);

context.__builtInWinnerCompetition = source;
context.__builtInWinnerState = clone(
  evaluate(
    "resolveArchiveDetailState(normalizeArchiveCompetition(__builtInWinnerCompetition))",
  ),
);
const builtInWinnerMarkup = evaluate(
  "buildArchiveDetailMarkup(__builtInWinnerState)",
);
assert.match(builtInWinnerMarkup, /champion-card__name/);

const state = clone(evaluate("getArchiveAdminState()"));
const removedId = archived[0].id;
state.removedCompetitionIds = [removedId];
context.__removedArchiveState = state;
evaluate("saveArchiveAdminState(__removedArchiveState)");
assert.equal(evaluate(`getEffectiveCompetitionById("${removedId}")`), null);
assert.ok(
  !clone(
    evaluate("getPublicArchivedCompetitions().map(item => item.id)"),
  ).includes(removedId),
  "Tombstone harus menghapus Arsip dari resolver publik.",
);
assert.ok(
  !clone(evaluate("getDownloadCompetitions().map(item => item.id)")).includes(
    removedId,
  ),
  "Penghapusan Arsip harus langsung diterapkan pada sumber Unduh.",
);
assert.ok(
  !clone(
    evaluate(
      "getPublicWinnerArchiveCompetitions({ ...getWinnerPageState(), archiveLimit: 12 }).map(item => item.id)",
    ),
  ).includes(removedId),
  "Penghapusan Arsip harus langsung diterapkan pada riwayat Pemenang.",
);

localStorage.clear();
const publicFilterState = clone(evaluate("getArchiveAdminState()"));
const draftId = publicFilterState.order[0];
const disabledDetailId = publicFilterState.order[1];
publicFilterState.competitions[draftId].status = "draft";
publicFilterState.competitions[disabledDetailId].detail.active = false;
context.__publicFilterArchiveState = publicFilterState;
evaluate("saveArchiveAdminState(__publicFilterArchiveState)");
const publicIds = clone(
  evaluate("getPublicArchivedCompetitions().map(item => item.id)"),
);
assert.ok(!publicIds.includes(draftId));
assert.ok(!publicIds.includes(disabledDetailId));

const [
  detailHtml,
  detailApi,
  detailEditor,
  manager,
  publicList,
  publicDetail,
  publicDetailHtml,
  mainCss,
  archiveRepository,
] = await Promise.all([
  readSource("apps/admin/editors/arsip/detail/index.html"),
  readSource("apps/admin/js/features/archive/detail-api.js"),
  readSource("apps/admin/js/features/archive/detail-editor.js"),
  readSource("apps/admin/js/features/archive/manager.js"),
  readSource("apps/public-site/assets/js/archive-list.js"),
  readSource("apps/public-site/assets/js/archive-detail.js"),
  readSource("apps/public-site/arsip/detail/index.html"),
  readSource("apps/public-site/assets/css/main.css"),
  readSource("packages/shared/js/data/repositories/archive-repository.js"),
]);
assert.doesNotMatch(
  detailHtml,
  /id="detailShortName"|>Nama pendek</,
  "Editor Detail Arsip tidak boleh menampilkan field Nama pendek.",
);
assert.match(detailHtml, /id="detailSkTitle"/);
assert.doesNotMatch(
  detailHtml,
  /detailSkDescription|Kategori serta pemenang historis/,
  "Editor Detail Arsip tidak boleh menampilkan deskripsi banner SK atau deskripsi Hasil dan Pemenang.",
);
assert.doesNotMatch(
  archiveRepository,
  /sk-banner__content[\s\S]*?sk\.description/,
  "Banner SK Detail Arsip tidak boleh merender deskripsi.",
);
assert.doesNotMatch(
  detailHtml,
  /data-meta="show(?:Photo|School|Exam|Regency|Province)"/,
  "Editor Detail Arsip tidak boleh menampilkan kontrol metadata card.",
);
assert.doesNotMatch(
  detailEditor,
  /detailSkDescription|\[data-meta\]/,
  "Editor Detail Arsip tidak boleh mengikat field yang telah dihapus.",
);
assert.match(
  detailEditor,
  /champion-card__photo[\s\S]*?champion-card__school[\s\S]*?No\. Ujian:[\s\S]*?Kabupaten:[\s\S]*?Provinsi:/,
  "Preview Detail Arsip harus tetap menampilkan metadata card.",
);
assert.doesNotMatch(
  publicDetail,
  /showPhoto|showSchool|showExam|showRegency|showProvince/,
  "Detail Arsip publik tidak boleh memakai pengaturan checkbox metadata lama.",
);
const winnerSectionHtml = detailHtml.slice(
  detailHtml.indexOf("<h2>Hasil dan Pemenang</h2>"),
  detailHtml.indexOf("<h2>Dokumen Terkait</h2>"),
);
const documentSectionHtml = detailHtml.slice(
  detailHtml.indexOf("<h2>Dokumen Terkait</h2>"),
  detailHtml.indexOf("<h2>Preview Keseluruhan Detail</h2>"),
);
assert.doesNotMatch(
  winnerSectionHtml,
  /id="detailShowSk"/,
  "Kontrol Banner SK tidak boleh tetap berada di Hasil dan Pemenang.",
);
assert.match(
  documentSectionHtml,
  /class="[^"]*admin-switch[^"]*"[\s\S]*?id="detailShowSk"[\s\S]*?<em>Tampilkan banner SK<\/em>/,
  "Banner SK harus memakai toggle di kelompok Dokumen Terkait.",
);
assert.match(documentSectionHtml, /class="detail-sk-settings"/);
assert.match(detailEditor, /data-detail-up/);
assert.match(detailEditor, /data-detail-down/);
assert.match(detailEditor, /function moveDetailDocument\(/);
assert.match(detailEditor, /event\.key !== "ArrowUp"/);
assert.match(detailEditor, /event\.key !== "ArrowDown"/);
assert.match(mainCss, /\.detail-sk-settings\s*\{/);
assert.match(mainCss, /\.detail-document-row\s*\{/);
assert.match(mainCss, /\.detail-document-row__order\s*\{/);
assert.match(
  detailApi,
  /documentRole === "winner_decree"/,
  "Fallback SK hanya boleh memakai winner_decree milik Event yang dimuat.",
);
assert.match(detailApi, /documentId: document\.id/);
assert.match(detailApi, /decreeDocumentId: event\.skDocument\?\.documentId/);
assert.doesNotMatch(detailApi, /decreeDocumentId: event\.skDocument\?\.id/);
assert.match(
  detailApi,
  /Unduh dokumen resmi SK Pemenang untuk keperluan administrasi sekolah\./,
);
assert.match(detailHtml, /id="detailName"[^>]*required/);
assert.match(detailHtml, /id="detailName"[^>]*maxlength="200"/);
assert.match(detailApi, /archiveDisplayName: settings\.archiveDisplayName/);
assert.match(detailApi, /showSk: metadata\.showSk \?\? true/);
assert.match(detailApi, /showSk: event\.detail\.showSk/);
assert.match(detailApi, /archiveDisplayName: event\.archiveDisplayName/);
assert.match(
  detailApi,
  /documents: event\.documents\.map\(\(document\) => \(\{[\s\S]*?documentId: document\.id/,
  "Urutan Detail Arsip harus dikirim sesuai susunan array dokumen Admin.",
);
assert.match(
  detailApi,
  /detailConfig\.documents\.forEach[\s\S]*?seenDocumentIds[\s\S]*?documents\.forEach/,
  "Urutan tersimpan harus dipulihkan dan dokumen baru ditempatkan setelahnya.",
);
assert.doesNotMatch(
  detailApi,
  /body:\s*\{[^}]*name:\s*event\.(?:name|archiveDisplayName)/,
  "Nama presentasi Arsip tidak boleh dipatch ke identity canonical Event.",
);
assert.match(detailEditor, /detailName: archiveDisplayName\(comp\)/);
assert.match(
  detailEditor,
  /window\.parent\?\.TalentaAdminAuth\?\.currentCategory\?\.\(\)/,
  "Editor Detail Arsip harus membaca konteks kategori dari shell Admin parent.",
);
assert.doesNotMatch(
  detailEditor,
  /(?<![.\w])TalentaAdminAuth\.currentCategory\(\)/,
  "Iframe Detail Arsip tidak memiliki global TalentaAdminAuth sendiri.",
);
assert.match(detailEditor, /comp\.archiveDisplayName = e\.target\.value/);
assert.match(
  detailEditor,
  /\/admin\/events\/\$\{comp\.id\}\/preview-token/,
  "Lihat halaman Detail Arsip harus meminta token untuk Event Arsip yang diedit.",
);
assert.match(
  detailEditor,
  /url\.hash = new URLSearchParams\(\{[\s\S]*?preview: currentToken,[\s\S]*?archivePreview: archiveToken,[\s\S]*?previewScope: "archiveDetail"/,
  "Lihat halaman Detail Arsip harus membawa token Event saat ini dan token Arsip secara terpisah.",
);
assert.match(detailEditor, /name: archiveDisplayName\(comp\)/);
assert.match(
  manager,
  /item\.archiveDisplayName\s*\|\|\s*formatArchiveDisplayName\(item\)/,
);
assert.match(
  detailEditor,
  /detailSkTitle"\)\.disabled =[\s\S]*?!comp\.skDocument\?\.documentId/,
  "Judul SK harus nonaktif saat Event tidak memiliki SK.",
);
assert.doesNotMatch(
  detailEditor,
  /const ensureSk =/,
  "Input judul/deskripsi tidak boleh membuat banner SK tanpa dokumen.",
);
assert.match(manager, /TalentaMedia\.adminPreviewUrl\(item\.mascotAssetId/);
assert.match(manager, /siteId: item\.id/);
assert.match(
  manager,
  /mode\.onchange = \(\) => \{[\s\S]*?if \(mode\.value === "library"\)[\s\S]*?return;[\s\S]*?library\.hidden = true;/,
  "Mode Upload harus tetap terbuka sebelum pengguna memilih file.",
);
assert.match(
  publicList,
  /iconMode: event\.mascotAssetId \? "upload" : "library"/,
);
assert.match(
  publicList,
  /TalentaPublic\.mediaUrl\([\s\S]*?\/api\/v1\/public\/media\/\$\{event\.mascotAssetId\}/,
  "Logo arsip publik harus memakai resolver media publik.",
);
assert.match(
  detailApi,
  /Promise\.all\([\s\S]*?winners[\s\S]*?TalentaMedia\.adminPreviewUrl\(winner\.designAssetId,[\s\S]*?siteId: eventId/,
  "Preview editor Arsip harus memuat desain custom sebagai Blob terautentikasi.",
);
assert.match(
  detailApi,
  /TalentaMedia\.adminPreviewUrl\(winner\.photoAssetId,[\s\S]*?siteId: eventId/,
  "Preview editor Arsip harus memuat foto built-in sebagai Blob terautentikasi.",
);
assert.match(detailApi, /displayMode: winner\.displayMode \|\| "built_in"/);
assert.match(detailApi, /designAssetId: winner\.designAssetId \|\| null/);
assert.match(publicDetail, /displayMode: winner\.displayMode \|\| "built_in"/);
assert.match(publicDetail, /showSk: visibility\.showSk \?\? true/);
assert.match(publicDetail, /designAssetId: winner\.designAssetId \|\| null/);
assert.match(publicDetail, /designUrl/);
assert.match(
  publicDetail,
  /return source \? TalentaPublic\.mediaUrl\(source, "archiveDetail"\) : "";/,
  "Seluruh media Detail Arsip harus memakai resolver token Arsip.",
);
assert.match(
  publicDetail,
  /url: mediaUrl\(document\.url, document\.assetId\)/,
  "Dokumen Detail Arsip harus membawa token media Event Arsip.",
);
assert.match(
  publicDetail,
  /url: mediaUrl\(data\.decree\.url, data\.decree\.assetId\)/,
  "SK Detail Arsip harus membawa token media Event Arsip.",
);
assert.match(publicDetail, /activateWinnerCardFallbacks\(root\)/);
assert.match(detailEditor, /activateWinnerCardFallbacks\(root\)/);
assert.match(
  detailEditor,
  /detailShowSk"\)\.onchange[\s\S]*?det\.showSk = e\.target\.checked[\s\S]*?renderPreview\(\)/,
  "Toggle Banner SK hanya boleh mengubah visibilitas, bukan pilihan dokumen.",
);
assert.doesNotMatch(
  detailEditor,
  /detailShowSk"\)\.onchange[\s\S]{0,200}comp\.skDocument\s*=/,
  "Mematikan Banner SK tidak boleh menghapus dokumen terpilih.",
);
assert.match(
  publicDetailHtml,
  /winner-repository\.js[\s\S]*archive-repository\.js/,
  "Detail Arsip public harus memuat renderer Pemenang sebelum renderer Arsip.",
);
assert.match(
  detailHtml,
  /winner-repository\.js[\s\S]*archive-repository\.js/,
  "Preview editor Detail Arsip harus memuat renderer Pemenang sebelum renderer Arsip.",
);

console.log(
  "Audit relasi Arsip lulus: owner lomba, kategori, pemenang, dokumen, SK, tombstone, serta dampak ke Unduh/Pemenang tervalidasi.",
);
