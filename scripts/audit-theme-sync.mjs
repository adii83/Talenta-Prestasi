import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = (path) => readFileSync(path, "utf8");
const settingsRepositoryPath =
  "packages/shared/js/data/repositories/settings-repository.js";
const settingsRepository = read(settingsRepositoryPath);

const editorContracts = [
  [
    "apps/admin/editors/beranda/index.html",
    "apps/admin/js/features/home/editor.js",
  ],
  [
    "apps/admin/editors/unduh/index.html",
    "apps/admin/js/features/downloads/editor.js",
  ],
  [
    "apps/admin/editors/pemenang/index.html",
    "apps/admin/js/features/winners/manager.js",
  ],
  [
    "apps/admin/editors/arsip/index.html",
    "apps/admin/js/features/archive/manager.js",
  ],
  [
    "apps/admin/editors/arsip/detail/index.html",
    "apps/admin/js/features/archive/detail-editor.js",
  ],
  [
    "apps/admin/editors/faq/index.html",
    "apps/admin/js/features/faq/manager.js",
  ],
];

for (const [htmlPath, featurePath] of editorContracts) {
  const html = read(htmlPath);
  const feature = read(featurePath);
  const repositoryIndex = html.indexOf("settings-repository.js");
  const featureFile = featurePath.split("/").at(-1);
  const featureIndex = html.indexOf(featureFile);
  assert(repositoryIndex >= 0, `${htmlPath} belum memuat settings repository`);
  assert(featureIndex >= 0, `${htmlPath} belum memuat ${featureFile}`);
  assert(
    repositoryIndex < featureIndex,
    `${htmlPath} harus memuat settings repository sebelum feature`,
  );
  assert(
    feature.includes("applyGlobalThemeTokens"),
    `${featurePath} belum menerapkan token tema global`,
  );
  assert(
    feature.includes("subscribeGlobalSettings"),
    `${featurePath} belum berlangganan perubahan tema global`,
  );
}

const templateEntries = [
  "apps/template/index.html",
  "apps/template/unduh/index.html",
  "apps/template/pemenang/index.html",
  "apps/template/arsip/index.html",
  "apps/template/arsip/detail/index.html",
  "apps/template/faq/index.html",
];

for (const htmlPath of templateEntries) {
  const html = read(htmlPath);
  const repositoryIndex = html.indexOf("settings-repository.js");
  const runtimeIndex = html.indexOf("runtime.js");
  assert(repositoryIndex >= 0, `${htmlPath} belum memuat settings repository`);
  assert(runtimeIndex >= 0, `${htmlPath} belum memuat runtime global`);
  assert(
    repositoryIndex < runtimeIndex,
    `${htmlPath} harus memuat settings repository sebelum runtime`,
  );
}

assert(
  !read("apps/admin/index.html").includes('id="accentColor"'),
  "Pengaturan Global tidak boleh lagi menampilkan pemilih Warna Sorotan",
);
assert(
  !read("apps/template/assets/js/archive-detail.js").includes(
    "competition.gradient",
  ),
  "banner Detail Arsip publik harus mengikuti gradient tema global",
);
assert(
  !read("apps/admin/editors/arsip/detail/index.html").includes(
    "detailGradient",
  ),
  "editor Detail Arsip tidak boleh lagi menyediakan gradient per lomba",
);
assert(
  read("apps/template/assets/js/ui.js").includes('aria-current", "page"'),
  "navigasi publik harus menandai halaman aktif secara aksesibel",
);
assert(
  read("apps/template/assets/js/home-renderer.js").includes(
    "buildHomeHeroMarkup",
  ) &&
    read("apps/admin/js/features/home/editor.js").includes(
      "buildHomeHeroMarkup",
    ),
  "Hero Template dan preview Admin harus memakai builder markup bersama",
);

