import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const homeRendererSource = await readFile(
  "apps/public-site/assets/js/home-renderer.js",
  "utf8",
);
const winnerRendererSource = await readFile(
  "apps/public-site/assets/js/winner-renderer.js",
  "utf8",
);
const winnerAdminApiSource = await readFile(
  "apps/admin/js/features/winners/api.js",
  "utf8",
);
const winnerAdminManagerSource = await readFile(
  "apps/admin/js/features/winners/manager.js",
  "utf8",
);
const homeWinnerEditorSource = await readFile(
  "apps/admin/js/features/home/winner-highlight-editor.js",
  "utf8",
);
const winnerRepositorySource = await readFile(
  "packages/shared/js/data/repositories/winner-repository.js",
  "utf8",
);
const homeRepositorySource = await readFile(
  "packages/shared/js/data/repositories/home-repository.js",
  "utf8",
);
assert.doesNotMatch(
  homeRendererSource,
  /photoAssetId\)\s*\{\s*return `\/api\/v1\/public\/media\/\$\{winner\.photoAssetId\}`/,
  "fallback photoAssetId Highlight Beranda tidak boleh relatif ke dev server",
);
assert.doesNotMatch(
  winnerRendererSource,
  /photo = `\/api\/v1\/public\/media\/\$\{winner\.photoAssetId\}`/,
  "fallback photoAssetId halaman Pemenang tidak boleh relatif ke dev server",
);
assert.match(
  winnerAdminApiSource,
  /TalentaMedia\.adminPreviewUrl\(event\.mascotAssetId,\s*\{\s*siteId: event\.id,?\s*\}\s*\)/,
  "Preview Admin kartu Arsip Pemenang harus memakai Blob milik Event Arsip.",
);
assert.match(
  winnerAdminApiSource,
  /iconMode: event\.mascotAssetId \? "upload" : "library"/,
);
assert.match(
  winnerAdminApiSource,
  /name:\s*event\.archiveDisplayName\s*\|\|\s*formatWinnerEventName\(event\)/,
);
assert.match(
  winnerRendererSource,
  /icon:\s*event\.fallbackIcon\s*\|\|\s*event\.icon\s*\|\|\s*"archive"/,
);
assert.match(
  winnerRendererSource,
  /iconMode:\s*event\.mascotAssetId\s*\?\s*"upload"\s*:\s*"library"/,
);
assert.match(
  winnerRendererSource,
  /TalentaMedia\.url\(event\.mascotAssetId\)/,
  "Public kartu Arsip Pemenang harus resolve media canonical melalui TalentaMedia.",
);
assert.match(
  winnerAdminApiSource,
  /displayMode:\s*winner\.displayMode\s*\|\|\s*"built_in"/,
  "Data existing Admin harus dinormalisasi ke mode built_in.",
);
assert.match(
  winnerAdminApiSource,
  /designAssetId:\s*winner\.designAssetId\s*\|\|\s*null/,
);
assert.match(
  winnerAdminApiSource,
  /TalentaMedia\.adminPreviewUrl\(winner\.designAssetId/,
  "Desain custom Admin harus memakai Blob terautentikasi.",
);
assert.match(
  winnerAdminManagerSource,
  /displayMode:\s*null/,
  "Pemenang baru wajib mulai tanpa pilihan jenis tampilan.",
);
assert.doesNotMatch(
  winnerAdminManagerSource,
  /value="built_in"[^>]*\$\{!w\.displayMode[^}]*checked/,
  "Radio desain bawaan tidak boleh otomatis terpilih untuk pemenang baru.",
);
assert.match(winnerAdminManagerSource, /Pilih jenis tampilan pemenang\./);
assert.match(winnerAdminManagerSource, /image\/jpeg/);
assert.match(winnerAdminManagerSource, /image\/png/);
assert.match(winnerAdminManagerSource, /image\/webp/);
assert.match(
  winnerAdminManagerSource,
  /const compressed = await TalentaMedia\.compressCustomDesign\(file\)/,
);
assert.match(
  winnerAdminManagerSource,
  /compressed\.size > TalentaMedia\.LIMITS\.customDesignOutput/,
  "Upload desain harus menegakkan batas hasil 500 KB.",
);
assert.match(
  winnerAdminManagerSource,
  /Maksimum upload 2 MB\.[\s\S]*target 400 KB/,
  "Petunjuk upload harus menjelaskan batas sumber dan target optimasi.",
);
assert.match(
  winnerRepositorySource,
  /class="champion-card__design"[^>]*loading="lazy"[^>]*decoding="async"/,
  "Desain custom public harus lazy-load dan decode async.",
);
assert.match(
  homeWinnerEditorSource,
  /displayMode:\s*winner\.displayMode\s*\|\|\s*"built_in"/,
);
assert.match(
  homeWinnerEditorSource,
  /designAssetId:\s*winner\.designAssetId\s*\|\|\s*null/,
);
assert.match(
  homeWinnerEditorSource,
  /TalentaMedia\.adminPreviewUrl\(\s*winner\.designAssetId/,
  "Highlight Admin harus memakai desain custom dari editor Pemenang.",
);
assert.match(
  winnerAdminManagerSource,
  /const design = await TalentaMedia\.adminPreviewUrl[\s\S]*TalentaMedia\.revokePreviewUrl\(w\.design\);[\s\S]*w\.designAssetId = asset\.assetId/,
  "Upload pengganti harus mempertahankan gambar lama sampai upload dan preview baru berhasil.",
);
assert.match(
  winnerAdminManagerSource,
  /reconcileWinnerRanks\(cat, previousOrder\)/,
  "Perubahan urutan harus ikut memperbarui label rank otomatis.",
);
assert.match(
  winnerRepositorySource,
  /function buildWinnerCardMarkup\(winner, page, options = \{\}\)/,
  "Renderer item Pemenang harus menerima resolver asset bersama.",
);
assert.match(winnerRepositorySource, /champion-card--custom/);
assert.match(winnerRepositorySource, /champion-card__design/);
assert.match(
  winnerRepositorySource,
  /<span class="champion-card__fallback">\$\{winnerEscape\(rank\)\}<\/span>[\s\S]*<img[\s\S]*alt="\$\{winnerEscape\(rank\)\}"/,
  "Fallback custom harus tersedia sebelum gambar dan alt memakai rank final.",
);
assert.match(
  homeRepositorySource,
  /buildWinnerCardMarkup\(item, display, options\)/,
  "Highlight Beranda harus memakai renderer item yang sama.",
);

const homeListeners = new Map();
const homeSections = Object.fromEntries(
  ["hero", "jadwal", "biaya", "benefit", "pemenang-highlight", "mitra"].map(
    (id) => [
      id,
      {
        className: "",
        innerHTML: "",
        insertAdjacentElement() {},
      },
    ],
  ),
);
let resolveWinnerRequest;
const winnerRequest = new Promise((resolve) => {
  resolveWinnerRequest = resolve;
});
const homeRendererContext = vm.createContext({
  console,
  URL,
  URLSearchParams,
  location: { origin: "https://example.test", href: "https://example.test/" },
  document: { getElementById: (id) => homeSections[id] },
  getHomeAdminState: () => ({
    hero: { active: true },
    schedule: { active: true },
    pricing: { active: true },
    benefit: { active: true },
    winnerHighlight: { active: false, background: "navy" },
    partners: { active: true },
  }),
  getHomeWinnerCategories: () => [],
  getHomeWinnerDisplay: () => ({}),
  buildHomeHeroMarkup: () => "",
  buildHomeScheduleMarkup: () => "",
  buildHomePricingMarkup: () => "",
  buildHomeBenefitMarkup: () => "",
  buildHomeWinnerMarkup: () => "",
  buildHomePartnerMarkup: () => "",
  activateWinnerCardFallbacks() {},
  TalentaPublic: {
    load: (page) =>
      page === "winners" ? winnerRequest : new Promise(() => {}),
  },
});
homeRendererContext.window = {
  addEventListener: (type, listener) => homeListeners.set(type, listener),
  TalentaConfig: {},
};
vm.runInContext(homeRendererSource, homeRendererContext, {
  filename: "apps/public-site/assets/js/home-renderer.js",
});
homeListeners.get("talenta:public:home")({
  detail: {
    sections: [
      {
        type: "winnerHighlight",
        isActive: true,
        settings: { background: "navy" },
      },
    ],
  },
});
assert.doesNotMatch(
  homeSections["pemenang-highlight"].className,
  /section--disabled/,
  "Highlight harus tampil setelah konfigurasi Home API diterapkan.",
);
resolveWinnerRequest({ categories: [] });
await new Promise((resolve) => setImmediate(resolve));
assert.doesNotMatch(
  homeSections["pemenang-highlight"].className,
  /section--disabled/,
  "Respons data Pemenang tidak boleh menimpa konfigurasi Highlight dari Home API.",
);

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
  "packages/shared/js/data/repositories/winner-repository.js",
  "packages/shared/js/data/repositories/home-repository.js",
]) {
  vm.runInContext(await readFile(path, "utf8"), context, { filename: path });
}

