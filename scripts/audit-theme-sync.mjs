import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = (path) => readFileSync(path, "utf8");
const settingsRepositoryPath =
  "packages/shared/js/data/repositories/settings-repository.js";
const settingsRepository = read(settingsRepositoryPath);
const settingsEditor = read("apps/admin/js/shell/settings-editor.js");

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
  "apps/public-site/index.html",
  "apps/public-site/unduh/index.html",
  "apps/public-site/pemenang/index.html",
  "apps/public-site/arsip/index.html",
  "apps/public-site/arsip/detail/index.html",
  "apps/public-site/faq/index.html",
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
assert.match(
  settingsEditor,
  /globalState\s*=\s*saveGlobalSettings\(globalState\)/,
  "settings Event tersimpan harus memperbarui cache preview Event terpilih",
);
assert.equal(
  settingsEditor.match(/globalState\s*=\s*saveGlobalSettings\(nextState\)/g)
    ?.length,
  4,
  "settings Event dari API dan hasil Urungkan edit harus mengisi cache preview Event terpilih pada sukses dan fallback",
);
const uploadLogoHandler = settingsEditor.slice(
  settingsEditor.indexOf("eventLogo.onchange"),
  settingsEditor.indexOf("logoDeleteButton.onclick"),
);
assert.match(
  uploadLogoHandler,
  /const generation = \+\+settingsLoadGeneration;[\s\S]*TalentaMedia\.upload\([\s\S]*if \(generation !== settingsLoadGeneration\) return;[\s\S]*globalState\.identity\.logoAssetId = asset\.assetId;[\s\S]*hydrateLogoPreview\(asset\.assetId, generation\)/,
  "upload logo harus memakai generation dan berhenti sebelum mengubah state ketika stale",
);
assert.match(
  uploadLogoHandler,
  /catch \(error\) \{\s*if \(generation !== settingsLoadGeneration\) return;\s*replaceLogoPreviewUrl\(""\)/s,
  "gagal hidrasi upload yang stale tidak boleh menghapus preview terbaru",
);
assert.match(
  uploadLogoHandler,
  /catch \(error\) \{\s*if \(generation === settingsLoadGeneration\)\s*showToast\(error\.message, true\);\s*\}/s,
  "error upload yang stale tidak boleh menampilkan toast",
);
const uploadAssetIdIndex = uploadLogoHandler.indexOf(
  "globalState.identity.logoAssetId = asset.assetId",
);
const uploadHydrateIndex = uploadLogoHandler.indexOf("hydrateLogoPreview(");
const uploadFallbackIndex = uploadLogoHandler.indexOf(
  'replaceLogoPreviewUrl("")',
  uploadHydrateIndex,
);
const uploadRenderIndex = uploadLogoHandler.indexOf(
  "renderPreview()",
  uploadFallbackIndex,
);
assert(
  uploadAssetIdIndex >= 0 &&
    uploadAssetIdIndex < uploadHydrateIndex &&
    uploadFallbackIndex > uploadHydrateIndex &&
    uploadLogoHandler.indexOf('setLogo("")', uploadFallbackIndex) >
      uploadFallbackIndex &&
    uploadRenderIndex > uploadFallbackIndex &&
    uploadLogoHandler.indexOf("throw error", uploadRenderIndex) >
      uploadRenderIndex,
  "gagal hidrasi upload harus mempertahankan asset ID lalu merender fallback kosong sebelum meneruskan error",
);
assert.match(
  settingsEditor,
  /if\s*\(generation !== undefined && generation !== settingsLoadGeneration\)\s*\{\s*TalentaMedia\.revokePreviewUrl\(url\);\s*return false;\s*\}/s,
  "Object URL dari operasi settings yang stale harus langsung dicabut",
);
assert.match(
  settingsEditor,
  /async function revertSettings\(\)\s*\{\s*const generation = \+\+settingsLoadGeneration;/s,
  "Urungkan edit harus membuat generation baru sebelum load settings",
);
assert.match(
  settingsEditor,
  /const initialGeneration = \+\+settingsLoadGeneration;\s*void Promise\.all/s,
  "load awal harus memiliki generation sendiri",
);
assert.match(
  settingsEditor,
  /input\.onchange = \(\) => \{\s*\+\+settingsLoadGeneration;/s,
  "edit navigasi harus membatalkan load atau upload logo lama",
);
assert.match(
  settingsEditor,
  /addEventListener\("input", \(\) => \{\s*\+\+settingsLoadGeneration;\s*renderPreview\(\);/s,
  "edit form harus membatalkan load atau upload logo lama",
);
assert.match(
  settingsEditor,
  /logoDeleteButton\.onclick = \(\) => \{\s*\+\+settingsLoadGeneration;/s,
  "hapus logo harus membatalkan operasi logo lama",
);
assert.match(
  settingsEditor,
  /delBtn\.hidden = !globalState\?\.identity\?\.logoAssetId;/,
  "tombol hapus harus tetap tersedia berdasarkan asset ID ketika preview gagal dimuat",
);
assert.match(
  settingsEditor,
  /form\.onsubmit = async \(e\) => \{\s*e\.preventDefault\(\);\s*\+\+settingsLoadGeneration;/s,
  "simpan harus membatalkan operasi logo lama",
);
assert(
  !read("apps/public-site/assets/js/archive-detail.js").includes(
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
  read("apps/public-site/assets/js/ui.js").includes('aria-current", "page"'),
  "navigasi publik harus menandai halaman aktif secara aksesibel",
);
assert(
  read("apps/public-site/assets/js/home-renderer.js").includes(
    "buildHomeHeroMarkup",
  ) &&
    read("apps/admin/js/features/home/editor.js").includes(
      "buildHomeHeroMarkup",
    ),
  "Hero Public Site dan preview Admin harus memakai builder markup bersama",
);

const homeSection = () => ({
  className: "",
  innerHTML: "",
  insertAdjacentElement() {},
});
const publicHomeContext = {
  console,
  URL,
  location: {
    origin: "https://oips.example.test",
    href: "https://oips.example.test/",
  },
  window: {
    TalentaConfig: { apiBaseUrl: "https://api.example.test/api/v1" },
    addEventListener() {},
  },
  document: { getElementById: () => homeSection() },
  TalentaConfig: { apiBaseUrl: "https://api.example.test/api/v1" },
  TalentaPaths: { to: () => "https://oips.example.test/" },
  TalentaPublic: { load: () => new Promise(() => {}) },
  getHomeAdminState: () => ({
    hero: {},
    schedule: {},
    pricing: {},
    benefit: {},
    winnerHighlight: {},
    partners: {},
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
  lucide: { createIcons() {} },
};
publicHomeContext.window.window = publicHomeContext.window;
vm.createContext(publicHomeContext);
vm.runInContext(
  read("apps/public-site/assets/js/home-renderer.js").replace(
    "window.TalentaHome = Object.freeze({ render: renderHome });",
    "window.TalentaHome = Object.freeze({ render: renderHome, assetUrl });",
  ),
  publicHomeContext,
  { filename: "home-renderer.js" },
);
const publicAssetUrl = publicHomeContext.window.TalentaHome.assetUrl;
const legacyHeroAsset = "11111111-2222-4333-8444-555555555555";
assert.equal(
  publicAssetUrl(
    `http://localhost:3000/api/v1/public/media/${legacyHeroAsset}`,
  ),
  `https://api.example.test/api/v1/public/media/${legacyHeroAsset}`,
  "URL media internal lama harus memakai API origin runtime, bukan localhost pengunjung.",
);
assert.equal(
  publicAssetUrl("https://cdn.example.test/maskot.webp"),
  "https://cdn.example.test/maskot.webp",
  "URL gambar eksternal tidak boleh diubah.",
);

const storage = new Map();
const listeners = new Map();
let selectedEventId = "event-2026";
const context = {
  console,
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  },
  window: {
    parent: {
      TalentaAdminAuth: {
        currentEvent: () => ({ id: selectedEventId }),
      },
    },
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
  saveGlobalSettings,
  GLOBAL_SETTINGS_KEY,
  globalSettingsStorageKey
};`,
  context,
);

const audit = context.__themeAudit;
assert.equal(
  audit.getGlobalSettings().identity.logoAssetId,
  null,
  "baseline identity harus memakai logoAssetId null",
);
assert.equal(
  audit.getGlobalSettings().identity.navbarLogoSize,
  36,
  "baseline identity harus memakai ukuran logo navbar 36 px",
);
const normalizedLogoSizes = vm.runInContext(
  `[
    normalizeGlobalSettings({ version: 3, identity: { navbarLogoSize: 12 } }).identity.navbarLogoSize,
    normalizeGlobalSettings({ version: 3, identity: { navbarLogoSize: 50 } }).identity.navbarLogoSize,
    normalizeGlobalSettings({ version: 3, identity: { navbarLogoSize: "40" } }).identity.navbarLogoSize,
    normalizeGlobalSettings({ version: 3, identity: { navbarLogoSize: "invalid" } }).identity.navbarLogoSize,
  ]`,
  context,
);
assert.deepEqual(
  Array.from(normalizedLogoSizes),
  [24, 44, 40, 36],
  "ukuran logo navbar harus dinormalisasi ke rentang 24..44 dengan fallback 36",
);
let previewEventDetail;
context.window.addEventListener(
  "talenta:settings",
  (event) => (previewEventDetail = event.detail),
);
const previewSettings = audit.saveGlobalSettings({
  version: 3,
  identity: {
    logoAssetId: "asset-logo",
    logo: "blob:admin-logo-preview",
    navbarLogoSize: 40,
  },
});
assert.equal(
  previewSettings.identity.logo,
  "blob:admin-logo-preview",
  "state memori hasil save harus mempertahankan Object URL preview",
);
assert.equal(
  previewEventDetail.identity.logo,
  "blob:admin-logo-preview",
  "detail event settings harus mempertahankan Object URL preview",
);
assert.equal(
  JSON.parse(storage.get(audit.globalSettingsStorageKey())).identity.logo,
  "",
  "cache localStorage tidak boleh menyimpan Object URL preview",
);
assert(
  !storage.get(audit.globalSettingsStorageKey()).includes("blob:"),
  "cache localStorage tidak boleh memuat blob:",
);
assert.equal(
  audit.globalSettingsStorageKey(),
  `${audit.GLOBAL_SETTINGS_KEY}:event-2026`,
  "cache tema Admin harus memakai ID Event terpilih",
);
audit.saveGlobalSettings({
  version: 3,
  theme: { primaryColor: "#2457a6" },
});
selectedEventId = "event-2027";
audit.saveGlobalSettings({
  version: 3,
  theme: { primaryColor: "#a62626" },
});
assert.equal(
  audit.getGlobalSettings().theme.primaryColor,
  "#a62626",
  "preview Event 2027 harus memakai tema Event 2027",
);
selectedEventId = "event-2026";
assert.equal(
  audit.getGlobalSettings().theme.primaryColor,
  "#2457a6",
  "preview Event 2026 harus tetap memakai tema Event 2026",
);
assert.equal(audit.getGlobalSettings().version, 3);
assert.equal(audit.getGlobalSettings().theme.accentColor, "#ffffff");

storage.set(
  audit.globalSettingsStorageKey(),
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
  audit.globalSettingsStorageKey(),
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
  callback({ key: audit.globalSettingsStorageKey() });
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

const heroPreviewElements = new Map();
const heroPreviewRoot = {
  className: "",
  innerHTML: "",
  querySelectorAll: () => [],
};
heroPreviewElements.set("homePreview", heroPreviewRoot);
heroPreviewElements.set("heroImagePreview", { innerHTML: "" });
heroPreviewElements.set("heroImageDelete", { hidden: true });
const revokedHeroUrls = [];
const heroPreviewContext = {
  console,
  structuredClone,
  localStorage: {
    getItem: () => null,
    setItem() {},
    removeItem() {},
  },
  window: {
    addEventListener() {},
    dispatchEvent() {},
  },
  document: {
    addEventListener() {},
    getElementById(id) {
      if (!heroPreviewElements.has(id))
        heroPreviewElements.set(id, { type: "text", value: "" });
      return heroPreviewElements.get(id);
    },
  },
  CustomEvent: class CustomEvent {},
  ResizeObserver: class ResizeObserver {},
  requestAnimationFrame: () => 0,
  getGlobalSettings: () => ({ theme: {} }),
  applyGlobalThemeTokens() {},
  subscribeGlobalSettings() {},
  lucide: { createIcons() {} },
  TalentaMedia: {
    LIMITS: { customDesignOutput: 500 * 1024 },
    async compressCustomDesign(file) {
      heroPreviewContext.__uploadCalls.push(["compress", file]);
      return { name: "maskot.webp", size: 400 * 1024 };
    },
    async upload(file) {
      heroPreviewContext.__uploadCalls.push(["upload", file]);
      return {
        assetId: "66666666-7777-4888-8999-aaaaaaaaaaaa",
        url: "/api/v1/public/media/66666666-7777-4888-8999-aaaaaaaaaaaa",
      };
    },
    async adminPreviewUrl(assetId) {
      return `blob:hero-${assetId}`;
    },
    revokePreviewUrl(url) {
      revokedHeroUrls.push(url);
    },
  },
  __uploadCalls: [],
};
vm.createContext(heroPreviewContext);
vm.runInContext(
  `${read("packages/shared/js/data/repositories/home-repository.js")}
${read("apps/admin/js/features/home/editor.js")}
globalThis.__heroPreviewAudit =
  typeof hydrateHeroImagePreview === "function" &&
  typeof heroImagePreviewSource === "function"
    ? {
        setImage(value) { state.hero.image = value; },
        stateImage() { return state.hero.image; },
        hydrate: hydrateHeroImagePreview,
        upload: uploadHeroImage,
        source: heroImagePreviewSource,
        renderHero,
        sync,
        release: releaseHeroImagePreview,
      }
    : null;`,
  heroPreviewContext,
);
const heroPreviewAudit = heroPreviewContext.__heroPreviewAudit;
assert(heroPreviewAudit, "editor Hero harus menyediakan preview media Admin");
const heroAssetId = "11111111-2222-4333-8444-555555555555";
const publicHeroUrl = `/api/v1/public/media/${heroAssetId}`;
heroPreviewAudit.setImage(publicHeroUrl);
heroPreviewAudit.sync();
assert.doesNotMatch(
  heroPreviewElements.get("heroImagePreview").innerHTML,
  /<img\b/,
  "thumbnail maskot harus memakai placeholder selama Blob belum tersedia",
);
await heroPreviewAudit.hydrate(publicHeroUrl);
assert.equal(
  heroPreviewAudit.stateImage(),
  publicHeroUrl,
  "URL publik maskot harus tetap tersimpan untuk publikasi",
);
assert.equal(
  heroPreviewAudit.source(),
  `blob:hero-${heroAssetId}`,
  "preview Hero Admin harus memakai Blob terautentikasi",
);
const heroSourceFile = { name: "maskot.png", size: 1_500_000 };
await heroPreviewAudit.upload(heroSourceFile);
assert.equal(heroPreviewContext.__uploadCalls[0][0], "compress");
assert.equal(heroPreviewContext.__uploadCalls[0][1], heroSourceFile);
assert.equal(heroPreviewContext.__uploadCalls[1][0], "upload");
assert.equal(
  heroPreviewContext.__uploadCalls[1][1].name,
  "maskot.webp",
  "Hero harus mengunggah hasil kompresi, bukan file sumber.",
);
assert.equal(
  heroPreviewAudit.stateImage(),
  "/api/v1/public/media/66666666-7777-4888-8999-aaaaaaaaaaaa",
  "Hero harus menyimpan path media canonical dari backend.",
);
heroPreviewAudit.setImage(publicHeroUrl);
await heroPreviewAudit.hydrate(publicHeroUrl);
heroPreviewAudit.sync();
assert.match(
  heroPreviewElements.get("heroImagePreview").innerHTML,
  new RegExp(`src="blob:hero-${heroAssetId}"`),
  "thumbnail maskot Admin harus memakai Blob terautentikasi",
);
heroPreviewAudit.renderHero();
assert.match(
  heroPreviewRoot.innerHTML,
  new RegExp(`src="blob:hero-${heroAssetId}"`),
  "preview Hero Admin harus memakai Blob terautentikasi",
);
heroPreviewAudit.release();
assert.deepEqual(
  revokedHeroUrls,
  [
    `blob:hero-${heroAssetId}`,
    "blob:hero-66666666-7777-4888-8999-aaaaaaaaaaaa",
    `blob:hero-${heroAssetId}`,
  ],
  "Setiap Object URL maskot lama dan aktif harus dicabut saat diganti atau dilepas",
);

console.log(
  `PASS: tema global tersinkron pada ${editorContracts.length} editor Admin dan ${templateEntries.length} halaman Public Site.`,
);
