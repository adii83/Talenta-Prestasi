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
]) {
  vm.runInContext(await readFile(path, "utf8"), context, { filename: path });
}

const evaluate = (source) => vm.runInContext(source, context);
const clone = (value) => JSON.parse(JSON.stringify(value));

const activeCompetition = clone(evaluate("getActiveCompetition()"));
const allCompetitions = clone(evaluate("MOCK_ARCHIVE_DATABASE.competitions"));
const baseline = clone(evaluate("getDownloadAdminState()"));

assert.equal(
  activeCompetition.id,
  "osn-2026",
  "Lomba aktif dummy harus menjadi sumber tab Lomba Sekarang.",
);
assert.equal(
  baseline.competitions[0]?.competitionId,
  activeCompetition.id,
  "Tab pertama Unduh harus berelasi ke lomba aktif.",
);
assert.equal(
  baseline.competitions[0]?.isDefault,
  true,
  "Lomba aktif harus menjadi tab default baseline.",
);

const competitionIds = allCompetitions.map((competition) => competition.id);
assert.equal(
  new Set(competitionIds).size,
  competitionIds.length,
  "competition.id harus unik untuk kesiapan foreign key backend.",
);

const globalDocumentIds = allCompetitions.flatMap((competition) =>
  (competition.documents || []).map((document) => document.id),
);
assert.equal(
  new Set(globalDocumentIds).size,
  globalDocumentIds.length,
  "document.id harus unik secara global agar override tidak ambigu.",
);

for (const item of baseline.competitions) {
  assert.ok(
    competitionIds.includes(item.competitionId),
    `Relasi ${item.competitionId} harus menunjuk lomba yang tersedia.`,
  );
}
assert.equal(
  new Set(baseline.competitions.map((item) => item.competitionId)).size,
  baseline.competitions.length,
  "Satu lomba hanya boleh muncul sekali di konfigurasi Unduh.",
);
assert.equal(
  baseline.competitions.filter((item) => item.active && item.isDefault).length,
  1,
  "Harus ada tepat satu tab default aktif.",
);

const firstDocumentId = activeCompetition.documents[0].id;
const secondDocumentId = activeCompetition.documents[1].id;
const dirtyState = {
  version: 2,
  active: true,
  competitions: [
    {
      competitionId: activeCompetition.id,
      active: true,
      isDefault: true,
      hiddenDocumentIds: [firstDocumentId, "dokumen-asing", firstDocumentId],
      documentLabelOverrides: {
        [secondDocumentId]: "  Label khusus  ",
        "dokumen-asing": "Tidak boleh lolos",
        [firstDocumentId]: "   ",
      },
    },
    {
      competitionId: activeCompetition.id,
      active: true,
      isDefault: false,
    },
    {
      competitionId: "kompetisi-hilang",
      active: true,
      isDefault: false,
    },
  ],
};
context.__dirtyDownloadState = dirtyState;
const normalizedDirty = clone(
  evaluate("normalizeDownloadState(__dirtyDownloadState)"),
);
assert.equal(
  normalizedDirty.competitions.length,
  1,
  "Relasi duplikat dan relasi ke lomba hilang harus dibuang.",
);
assert.deepEqual(
  normalizedDirty.competitions[0].hiddenDocumentIds,
  [firstDocumentId],
  "hiddenDocumentIds hanya boleh berisi dokumen milik lomba terkait.",
);
assert.deepEqual(
  normalizedDirty.competitions[0].documentLabelOverrides,
  { [secondDocumentId]: "Label khusus" },
  "Override label harus valid, tidak kosong, dan dibersihkan.",
);

const archiveState = clone(evaluate("getArchiveAdminState()"));
archiveState.competitions["osn-2025"].active = false;
context.__archiveState = archiveState;
evaluate("saveArchiveAdminState(__archiveState)");
context.__downloadState = {
  ...baseline,
  competitions: [
    {
      ...baseline.competitions.find(
        (item) => item.competitionId === "osn-2025",
      ),
      isDefault: true,
    },
    {
      ...baseline.competitions.find(
        (item) => item.competitionId === "osn-2024",
      ),
      isDefault: false,
    },
  ],
};
evaluate("saveDownloadAdminState(__downloadState)");
const publicState = clone(evaluate("getPublicDownloadState()"));
assert.deepEqual(
  publicState.competitions.map((item) => item.competitionId),
  ["osn-2024"],
  "Lomba Arsip nonaktif tidak boleh tampil di halaman Unduh publik.",
);
assert.equal(
  publicState.competitions[0].isDefault,
  true,
  "Tab default publik harus dihitung ulang setelah sumber disembunyikan.",
);

localStorage.clear();
context.__documentState = {
  ...baseline,
  competitions: [
    {
      ...baseline.competitions[0],
      hiddenDocumentIds: [firstDocumentId],
      documentLabelOverrides: {
        [secondDocumentId]: "Materi peserta",
      },
    },
  ],
};
evaluate("saveDownloadAdminState(__documentState)");
const publicDocuments = clone(
  evaluate("getPublicDownloadState().competitions[0].documents"),
);
assert.ok(
  !publicDocuments.some((document) => document.id === firstDocumentId),
  "Dokumen yang disembunyikan tidak boleh tampil publik.",
);
assert.equal(
  publicDocuments.find((document) => document.id === secondDocumentId)?.title,
  "Materi peserta",
  "Override label harus diterapkan tanpa menggandakan data dokumen.",
);

console.log(
  "Audit relasi Unduh lulus: competition FK, document FK, sanitasi, status publik, dan fallback default tervalidasi.",
);