const evaluate = (source) => vm.runInContext(source, context);
const clone = (value) => JSON.parse(JSON.stringify(value));
const activeCompetition = clone(evaluate("getActiveCompetition()"));
const baselineManager = clone(evaluate("getWinnerManagerState()"));
const baselinePage = clone(evaluate("getWinnerPageState()"));
const availableWinnerArchives = clone(
  evaluate("getAvailableWinnerArchiveCompetitions()"),
);

assert.equal(
  baselineManager.competitionId,
  activeCompetition.id,
  "WinnerManager harus berelasi ke lomba aktif.",
);

const categoryIds = baselineManager.categories.map((category) => category.id);
assert.equal(
  new Set(categoryIds).size,
  categoryIds.length,
  "category.id harus unik di dalam lomba aktif.",
);
const winnerIds = baselineManager.categories.flatMap((category) =>
  category.winners.map((winner) => winner.id),
);
assert.equal(
  new Set(winnerIds).size,
  winnerIds.length,
  "winner.id harus unik agar operasi update/delete tidak ambigu.",
);

const firstCategory = baselineManager.categories[0];
const firstWinner = firstCategory.winners[0];
context.__dirtyWinnerManager = {
  version: 1,
  competitionId: activeCompetition.id,
  categories: [
    {
      ...firstCategory,
      name: "  Juara Utama  ",
      winners: [
        { ...firstWinner, name: "  Nama Bersih  " },
        { ...firstWinner, name: "Duplikat" },
        { id: "", name: "Tanpa ID" },
      ],
    },
    { ...firstCategory, name: "Kategori Duplikat" },
    { id: "", name: "Kategori Tanpa ID", winners: [] },
  ],
  sk: {
    title: "  SK Resmi  ",
    description: "  Dokumen hasil  ",
    url: "javascript:alert(1)",
  },
};
const normalizedDirty = clone(
  evaluate("normalizeWinnerManagerState(__dirtyWinnerManager)"),
);
assert.equal(normalizedDirty.categories.length, 1);
assert.equal(normalizedDirty.categories[0].name, "Juara Utama");
assert.equal(normalizedDirty.categories[0].winners.length, 1);
assert.equal(normalizedDirty.categories[0].winners[0].name, "Nama Bersih");
assert.equal(
  normalizedDirty.sk.url,
  "#",
  "URL SK berbahaya harus dinetralkan.",
);

