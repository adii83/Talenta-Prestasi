import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

// Static source assertions
const apiClient = fs.readFileSync(
  "packages/shared/js/core/api-client.js",
  "utf8",
);
const mediaClient = fs.readFileSync(
  "packages/shared/js/core/media-client.js",
  "utf8",
);
const adminSettings = fs.readFileSync("apps/admin/index.html", "utf8");
const settingsEditor = fs.readFileSync(
  "apps/admin/js/shell/settings-editor.js",
  "utf8",
);
const settingsRepository = fs.readFileSync(
  "packages/shared/js/data/repositories/settings-repository.js",
  "utf8",
);
const runtime = fs.readFileSync(
  "apps/public-site/assets/js/runtime.js",
  "utf8",
);
const publicStyles = fs.readFileSync(
  "apps/public-site/assets/css/main.css",
  "utf8",
);
assert.match(apiClient, /responseType === "blob"/);
assert.match(mediaClient, /async function adminPreviewUrl/);
assert.match(mediaClient, /URL\.createObjectURL/);
assert.match(mediaClient, /URL\.revokeObjectURL/);
assert.match(
  adminSettings,
  /Rekomendasi:\s*rasio 1:1 dengan background\s*transparan\.\s*PNG, JPG, atau WebP, maksimal 5\s*MB\./,
);
assert.match(
  adminSettings,
  /<input\s+id="navbarLogoSize"\s+type="range"\s+min="24"\s+max="44"\s+step="1"\s*\/>/,
);
assert.match(
  adminSettings,
  /<output\s+id="navbarLogoSizeValue"\s+for="navbarLogoSize"\s*>36 px<\/output/,
);
assert.match(settingsEditor, /TalentaMedia\.adminPreviewUrl/);
assert.match(settingsEditor, /globalState\.identity\.navbarLogoSize/);
assert.match(settingsEditor, /TalentaMedia\.revokePreviewUrl/);
assert.match(
  settingsRepository,
  /Math\.min\(\s*44,\s*Math\.max\(24,\s*Number\(source\.identity\?\.navbarLogoSize\) \|\| 36\),?\s*\)/,
);
assert.match(runtime, /link\[rel="icon"\]\[data-talenta-event-icon\]/);
assert.match(runtime, /settings\.identity\.navbarLogoSize/);
assert.match(runtime, /--navbar-logo-size/);
assert.match(
  runtime,
  /navbarLogoSize:\s*data\.settings\.navbarLogoSize \?\? 36/,
);
assert.match(
  publicStyles,
  /\.navbar__logo:has\(img\),\s*\.mobile-header__logo:has\(img\)\s*\{[^}]*width:\s*var\(--navbar-logo-size,\s*36px\);[^}]*height:\s*var\(--navbar-logo-size,\s*36px\);[^}]*flex:\s*none;[^}]*background:\s*transparent;[^}]*border-radius:\s*0;/s,
);
assert.match(
  publicStyles,
  /\.navbar__logo img,\s*\.mobile-header__logo img\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*contain;[^}]*border-radius:\s*0;/s,
);
assert.match(
  publicStyles,
  /\.footer__logo\s*\{[^}]*width:\s*36px;[^}]*height:\s*36px;/s,
  "footer harus mempertahankan ukuran 36 px yang terpisah dari slider navbar",
);
assert.doesNotMatch(
  publicStyles.match(/\.footer__logo\s*\{[^}]*\}/s)?.[0] || "",
  /--navbar-logo-size/,
  "footer tidak boleh memakai ukuran logo navbar",
);
assert.match(
  publicStyles,
  /\.footer__logo:has\(img\)\s*\{[^}]*background:\s*transparent;[^}]*border-radius:\s*0;/s,
  "footer bergambar harus transparan tanpa bingkai",
);
assert.match(
  publicStyles,
  /\.footer__logo img\s*\{[^}]*object-fit:\s*contain;[^}]*border-radius:\s*0;/s,
  "gambar footer harus tampil utuh seperti navbar",
);
const responsiveLogoRuleIndex = publicStyles.search(
  /\.navbar__logo:has\(img\),\s*\.mobile-header__logo:has\(img\)/,
);
assert.notEqual(responsiveLogoRuleIndex, -1);
const stylesBeforeResponsiveLogoRule = publicStyles.slice(
  0,
  responsiveLogoRuleIndex,
);
assert.equal(
  (stylesBeforeResponsiveLogoRule.match(/\{/g) || []).length,
  (stylesBeforeResponsiveLogoRule.match(/\}/g) || []).length,
  "responsive logo rule must not be restricted to a media query",
);

