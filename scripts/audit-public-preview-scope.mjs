import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const homeRenderer = await readFile(
  "apps/public-site/assets/js/home-renderer.js",
  "utf8",
);
assert.match(
  homeRenderer,
  /TalentaPublic\.mediaUrl\(source\)/,
  "Hero Beranda harus memakai URL media preview bertoken.",
);

async function runPublicApi(hash, initialStorage = []) {
  const calls = [];
  const events = [];
  const storage = new Map(initialStorage);
  const context = vm.createContext({
    console,
    URL,
    URLSearchParams,
    CustomEvent: class {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
    location: {
      hash,
      pathname: "/apps/public-site/arsip/detail/",
      search: "?event=2026&site=octal",
      hostname: "localhost",
      origin: "http://127.0.0.1:4173",
    },
    history: { state: null, replaceState() {} },
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
    TalentaConfig: { categorySlug: "octal" },
    TalentaApi: {
      request: async (path, options = {}) => {
        calls.push({ path, options });
        if (path.endsWith("/bootstrap"))
          return { data: { site: { slug: "octal" } } };
        return { data: {} };
      },
    },
    window: {
      dispatchEvent: (event) => events.push(event),
    },
  });
  context.window.window = context.window;
  const source = await readFile(
    "apps/public-site/assets/js/public-api.js",
    "utf8",
  );
  vm.runInContext(source, context, { filename: "public-api.js" });
  await context.window.TalentaPublic.bootstrap();
  return { context, calls, events, storage };
}

{
  const result = await runPublicApi(
    "#preview=archive-token&previewScope=archiveDetail",
  );
  await result.context.window.TalentaPublic.load("archiveDetail", "2026");
  await result.context.window.TalentaPublic.load("home");

  assert.equal(
    result.storage.has("talenta_event_preview_token"),
    false,
    "Token Detail Arsip tidak boleh menjadi preview global sessionStorage.",
  );
  assert.equal(
    result.calls.some((call) => call.path === "/public/preview/session"),
    false,
    "Token Detail Arsip tidak boleh membuat cookie preview global.",
  );
  const bootstrap = result.calls.find((call) =>
    call.path.endsWith("/bootstrap"),
  );
  const detail = result.calls.find((call) =>
    call.path.endsWith("/archives/2026"),
  );
  const home = result.calls.find((call) => call.path.endsWith("/home"));
  assert.equal(bootstrap.options.previewToken, undefined);
  assert.equal(detail.options.previewToken, "archive-token");
  assert.equal(home.options.previewToken, undefined);
  assert.equal(
    result.context.window.TalentaPublic.mediaUrl(
      "/api/v1/public/media/11111111-1111-4111-8111-111111111111",
      "archiveDetail",
    ),
    "http://127.0.0.1:4173/api/v1/public/media/11111111-1111-4111-8111-111111111111?preview_token=archive-token",
  );
}

{
  const result = await runPublicApi(
    "#preview=archive-token&previewScope=archiveDetail",
    [["talenta_event_preview_token", "stale-event-token"]],
  );
  await result.context.window.TalentaPublic.load("archiveDetail", "2026");
  await result.context.window.TalentaPublic.load("home");

  assert.equal(
    result.storage.has("talenta_event_preview_token"),
    false,
    "Preview Detail Arsip harus membuang token preview global lama.",
  );
  assert.equal(
    result.calls.some((call) => call.path === "/public/preview/session"),
    false,
    "Preview Detail Arsip tidak boleh mengaktifkan ulang sesi preview lama.",
  );
  const bootstrap = result.calls.find((call) =>
    call.path.endsWith("/bootstrap"),
  );
  const detail = result.calls.find((call) =>
    call.path.endsWith("/archives/2026"),
  );
  const home = result.calls.find((call) => call.path.endsWith("/home"));
  assert.equal(bootstrap.options.previewToken, undefined);
  assert.equal(detail.options.previewToken, "archive-token");
  assert.equal(home.options.previewToken, undefined);
  assert.equal(bootstrap.options.credentials, "omit");
  assert.equal(detail.options.credentials, "omit");
  assert.equal(home.options.credentials, "omit");

  const navigated = await runPublicApi("", [...result.storage]);
  await navigated.context.window.TalentaPublic.load("home");
  const navigatedBootstrap = navigated.calls.find((call) =>
    call.path.endsWith("/bootstrap"),
  );
  const navigatedHome = navigated.calls.find((call) =>
    call.path.endsWith("/home"),
  );
  assert.equal(navigatedBootstrap.options.previewToken, undefined);
  assert.equal(navigatedHome.options.previewToken, undefined);
  assert.equal(
    navigatedBootstrap.options.credentials,
    "omit",
    "Navigasi dari Detail Arsip harus tetap mengabaikan cookie preview lama.",
  );
  assert.equal(navigatedHome.options.credentials, "omit");
}

{
  const result = await runPublicApi(
    "#preview=current-token&archivePreview=archive-token&previewScope=archiveDetail",
  );
  await result.context.window.TalentaPublic.load("archiveDetail", "2026");
  await result.context.window.TalentaPublic.load("home");

  assert.equal(
    result.storage.get("talenta_event_preview_token"),
    "current-token",
    "Preview Detail Arsip harus mempertahankan Event workspace sebagai preview global.",
  );
  const session = result.calls.find(
    (call) => call.path === "/public/preview/session",
  );
  const bootstrap = result.calls.find((call) =>
    call.path.endsWith("/bootstrap"),
  );
  const detail = result.calls.find((call) =>
    call.path.endsWith("/archives/2026"),
  );
  const home = result.calls.find((call) => call.path.endsWith("/home"));
  assert.equal(session.options.previewToken, "current-token");
  assert.equal(bootstrap.options.previewToken, "current-token");
  assert.equal(detail.options.previewToken, "archive-token");
  assert.equal(home.options.previewToken, "current-token");
  assert.equal(
    result.context.window.TalentaPublic.mediaUrl(
      "/api/v1/public/media/11111111-1111-4111-8111-111111111111",
      "archiveDetail",
    ),
    "http://127.0.0.1:4173/api/v1/public/media/11111111-1111-4111-8111-111111111111?preview_token=archive-token",
    "Media internal Detail Arsip harus membawa token Event Arsip.",
  );
  assert.equal(
    result.context.window.TalentaPublic.mediaUrl(
      "https://cdn.example.test/winner.webp",
      "archiveDetail",
    ),
    "https://cdn.example.test/winner.webp",
    "Token preview tidak boleh bocor ke URL eksternal.",
  );

  const navigated = await runPublicApi("", [...result.storage]);
  await navigated.context.window.TalentaPublic.load("home");
  const navigatedHome = navigated.calls.find((call) =>
    call.path.endsWith("/home"),
  );
  assert.equal(
    navigatedHome.options.previewToken,
    "current-token",
    "Navigasi dari Detail Arsip harus tetap memakai workspace Event saat ini.",
  );
}

{
  const result = await runPublicApi("#preview=event-token");
  assert.equal(
    result.storage.get("talenta_event_preview_token"),
    "event-token",
    "Preview Event umum harus tetap bertahan selama navigasi.",
  );
  assert.ok(
    result.calls.some((call) => call.path === "/public/preview/session"),
    "Preview Event umum harus tetap membuat sesi preview.",
  );
  assert.equal(
    result.context.window.TalentaPublic.mediaUrl(
      "/api/v1/public/media/11111111-1111-4111-8111-111111111111",
    ),
    "http://127.0.0.1:4173/api/v1/public/media/11111111-1111-4111-8111-111111111111?preview_token=event-token",
    "Media workspace Event harus membawa token tanpa bergantung pada cookie lintas origin.",
  );
  assert.equal(
    result.context.window.TalentaPublic.mediaUrl(
      "/api/v1/public/media/11111111-1111-4111-8111-111111111111",
      "archiveDetail",
    ),
    "http://127.0.0.1:4173/api/v1/public/media/11111111-1111-4111-8111-111111111111",
    "Preview Event biasa tidak boleh menempelkan token workspace ke media Arsip.",
  );
}

console.log(
  "PASS: token preview Detail Arsip hanya berlaku pada endpoint Detail Arsip.",
);