context.__foreignWinnerManager = {
  ...baselineManager,
  competitionId: "kompetisi-lain",
  categories: [],
};
const foreignNormalized = clone(
  evaluate("normalizeWinnerManagerState(__foreignWinnerManager)"),
);
assert.equal(foreignNormalized.competitionId, activeCompetition.id);
assert.equal(
  foreignNormalized.categories.length,
  baselineManager.categories.length,
  "State milik lomba lain tidak boleh diterapkan ke lomba aktif.",
);

context.__dirtyWinnerPage = {
  active: 0,
  alignment: "kanan",
  archiveLimit: 99.8,
  showPhoto: false,
  archiveTitle: "  Arsip Juara  ",
};
const normalizedPage = clone(
  evaluate("normalizeWinnerPageState(__dirtyWinnerPage)"),
);
assert.equal(normalizedPage.active, true);
assert.equal(normalizedPage.alignment, "left");
assert.equal(
  normalizedPage.archiveLimit,
  availableWinnerArchives.length,
  "Jumlah card tidak boleh melebihi Arsip yang memiliki pemenang aktif.",
);
assert.equal(normalizedPage.showPhoto, false);
assert.equal(normalizedPage.archiveTitle, "Arsip Juara");

context.__publicManager = {
  ...baselineManager,
  categories: baselineManager.categories.map((category, categoryIndex) => ({
    ...category,
    active: categoryIndex === 0,
    winners: category.winners.map((winner, winnerIndex) => ({
      ...winner,
      active: winnerIndex === 0,
    })),
  })),
};
context.__publicPage = { ...baselinePage, archiveLimit: 2 };
const publicState = clone(
  evaluate("resolvePublicWinnerState(__publicManager, __publicPage)"),
);
assert.equal(publicState.manager.categories.length, 1);
assert.equal(publicState.manager.categories[0].winners.length, 1);
assert.ok(publicState.archives.length <= 2);
assert.ok(
  publicState.archives.every(
    (competition) =>
      competition.status === "published" &&
      competition.active !== false &&
      competition.detail?.active !== false &&
      competition.winnerCategories.some(
        (category) =>
          category.active !== false &&
          category.winners.some((winner) => winner.active !== false),
      ),
  ),
  "Kartu Arsip Pemenang hanya boleh berasal dari Arsip publik yang memiliki pemenang aktif.",
);

evaluate("saveWinnerAdminState(__publicManager, __publicPage)");
const homeCategories = clone(evaluate("getHomeWinnerCategories()"));
assert.deepEqual(
  homeCategories,
  publicState.manager.categories,
  "Highlight Beranda harus membaca resolver Pemenang yang sama.",
);

const archiveState = clone(evaluate("getArchiveAdminState()"));
const firstArchiveId = publicState.archives[0]?.id;
if (firstArchiveId) {
  archiveState.competitions[firstArchiveId].active = false;
  context.__winnerArchiveState = archiveState;
  evaluate("saveArchiveAdminState(__winnerArchiveState)");
  const publicArchiveIds = clone(
    evaluate(
      "getPublicWinnerArchiveCompetitions({ ...getWinnerPageState(), archiveLimit: 12 }).map(item => item.id)",
    ),
  );
  assert.ok(
    !publicArchiveIds.includes(firstArchiveId),
    "Arsip nonaktif tidak boleh muncul pada halaman Pemenang.",
  );
}

console.log(
  "Audit relasi Pemenang lulus: competition FK, ID kategori/pemenang, batas card dinamis, publikasi Arsip, dan sinkron Highlight Beranda tervalidasi.",
);