class FakeStyle {
  #properties = new Map();

  setProperty(name, value) {
    this.#properties.set(name, String(value));
  }

  getPropertyValue(name) {
    return this.#properties.get(name) || "";
  }
}

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.parentNode = null;
    this.style = new FakeStyle();
    this._textContent = "";
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this.children.forEach((child) => (child.parentNode = null));
    this.children = [];
    this._textContent = String(value);
  }

  append(child) {
    child.parentNode = this;
    this.children.push(child);
  }

  replaceChildren(...children) {
    this.children.forEach((child) => (child.parentNode = null));
    this.children = [];
    this._textContent = "";
    children.forEach((child) => this.append(child));
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter(
      (child) => child !== this,
    );
    this.parentNode = null;
  }

  getAttribute(name) {
    return this[name] || null;
  }

  removeAttribute(name) {
    delete this[name];
  }
}

class FakePublicDocument {
  constructor() {
    this.documentElement = new FakeElement("html");
    this.head = new FakeElement("head");
    this.navbarLogo = new FakeElement();
    this.mobileLogo = new FakeElement();
    this.footerLogo = new FakeElement();
    this.staticFavicon = new FakeElement("link");
    this.staticFavicon.rel = "icon";
    this.staticFavicon.href = "/favicon.ico";
    this.head.append(this.staticFavicon);
  }

  createElement(tagName) {
    return new FakeElement(tagName);
  }

  querySelector(selector) {
    if (selector !== 'link[rel="icon"][data-talenta-event-icon]') {
      return null;
    }
    return (
      this.head.children.find(
        (element) =>
          element.rel === "icon" &&
          Object.hasOwn(element.dataset, "talentaEventIcon"),
      ) || null
    );
  }

  querySelectorAll(selector) {
    if (selector === ".navbar__logo,.mobile-header__logo,.footer__logo") {
      return [this.navbarLogo, this.mobileLogo, this.footerLogo];
    }
    return [];
  }
}

function publicSettings(logo, navbarLogoSize) {
  return {
    identity: {
      eventName: "North Star Event",
      logo,
      navbarLogoSize,
    },
    navigation: {},
    contact: { email: "", whatsappDisplay: "", address: "" },
    footer: {
      brandName: "",
      description: "",
      contactHeading: "",
      copyright: "",
    },
  };
}

