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

const [
  downloadEditorSource,
  downloadApiSource,
  downloadAdminHtml,
  publicApiSource,
  downloadRendererSource,
  downloadHtml,
] = await Promise.all([
  readFile("apps/admin/js/features/downloads/editor.js", "utf8"),
  readFile("apps/admin/js/features/downloads/api.js", "utf8"),
  readFile("apps/admin/editors/unduh/index.html", "utf8"),
  readFile("apps/public-site/assets/js/public-api.js", "utf8"),
  readFile("apps/public-site/assets/js/download-renderer.js", "utf8"),
  readFile("apps/public-site/unduh/index.html", "utf8"),
]);
const mainCss = await readFile("apps/public-site/assets/css/main.css", "utf8");

const currentEvent = {
  id: "event-2027",
  categoryId: "category-science",
  name: "Olimpiade Sains",
  periodYear: 2027,
  batchNumber: 1,
};
let currentTabs = [];
const downloadApiWindow = {
  parent: {
    TalentaAdminAuth: {
      currentEvent: () => currentEvent,
    },
  },
};
const downloadApiContext = vm.createContext({
  console,
  window: downloadApiWindow,
  TalentaMedia: { url: (assetId) => `/api/v1/public/media/${assetId}` },
  TalentaApi: {
    async request(path) {
      if (path === "/admin/categories/category-science/events") {
        return { data: [currentEvent] };
      }
      if (path === "/admin/events/event-2027/documents") {
        return { data: [] };
      }
      if (path === "/admin/events/event-2027/downloads") {
        return { data: { tabs: currentTabs } };
      }
      if (path === "/admin/events/event-2027/pages/download") {
        return { data: { isActive: true } };
      }
      throw new Error(`Request audit tidak dikenal: ${path}`);
    },
  },
});
vm.runInContext(downloadApiSource, downloadApiContext, {
  filename: "apps/admin/js/features/downloads/api.js",
});

const defaultCurrentTab = await downloadApiWindow.TalentaDownloadApi.load();
assert.equal(
  defaultCurrentTab.configs[0]?.customTabName,
  "Olimpiade Sains 2027",
  "Nama tab default Event saat ini harus menyertakan tahun periodenya.",
);

currentTabs = [
  {
    tabId: "tab-current",
    customTabName: "Olimpiade Sains",
    isDefault: true,
    isActive: true,
    documents: [],
  },
];
const legacyCurrentTab = await downloadApiWindow.TalentaDownloadApi.load();
assert.equal(
  legacyCurrentTab.configs[0]?.customTabName,
  "Olimpiade Sains 2027",
  "Nama tab default lama harus ditingkatkan agar menyertakan tahun.",
);

currentTabs[0].customTabName = "Panduan 2027";
const customCurrentTab = await downloadApiWindow.TalentaDownloadApi.load();
assert.equal(
  customCurrentTab.configs[0]?.customTabName,
  "Panduan 2027",
  "Nama tab custom Event saat ini harus dipertahankan.",
);

assert.ok(
  downloadAdminHtml.includes('id="downloadCurrentTabName"') &&
    downloadEditorSource.includes("currentConfig.customTabName"),
  "Editor harus menyediakan input nama tab untuk Event saat ini dan mengikatnya ke customTabName.",
);
assert.ok(
  downloadEditorSource.includes('class="repeat-row download-document-row"'),
  "Baris dokumen harus memakai repeat-row tanpa class grid dokumen lama.",
);
assert.ok(
  downloadEditorSource.includes('class="download-document-row__heading"'),
  "Judul dan banner dokumen harus berada dalam satu baris heading.",
);
assert.ok(
  downloadEditorSource.includes('class="download-document-row__file"'),
  "Tautan file harus berada pada baris tersendiri di bawah heading.",
);
assert.match(
  mainCss,
  /\.download-document-row__main\s*\{[^}]*text-align:\s*left;/s,
  "Konten dokumen harus dipaksa rata kiri oleh CSS khusus.",
);
assert.ok(
  !downloadEditorSource.includes("saveDownloadCompetitionSettings"),
  "Toggle dokumen tidak boleh memanggil fungsi simpan yang tidak tersedia.",
);
assert.ok(
  !downloadEditorSource.includes("showToast("),
  "Editor Unduh harus memakai helper toast lokal yang tersedia.",
);
assert.ok(
  !downloadApiSource.includes("`${current.id}:${index}`") &&
    !downloadApiSource.includes("`${current.id}:0`"),
  "Konfigurasi tab Event saat ini harus memakai current.id agar resolver preview menemukan sumber dokumen.",
);
assert.ok(
  downloadApiSource.includes("restoreDocumentOrder"),
  "Load Admin harus memulihkan urutan dokumen dari konfigurasi tab tersimpan.",
);
assert.ok(
  downloadEditorSource.includes("moveCurrentDocument") &&
    downloadEditorSource.includes("pointerdown") &&
    downloadEditorSource.includes("data-current-up") &&
    downloadEditorSource.includes("data-current-down"),
  "Dokumen saat ini harus mendukung pointer drag dan tombol naik/turun accessible.",
);
assert.match(
  mainCss,
  /button\.repeat-row__grip\s*\{[^}]*min-width:\s*44px;[^}]*touch-action:\s*none;/s,
  "Grip dokumen harus berupa target pointer 44px tanpa mengambil scroll di luar grip.",
);
assert.ok(
  publicApiSource.includes("by-host") &&
    publicApiSource.includes("bootstrapPromise"),
  "Runtime publik harus resolve hostname melalui bootstrap canonical dan menghindari request bootstrap ganda.",
);
assert.ok(
  downloadRendererSource.includes("TalentaPublic.load"),
  "Renderer publik harus memuat data dari API sebagai sumber utama.",
);
assert.ok(
  downloadRendererSource.includes("Coba lagi") &&
    downloadRendererSource.includes('role="alert"'),
  "Kegagalan API publik harus menampilkan error accessible dengan retry.",
);
assert.ok(
  !downloadHtml.includes("OSN 2025") &&
    !downloadHtml.includes("TAB PANEL: Lomba Sekarang"),
  "HTML Unduh publik tidak boleh membawa payload dokumen OSN dummy.",
);

console.log(
  "Audit relasi Unduh lulus: competition FK, document FK, sanitasi, status publik, fallback default, reorder persisted, runtime API-only, dan struktur baris dokumen tervalidasi.",
);
