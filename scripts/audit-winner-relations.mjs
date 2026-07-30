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