function auditPublicRuntime(runtimeSource) {
  const document = new FakePublicDocument();
  const listeners = new Map();
  let appliedTheme = "";
  const runtimeWindow = {
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
  };
  const runtimeContext = {
    URL,
    TalentaConfig: { apiBaseUrl: "/api/v1" },
    TalentaPublic: {
      bootstrap: async () => {},
      mediaUrl: (source) =>
        `${new URL(source, "https://event.example.test").href}?preview_token=event-token`,
    },
    applyGlobalThemeTokens(_target, settings) {
      appliedTheme = settings.theme?.primaryColor || "";
    },
    buildWhatsappUrl: () => "",
    console,
    document,
    getFirstEnabledPublicPage: () => "/",
    getGlobalSettings: () => publicSettings("", 36),
    isPublicPageEnabled: () => true,
    location: {
      href: "https://event.example.test/",
      origin: "https://event.example.test",
      replace() {},
    },
    normalizeGlobalSettings: (settings) => settings,
    publicPageId: () => "",
    window: runtimeWindow,
  };
  vm.createContext(runtimeContext);
  vm.runInContext(runtimeSource, runtimeContext);

  listeners.get("talenta:public:bootstrap")({
    detail: {
      currentEvent: { name: "Event Aktif" },
      site: {
        name: "Kategori",
        slug: "kategori",
        organizerName: "Penyelenggara",
        logoUrl: "/api/v1/public/media/event-logo",
      },
      settings: {
        primaryColor: "#16803c",
        navbarLogoSize: 40,
        navigation: {},
        contact: {},
        footer: {},
      },
    },
  });
  assert.equal(appliedTheme, "#16803c", "tema Event aktif diterapkan");
  assert.equal(
    document.navbarLogo.children[0]?.src,
    "https://event.example.test/api/v1/public/media/event-logo?preview_token=event-token",
    "logo Event memakai origin gateway ketika API base relatif",
  );
  assert.equal(
    document.querySelector('link[rel="icon"][data-talenta-event-icon]')?.href,
    "https://event.example.test/api/v1/public/media/event-logo?preview_token=event-token",
    "favicon Event memakai logo bootstrap yang sama",
  );

  const oldNavbarImage = document.createElement("img");
  const oldMobileImage = document.createElement("img");
  document.navbarLogo.replaceChildren(oldNavbarImage);
  document.mobileLogo.replaceChildren(oldMobileImage);

  runtimeWindow.TalentaRuntime.applyGlobalSettings(
    publicSettings("https://cdn.example.test/event-logo.png", 1),
  );
  assert.equal(
    document.documentElement.style.getPropertyValue("--navbar-logo-size"),
    "24px",
    "navbar logo size clamps low",
  );
  const firstLogoUrl = "https://cdn.example.test/event-logo.png";
  const eventFavicon = document.querySelector(
    'link[rel="icon"][data-talenta-event-icon]',
  );
  assert.equal(
    eventFavicon?.href,
    firstLogoUrl,
    "marked event favicon created",
  );
  assert.equal(oldNavbarImage.parentNode, null, "old navbar image removed");
  assert.equal(oldMobileImage.parentNode, null, "old mobile image removed");
  const firstNavbarImage = document.navbarLogo.children[0];
  const firstMobileImage = document.mobileLogo.children[0];
  assert.equal(firstNavbarImage?.tagName, "IMG", "navbar logo image created");
  assert.equal(
    firstNavbarImage?.src,
    firstLogoUrl,
    "navbar logo uses Event logo",
  );
  assert.equal(firstMobileImage?.tagName, "IMG", "mobile logo image created");
  assert.equal(
    firstMobileImage?.src,
    firstLogoUrl,
    "mobile logo uses Event logo",
  );

  const secondLogoUrl = "https://cdn.example.test/replacement-logo.webp";
  runtimeWindow.TalentaRuntime.applyGlobalSettings(
    publicSettings(secondLogoUrl, undefined),
  );
  assert.equal(
    document.documentElement.style.getPropertyValue("--navbar-logo-size"),
    "36px",
    "omitted navbar logo size defaults to 36",
  );
  assert.equal(
    firstNavbarImage.parentNode,
    null,
    "old navbar logo is detached",
  );
  assert.equal(
    firstMobileImage.parentNode,
    null,
    "old mobile logo is detached",
  );
  assert.notEqual(document.navbarLogo.children[0], firstNavbarImage);
  assert.notEqual(document.mobileLogo.children[0], firstMobileImage);
  assert.equal(document.navbarLogo.children[0]?.src, secondLogoUrl);
  assert.equal(document.mobileLogo.children[0]?.src, secondLogoUrl);
  assert.equal(
    eventFavicon.href,
    secondLogoUrl,
    "favicon uses replacement logo",
  );

  runtimeWindow.TalentaRuntime.applyGlobalSettings(publicSettings("", 99));
  assert.equal(
    document.documentElement.style.getPropertyValue("--navbar-logo-size"),
    "44px",
    "navbar logo size clamps high",
  );
  assert.equal(
    document.querySelector('link[rel="icon"][data-talenta-event-icon]'),
    null,
    "marked event favicon removed when logo is empty",
  );
  assert.equal(
    document.staticFavicon.parentNode,
    document.head,
    "unrelated static favicon preserved",
  );
  assert.equal(document.staticFavicon.href, "/favicon.ico");
  assert.equal(document.navbarLogo.children.length, 0);
  assert.equal(document.navbarLogo.textContent, "NSE");
  assert.equal(document.mobileLogo.children.length, 0);
  assert.equal(document.mobileLogo.textContent, "NSE");
}

auditPublicRuntime(runtime);

// Runtime VM test
const blobSentinel = { _blob: true };
const fetchCalls = [];
const storage = new Map();

const context = {
  window: {},
  location: { hostname: "localhost", search: "" },
  URLSearchParams,
  sessionStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
  Headers,
  FormData,
  AbortController,
  setTimeout,
  clearTimeout,
  URL,
  fetch: async (url, options) => {
    fetchCalls.push({ url, options });
    return {
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Type": "application/octet-stream" }),
      blob: async () => blobSentinel,
      text: async () => JSON.stringify({}),
    };
  },
};
vm.createContext(context);
vm.runInContext(
  fs.readFileSync("packages/shared/js/core/runtime-config.js", "utf8"),
  context,
);
context.TalentaConfig = context.window.TalentaConfig;
vm.runInContext(apiClient, context);
context.TalentaApi = context.window.TalentaApi;