const storage = new Map();
const listeners = new Map();
const context = {
  console,
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  },
  window: {
    addEventListener(type, callback) {
      const callbacks = listeners.get(type) || [];
      callbacks.push(callback);
      listeners.set(type, callbacks);
    },
    dispatchEvent(event) {
      for (const callback of listeners.get(event.type) || []) callback(event);
    },
  },
  CustomEvent: class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  },
};
vm.createContext(context);
vm.runInContext(
  `${settingsRepository}
globalThis.__themeAudit = {
  getGlobalSettings,
  getGlobalThemePalette,
  applyGlobalThemeTokens,
  subscribeGlobalSettings,
  GLOBAL_SETTINGS_KEY
};`,
  context,
);

const audit = context.__themeAudit;
assert.equal(audit.getGlobalSettings().version, 3);
assert.equal(audit.getGlobalSettings().theme.accentColor, "#ffffff");

storage.set(
  audit.GLOBAL_SETTINGS_KEY,
  JSON.stringify({
    version: 2,
    theme: { primaryColor: "#1e4b8c", accentColor: "#c89b3c" },
  }),
);
assert.equal(
  audit.getGlobalSettings().theme.accentColor,
  "#ffffff",
  "aksen emas default schema v2 harus dimigrasikan ke putih",
);

storage.set(
  audit.GLOBAL_SETTINGS_KEY,
  JSON.stringify({
    version: 3,
    theme: { primaryColor: "#2457a6", accentColor: "#e8f1ff" },
  }),
);
const properties = new Map();
audit.applyGlobalThemeTokens(
  {
    style: {
      setProperty: (name, value) => properties.set(name, value),
    },
  },
  audit.getGlobalSettings(),
);
assert.equal(properties.get("--c-primary"), "#2457a6");
assert.equal(properties.get("--c-accent"), "#ffffff");
assert.equal(properties.get("--c-gold"), "#ffffff");
assert.equal(properties.get("--c-rank"), "#2457a6");
assert.equal(properties.get("--c-primary-dark"), "#1a3f78");
assert.equal(properties.get("--c-primary-light"), "#4b75b6");
assert.equal(properties.get("--c-navy"), "#10274b");
assert.equal(properties.get("--c-primary-rgb"), "36 87 166");
assert.equal(properties.get("--c-navy-rgb"), "16 39 75");
assert.equal(properties.get("--preview-primary"), "#2457a6");
assert.equal(properties.get("--preview-accent"), "#ffffff");
assert.equal(properties.get("--preview-navy"), "#10274b");

const greenPalette = audit.getGlobalThemePalette({
  theme: { primaryColor: "#3a8f1f", accentColor: "#ffffff" },
});
assert.deepEqual(
  JSON.parse(JSON.stringify(greenPalette)),
  {
    primary: "#3a8f1f",
    primaryRgb: "58 143 31",
    primaryDark: "#2a6716",
    primaryLight: "#5da347",
    navy: "#1a400e",
    navyRgb: "26 64 14",
    accent: "#ffffff",
  },
  "warna gelap dan terang harus diturunkan dari warna utama",
);

let notifications = 0;
audit.subscribeGlobalSettings(() => notifications++);
for (const callback of listeners.get("storage") || [])
  callback({ key: audit.GLOBAL_SETTINGS_KEY });
assert.equal(
  notifications,
  1,
  "perubahan storage harus merender ulang preview",
);

const directLegacyReads = editorContracts
  .map(([, featurePath]) => featurePath)
  .filter((featurePath) =>
    /localStorage\.getItem\([^)]*talenta_event_settings_v1/.test(
      read(featurePath),
    ),
  );
assert.deepEqual(
  directLegacyReads,
  [],
  `feature masih membaca schema tema secara langsung: ${directLegacyReads.join(", ")}`,
);

console.log(
  `PASS: tema global tersinkron pada ${editorContracts.length} editor Admin dan ${templateEntries.length} halaman Template.`,
);