// Set test token
context.window.TalentaApi.setToken("test-access-token");

// Test blob response
const result = await vm.runInContext(
  `TalentaApi.request("/admin/events/event-1/media/asset-1", { responseType: "blob" })`,
  context,
);
assert.equal(result, blobSentinel, "blob sentinel returned");
assert.equal(
  fetchCalls[0].options.headers.get("Authorization"),
  "Bearer test-access-token",
);
assert.equal("responseType" in fetchCalls[0].options, false);
assert.equal("auth" in fetchCalls[0].options, false);
assert.equal("previewToken" in fetchCalls[0].options, false);

const successfulFetch = context.fetch;
context.fetch = async (url, options) => {
  fetchCalls.push({ url, options });
  return {
    ok: false,
    status: 404,
    text: async () => JSON.stringify({ message: "Media not found" }),
  };
};
await assert.rejects(
  context.window.TalentaApi.request(
    "/admin/events/event-1/media/missing-asset",
    { responseType: "blob" },
  ),
  (error) => error.status === 404 && error.message === "Media not found",
);
context.fetch = async () => ({
  ok: true,
  status: 200,
  blob: async () => {
    throw new Error("body read failed");
  },
});
await assert.rejects(
  context.window.TalentaApi.request(
    "/admin/events/event-1/media/broken-asset",
    { responseType: "blob" },
  ),
  (error) => error.message === "Tidak dapat terhubung ke server",
);
context.window.TalentaApi.setToken("expired-test-token");
context.fetch = async () => ({
  ok: false,
  status: 401,
  text: async () => "<html>Unauthorized</html>",
});
await assert.rejects(
  context.window.TalentaApi.request("/admin/session", {
    responseType: "blob",
  }),
  (error) => error.status === 401,
);
assert.equal(context.window.TalentaApi.token(), "");
context.window.TalentaApi.setToken("expired-test-token");
context.fetch = async () => ({
  ok: false,
  status: 401,
  text: async () => {
    throw new Error("body read failed");
  },
});
await assert.rejects(
  context.window.TalentaApi.request("/admin/session", {
    responseType: "blob",
  }),
  (error) => error.message === "Tidak dapat terhubung ke server",
);
assert.equal(context.window.TalentaApi.token(), "");
context.window.TalentaApi.setToken("test-access-token");
context.fetch = successfulFetch;

// Test media-client adminPreviewUrl
let createdUrl = null;
class AuditURL extends URL {}
AuditURL.createObjectURL = (blob) => {
  createdUrl = `blob:${blob._blob}`;
  return createdUrl;
};
AuditURL.revokeObjectURL = () => {};
context.URL = AuditURL;
context.window.parent = {
  TalentaAdminAuth: { currentEvent: () => ({ id: "ev-1" }) },
};
vm.runInContext(mediaClient, context);
context.TalentaMedia = context.window.TalentaMedia;

const previewUrl = await vm.runInContext(
  `TalentaMedia.adminPreviewUrl("asset-1")`,
  context,
);
assert.equal(previewUrl, "blob:true");
assert.equal(
  fetchCalls.at(-1).url,
  "http://localhost:3000/api/v1/admin/events/ev-1/media/asset-1",
);
const explicitPreviewUrl = await vm.runInContext(
  `TalentaMedia.adminPreviewUrl("asset-2", { siteId: "explicit-event" })`,
  context,
);
assert.equal(explicitPreviewUrl, "blob:true");
assert.equal(
  fetchCalls.at(-1).url,
  "http://localhost:3000/api/v1/admin/events/explicit-event/media/asset-2",
);
assert.equal(
  vm.runInContext(`TalentaMedia.url("asset-3")`, context),
  "http://localhost:3000/api/v1/public/media/asset-3",
);

// Test revokePreviewUrl
let revokedUrl = null;
context.URL.revokeObjectURL = (u) => {
  revokedUrl = u;
};
vm.runInContext(`TalentaMedia.revokePreviewUrl("blob:something")`, context);
assert.equal(revokedUrl, "blob:something");

// Non-blob should not revoke
revokedUrl = null;
vm.runInContext(`TalentaMedia.revokePreviewUrl("/api/v1/media/x")`, context);
assert.equal(revokedUrl, null);

console.log(
  "PASS: Event logo media, favicon, and responsive runtime validated.",
);
