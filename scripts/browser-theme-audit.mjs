import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const origin = process.env.TALENTA_TEST_ORIGIN || "http://127.0.0.1:4173";
const edgePath =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const debugPort = 9337;
const profilePath = await mkdtemp(join(tmpdir(), "talenta-theme-audit-"));
const testTheme = { primaryColor: "#3a8f1f", accentColor: "#ffffff" };
const expectedNavy = "#1a400e";

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
  }

  async connect() {
    await new Promise((resolveConnection, reject) => {
      this.socket.addEventListener("open", resolveConnection, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolveRequest, rejectRequest } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) rejectRequest(new Error(message.error.message));
      else resolveRequest(message.result);
    });
  }

  send(method, params = {}) {
    const id = ++this.sequence;
    return new Promise((resolveRequest, rejectRequest) => {
      this.pending.set(id, { resolveRequest, rejectRequest });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function waitForEndpoint(url, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // Edge masih memulai proses.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  throw new Error(`Endpoint browser tidak siap: ${url}`);
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.text || "Evaluasi browser gagal");
  return result.result.value;
}

async function navigate(client, url, selector) {
  await client.send("Page.navigate", { url });
  await evaluate(
    client,
    `(async () => {
      const started = Date.now();
      while (Date.now() - started < 10000) {
        if (document.readyState === "complete" && document.querySelector(${JSON.stringify(selector)}))
          return true;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error("Selector tidak siap: ${selector}");
    })()`,
  );
}

async function setViewport(client, width, height = 1100) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
}

async function readEditorCanvas(client) {
  return evaluate(
    client,
    `(() => {
      const main = document.querySelector(".admin-main");
      const layout = document.querySelector(".page-editor-layout");
      const content = document.querySelector(".page-editor-content");
      const card = content?.querySelector(".admin-card");
      const rect = element => {
        const value = element.getBoundingClientRect();
        return {
          left: Math.round(value.left * 100) / 100,
          right: Math.round(value.right * 100) / 100,
          width: Math.round(value.width * 100) / 100
        };
      };
      return {
        viewport: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        main: rect(main),
        layout: rect(layout),
        content: rect(content),
        card: rect(card)
      };
    })()`,
  );
}

function compareEditorCanvas(reference, actual, label, viewport) {
  assert.equal(
    actual.scrollWidth,
    actual.viewport,
    `${label} ${viewport}px: editor memiliki overflow horizontal`,
  );
  for (const key of ["layout", "content", "card"]) {
    for (const property of ["left", "right", "width"]) {
      assert(
        Math.abs(actual[key][property] - reference[key][property]) <= 1,
        `${label} ${viewport}px: ${key}.${property} tidak sama dengan Pemenang (${actual[key][property]} vs ${reference[key][property]})`,
      );
    }
  }
}

async function readTokens(client, selector) {
  return evaluate(
    client,
    `(() => {
      const style = getComputedStyle(document.querySelector(${JSON.stringify(selector)}));
      return {
        primary: style.getPropertyValue("--c-primary").trim(),
        accent: style.getPropertyValue("--c-accent").trim(),
        navy: style.getPropertyValue("--c-navy").trim(),
        rank: style.getPropertyValue("--c-rank").trim(),
        previewPrimary: style.getPropertyValue("--preview-primary").trim(),
        previewAccent: style.getPropertyValue("--preview-accent").trim()
      };
    })()`,
  );
}

async function readDownloadSection(client, rootSelector) {
  return evaluate(
    client,
    `(() => {
      const root = document.querySelector(${JSON.stringify(rootSelector)});
      const definitions = {
        root: ":scope",
        container: ".container",
        header: ".section__header",
        eyebrow: ".t-eyebrow",
        title: ".t-h1",
        description: ".section__header > p:not(.t-eyebrow)",
        tabs: ".unduh-tabs",
        tab: ".unduh-tab",
        activeTab: ".unduh-tab--active",
        panel: ".unduh-tab-panel--active",
        list: ".doc-list",
        card: ".doc-card",
        icon: ".doc-card__icon",
        name: ".doc-card__name",
        tag: ".doc-card__tag",
        size: ".doc-card__size",
        action: ".doc-card__download .btn"
      };
      const properties = [
        "display", "flexDirection", "alignItems", "justifyContent", "gap",
        "width", "maxWidth", "paddingTop", "paddingRight", "paddingBottom",
        "paddingLeft", "marginTop", "marginRight", "marginBottom", "marginLeft",
        "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing",
        "textAlign", "textTransform", "color", "backgroundColor",
        "borderTopWidth", "borderTopColor", "borderRadius", "overflowX"
      ];
      const matrix = new DOMMatrixReadOnly(getComputedStyle(root).transform);
      const rootScale = matrix.a || 1;
      return Object.fromEntries(
        Object.entries(definitions).map(([name, selector]) => {
          const element =
            selector === ":scope" ? root : root.querySelector(selector);
          if (!element) return [name, null];
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return [name, {
            text: element.textContent.trim().replace(/\\s+/g, " "),
            rect: {
              width: Math.round((rect.width / rootScale) * 100) / 100,
              height: Math.round((rect.height / rootScale) * 100) / 100
            },
            style: Object.fromEntries(
              properties.map(property => [property, style[property]])
            )
          }];
        })
      );
    })()`,
  );
}

function compareDownloadSection(template, preview, mode) {
  for (const key of Object.keys(template)) {
    const geometryTolerance = key === "root" ? 4 : 1;
    assert.ok(preview[key], `${mode}: elemen preview ${key} tidak ditemukan`);
    assert.equal(
      preview[key].text,
      template[key].text,
      `${mode}: teks ${key} berbeda`,
    );
    if (key !== "root")
      assert.deepEqual(
        preview[key].style,
        template[key].style,
        `${mode}: style ${key} berbeda`,
      );
    assert(
      Math.abs(preview[key].rect.width - template[key].rect.width) <=
        geometryTolerance,
      `${mode}: lebar ${key} berbeda`,
    );
    assert(
      Math.abs(preview[key].rect.height - template[key].rect.height) <=
        geometryTolerance,
      `${mode}: tinggi ${key} berbeda (${template[key].rect.height} vs ${preview[key].rect.height})`,
    );
  }
}

async function readWinnerSection(client, rootSelector) {
  return evaluate(
    client,
    `(() => {
      const root = document.querySelector(${JSON.stringify(rootSelector)});
      const definitions = {
        root: ":scope",
        container: ".container",
        header: ".section__header",
        eyebrow: ".t-eyebrow",
        title: ".t-h1",
        description: ".section__header > p:not(.t-eyebrow)",
        sk: ".sk-banner",
        skLeft: ".sk-banner__left",
        skIcon: ".sk-banner__icon",
        skTitle: ".sk-banner__content h3",
        skDescription: ".sk-banner__content p",
        skAction: ".sk-banner .btn",
        section: ".winner-section",
        group: ".winner-group",
        groupTitle: ".winner-group__title",
        badge: ".winner-group__title .badge--gold",
        grid: ".champion-grid",
        card: ".champion-card",
        photo: ".champion-card__photo",
        rank: ".champion-card__rank",
        name: ".champion-card__name",
        school: ".champion-card__school",
        meta: ".champion-card__meta",
        archives: ".archive-winners",
        archiveTitle: ".archive-winners__title",
        archiveGrid: ".archive-winners .grid--3",
        archiveCard: ".archive-winners .lomba-card",
        archiveThumb: ".archive-winners .lomba-card__thumb",
        archiveBody: ".archive-winners .lomba-card__body",
        archiveName: ".archive-winners .lomba-card__title",
        archiveDescription: ".archive-winners .lomba-card__desc",
        archiveAction: ".archive-winners .lomba-card__action"
      };
      const properties = [
        "display", "gridTemplateColumns", "flexDirection", "flexWrap",
        "alignItems", "justifyContent", "gap", "width", "maxWidth",
        "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
        "marginTop", "marginRight", "marginBottom", "marginLeft",
        "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing",
        "textAlign", "textTransform", "color", "backgroundColor",
        "backgroundImage", "borderTopWidth", "borderTopColor", "borderRadius",
        "overflow"
      ];
      const matrix = new DOMMatrixReadOnly(getComputedStyle(root).transform);
      const rootScale = matrix.a || 1;
      return Object.fromEntries(
        Object.entries(definitions).map(([name, selector]) => {
          const element =
            selector === ":scope" ? root : root.querySelector(selector);
          if (!element) return [name, null];
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return [name, {
            text: element.textContent.trim().replace(/\\s+/g, " "),
            rect: {
              width: Math.round((rect.width / rootScale) * 100) / 100,
              height: Math.round((rect.height / rootScale) * 100) / 100
            },
            style: Object.fromEntries(
              properties.map(property => [property, style[property]])
            )
          }];
        })
      );
    })()`,
  );
}

function compareWinnerSection(template, preview, mode) {
  for (const key of Object.keys(template)) {
    assert.ok(preview[key], `${mode}: elemen Pemenang ${key} tidak ditemukan`);
    assert.equal(
      preview[key].text,
      template[key].text,
      `${mode}: teks Pemenang ${key} berbeda`,
    );
    if (key !== "root")
      assert.deepEqual(
        preview[key].style,
        template[key].style,
        `${mode}: style Pemenang ${key} berbeda`,
      );
    assert(
      Math.abs(preview[key].rect.width - template[key].rect.width) <= 1,
      `${mode}: lebar Pemenang ${key} berbeda`,
    );
    assert(
      Math.abs(preview[key].rect.height - template[key].rect.height) <= 1,
      `${mode}: tinggi Pemenang ${key} berbeda (${template[key].rect.height} vs ${preview[key].rect.height})`,
    );
  }
}

async function readArchiveSurface(client, rootSelector, detail = false) {
  return evaluate(
    client,
    `(() => {
      const root = document.querySelector(${JSON.stringify(rootSelector)});
      const definitions = ${
        detail
          ? `{
        root: ":scope",
        banner: ".lomba-banner",
        bannerContent: ".lomba-banner__content",
        bannerTitle: ".lomba-banner__title",
        bannerDescription: ".lomba-banner__desc",
        breadcrumb: ".archive-detail-breadcrumb",
        breadcrumbContainer: ".archive-detail-breadcrumb .container",
        winnersSection: "#pemenang",
        winnersContainer: "#pemenang > .container",
        winnersHeader: "#pemenang .section__header",
        winnersEyebrow: "#pemenang .t-eyebrow",
        winnersTitle: "#pemenang .t-h2",
        sk: "#pemenang .sk-banner",
        skIcon: "#pemenang .sk-banner__icon",
        skTitle: "#pemenang .sk-banner__content h3",
        skDescription: "#pemenang .sk-banner__content p",
        skAction: "#pemenang .sk-banner .btn",
        group: "#pemenang .winner-group",
        groupTitle: "#pemenang .winner-group__title",
        badge: "#pemenang .badge--gold",
        championGrid: "#pemenang .champion-grid",
        championCard: "#pemenang .champion-card",
        photo: "#pemenang .champion-card__photo",
        rank: "#pemenang .champion-card__rank",
        name: "#pemenang .champion-card__name",
        school: "#pemenang .champion-card__school",
        meta: "#pemenang .champion-card__meta",
        documentsSection: "#dokumen-terkait",
        documentsContainer: "#dokumen-terkait > .container",
        documentsHeader: "#dokumen-terkait .section__header",
        documentsTitle: "#dokumen-terkait .t-h2",
        documentList: "#dokumen-terkait .doc-list",
        documentCard: "#dokumen-terkait .doc-card",
        documentIcon: "#dokumen-terkait .doc-card__icon",
        documentName: "#dokumen-terkait .doc-card__name",
        documentTag: "#dokumen-terkait .doc-card__tag",
        documentSize: "#dokumen-terkait .doc-card__size",
        documentAction: "#dokumen-terkait .doc-card__download .btn"
      }`
          : `{
        root: ":scope",
        container: ".container",
        header: ".section__header",
        eyebrow: ".t-eyebrow",
        title: ".t-h1",
        description: ".section__header > p:not(.t-eyebrow)",
        grid: ".grid--3",
        card: ".lomba-card",
        thumb: ".lomba-card__thumb",
        mascot: ".archive-card__uploaded-icon",
        body: ".lomba-card__body",
        cardTitle: ".lomba-card__title",
        cardDescription: ".lomba-card__desc",
        action: ".lomba-card__action"
      }`
      };
      const properties = [
        "display", "gridTemplateColumns", "flexDirection", "flexWrap",
        "alignItems", "justifyContent", "gap", "width", "height", "maxWidth",
        "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
        "marginTop", "marginRight", "marginBottom", "marginLeft",
        "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing",
        "textAlign", "textTransform", "color", "backgroundColor",
        "backgroundImage", "borderTopWidth", "borderTopColor", "borderRadius",
        "overflow"
      ];
      const matrix = new DOMMatrixReadOnly(getComputedStyle(root).transform);
      const rootScale = matrix.a || 1;
      return Object.fromEntries(
        Object.entries(definitions).map(([name, selector]) => {
          const element =
            selector === ":scope" ? root : root.querySelector(selector);
          if (!element) return [name, null];
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return [name, {
            text: element.textContent.trim().replace(/\\s+/g, " "),
            rect: {
              width: Math.round((rect.width / rootScale) * 100) / 100,
              height: Math.round((rect.height / rootScale) * 100) / 100
            },
            style: Object.fromEntries(
              properties.map(property => [property, style[property]])
            )
          }];
        })
      );
    })()`,
  );
}

function compareArchiveSurface(template, preview, mode, label) {
  for (const key of Object.keys(template)) {
    const geometryTolerance = key === "root" ? 4 : 1;
    assert.ok(preview[key], `${mode}: elemen ${label} ${key} tidak ditemukan`);
    assert.equal(
      preview[key].text,
      template[key].text,
      `${mode}: teks ${label} ${key} berbeda`,
    );
    if (key !== "root")
      assert.deepEqual(
        preview[key].style,
        template[key].style,
        `${mode}: style ${label} ${key} berbeda`,
      );
    assert(
      Math.abs(preview[key].rect.width - template[key].rect.width) <=
        geometryTolerance,
      `${mode}: lebar ${label} ${key} berbeda (${template[key].rect.width} vs ${preview[key].rect.width})`,
    );
    assert(
      Math.abs(preview[key].rect.height - template[key].rect.height) <=
        geometryTolerance,
      `${mode}: tinggi ${label} ${key} berbeda (${template[key].rect.height} vs ${preview[key].rect.height})`,
    );
  }
}

async function readFaqSurface(client, rootSelector) {
  return evaluate(
    client,
    `(() => {
      const root = document.querySelector(${JSON.stringify(rootSelector)});
      const definitions = {
        root: ":scope",
        section: ".section",
        container: ".container",
        header: ".section__header",
        eyebrow: ".t-eyebrow",
        title: ".t-h1",
        description: ".section__header > p:not(.t-eyebrow)",
        category: ".faq-category",
        categoryTitle: ".faq-category__title",
        accordion: ".accordion",
        item: ".accordion__item",
        trigger: ".accordion__trigger",
        chevron: ".accordion__chevron",
        content: ".accordion__content",
        body: ".accordion__body"
      };
      const properties = [
        "display", "flexDirection", "alignItems", "justifyContent", "gap",
        "width", "height", "maxWidth", "maxHeight",
        "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
        "marginTop", "marginRight", "marginBottom", "marginLeft",
        "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing",
        "textAlign", "color", "backgroundColor", "borderTopWidth",
        "borderTopColor", "borderBottomWidth", "borderBottomColor",
        "borderRadius", "overflow", "cursor"
      ];
      const matrix = new DOMMatrixReadOnly(getComputedStyle(root).transform);
      const rootScale = matrix.a || 1;
      return Object.fromEntries(
        Object.entries(definitions).map(([name, selector]) => {
          const element =
            selector === ":scope" ? root : root.querySelector(selector);
          if (!element) return [name, null];
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return [name, {
            text: element.textContent.trim().replace(/\\s+/g, " "),
            rect: {
              width: Math.round((rect.width / rootScale) * 100) / 100,
              height: Math.round((rect.height / rootScale) * 100) / 100
            },
            style: Object.fromEntries(
              properties.map(property => [property, style[property]])
            )
          }];
        })
      );
    })()`,
  );
}

function compareFaqSurface(template, preview, mode) {
  for (const key of Object.keys(template)) {
    const geometryTolerance = key === "root" ? 4 : 1;
    assert.ok(preview[key], `${mode}: elemen FAQ ${key} tidak ditemukan`);
    assert.equal(
      preview[key].text,
      template[key].text,
      `${mode}: teks FAQ ${key} berbeda`,
    );
    if (key !== "root")
      assert.deepEqual(
        preview[key].style,
        template[key].style,
        `${mode}: style FAQ ${key} berbeda`,
      );
    assert(
      Math.abs(preview[key].rect.width - template[key].rect.width) <=
        geometryTolerance,
      `${mode}: lebar FAQ ${key} berbeda (${template[key].rect.width} vs ${preview[key].rect.width})`,
    );
    assert(
      Math.abs(preview[key].rect.height - template[key].rect.height) <=
        geometryTolerance,
      `${mode}: tinggi FAQ ${key} berbeda (${template[key].rect.height} vs ${preview[key].rect.height})`,
    );
  }
}

const edge = spawn(
  edgePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profilePath}`,
    `${origin}/apps/public-site/`,
  ],
  { stdio: "ignore", windowsHide: true },
);

try {
  const browserTargets = await waitForEndpoint(
    `http://127.0.0.1:${debugPort}/json/list`,
  );
  const pageTarget = browserTargets.find((target) => target.type === "page");
  assert(pageTarget, "Target halaman Edge tidak ditemukan");
  const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");

  await navigate(client, `${origin}/apps/public-site/`, "html");
  await evaluate(
    client,
    `localStorage.setItem("talenta_event_settings_v1", ${JSON.stringify(
      JSON.stringify({ version: 3, theme: testTheme }),
    )})`,
  );

  const auditTargets = [
    ["Public Site Beranda", "/apps/public-site/", "html", false],
    ["Public Site Unduh", "/apps/public-site/unduh/", "html", false],
    ["Public Site Pemenang", "/apps/public-site/pemenang/", "html", false],
    ["Public Site Arsip", "/apps/public-site/arsip/", "html", false],
    [
      "Public Site Detail Arsip",
      "/apps/public-site/arsip/detail/?event=osn-2025",
      "html",
      false,
    ],
    ["Public Site FAQ", "/apps/public-site/faq/", "html", false],
    [
      "Preview Beranda",
      "/apps/admin/editors/beranda/?embedded=1",
      "#homePreview",
      true,
    ],
    [
      "Preview Unduh",
      "/apps/admin/editors/unduh/?embedded=1",
      "#downloadPreview",
      true,
    ],
    [
      "Preview Pemenang",
      "/apps/admin/editors/pemenang/?embedded=1",
      "#wmPreview",
      true,
    ],
    [
      "Preview Arsip",
      "/apps/admin/editors/arsip/?embedded=1",
      "#archivePreview",
      true,
    ],
    [
      "Preview Detail Arsip",
      "/apps/admin/editors/arsip/detail/?id=osn-2025&embedded=1",
      "#archiveDetailPreview",
      true,
    ],
    ["Preview FAQ", "/apps/admin/editors/faq/?embedded=1", "#faqPreview", true],
  ];

  for (const [label, path, selector, preview] of auditTargets) {
    await navigate(client, `${origin}${path}`, selector);
    const tokens = await readTokens(client, selector);
    assert.equal(tokens.primary, testTheme.primaryColor, `${label}: primary`);
    assert.equal(tokens.accent, testTheme.accentColor, `${label}: accent`);
    assert.equal(tokens.navy, expectedNavy, `${label}: navy turunan`);
    assert.equal(
      tokens.rank,
      testTheme.primaryColor,
      `${label}: warna peringkat`,
    );
    if (preview) {
      assert.equal(
        tokens.previewPrimary,
        testTheme.primaryColor,
        `${label}: preview primary`,
      );
      assert.equal(
        tokens.previewAccent,
        testTheme.accentColor,
        `${label}: preview accent`,
      );
    }
  }

  for (const viewport of [1600, 768, 390]) {
    await setViewport(client, viewport, 1200);
    await navigate(
      client,
      `${origin}/apps/admin/editors/pemenang/?embedded=1`,
      ".page-editor-content .admin-card",
    );
    const editorCanvasReference = await readEditorCanvas(client);
    for (const [label, path] of [
      ["Arsip", "/apps/admin/editors/arsip/?embedded=1"],
      [
        "Detail Arsip",
        "/apps/admin/editors/arsip/detail/?id=osn-2025&embedded=1",
      ],
      ["FAQ", "/apps/admin/editors/faq/?embedded=1"],
    ]) {
      await navigate(
        client,
        `${origin}${path}`,
        ".page-editor-content .admin-card",
      );
      const editorCanvas = await readEditorCanvas(client);
      compareEditorCanvas(editorCanvasReference, editorCanvas, label, viewport);
    }
  }

  for (const viewport of [1600, 768, 390]) {
    await setViewport(client, viewport, 1400);
    await navigate(
      client,
      `${origin}/apps/admin/?page=settings`,
      "#event-settings .admin-card",
    );
    const settingsCanvas = await evaluate(
      client,
      `(() => {
        const main = document.querySelector(".admin-main");
        const layout = document.querySelector("#event-settings");
        const content = layout.querySelector(".page-editor-content");
        const card = content.querySelector(".admin-card");
        const rect = element => element.getBoundingClientRect();
        const mainRect = rect(main);
        const layoutRect = rect(layout);
        const contentRect = rect(content);
        const cardRect = rect(card);
        return {
          viewport: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          mainWidth: mainRect.width,
          layoutWidth: layoutRect.width,
          leftGap: layoutRect.left - mainRect.left,
          rightGap: mainRect.right - layoutRect.right,
          contentWidth: contentRect.width,
          cardWidth: cardRect.width,
          cardLeftGap: cardRect.left - contentRect.left,
          cardRightGap: contentRect.right - cardRect.right
        };
      })()`,
    );
    assert.equal(
      settingsCanvas.scrollWidth,
      settingsCanvas.viewport,
      `Pengaturan Global ${viewport}px: overflow horizontal`,
    );
    assert(
      Math.abs(
        settingsCanvas.layoutWidth - Math.min(1280, settingsCanvas.mainWidth),
      ) <= 1,
      `Pengaturan Global ${viewport}px: lebar kanvas tidak mengikuti Kelola Halaman (${JSON.stringify(settingsCanvas)})`,
    );
    assert(
      Math.abs(settingsCanvas.leftGap - settingsCanvas.rightGap) <= 1,
      `Pengaturan Global ${viewport}px: kanvas tidak berada di tengah`,
    );
    assert(
      Math.abs(settingsCanvas.cardWidth - settingsCanvas.contentWidth) <= 1 &&
        Math.abs(settingsCanvas.cardLeftGap) <= 1 &&
        Math.abs(settingsCanvas.cardRightGap) <= 1,
      `Pengaturan Global ${viewport}px: card tidak memenuhi content canvas`,
    );

    for (const mode of ["desktop", "tablet", "mobile"]) {
      const settingsPreviewFit = await evaluate(
        client,
        `(async () => {
          for (const type of ["theme", "nav", "footer"]) {
            const button = document.querySelector(
              \`[data-global-\${type}-device="${mode}"]\`,
            );
            button.click();
          }
          await new Promise(resolve => setTimeout(resolve, 320));
          await new Promise(resolve => requestAnimationFrame(resolve));
          const expectedWidth = {
            desktop: 1425,
            tablet: 753,
            mobile: 375
          }["${mode}"];
          return [
            ["Tema", "globalThemePreviewFrame", "themePreview"],
            ["Navigasi", "globalNavPreviewFrame", "globalNavPreview"],
            ["Footer", "globalFooterPreviewFrame", "globalFooterPreview"]
          ].map(([label, frameId, rootId]) => {
            const frame = document.getElementById(frameId);
            const root = document.getElementById(rootId);
            const frameStyle = getComputedStyle(frame);
            const matrix = new DOMMatrixReadOnly(getComputedStyle(root).transform);
            const frameRect = frame.getBoundingClientRect();
            const rootRect = root.getBoundingClientRect();
            const horizontalPadding =
              parseFloat(frameStyle.paddingLeft) +
              parseFloat(frameStyle.paddingRight);
            const verticalPadding =
              parseFloat(frameStyle.paddingTop) +
              parseFloat(frameStyle.paddingBottom);
            return {
              label,
              mode: frame.dataset.previewMode,
              expectedWidth,
              designWidth: root.offsetWidth,
              overflowX: frameStyle.overflowX,
              scale: matrix.a || 1,
              availableWidth: frame.clientWidth - horizontalPadding,
              visibleWidth: rootRect.width,
              fittedHeight: frame.clientHeight - verticalPadding,
              expectedHeight: root.offsetHeight * (matrix.a || 1),
              clippedRight:
                rootRect.right >
                frameRect.right - parseFloat(frameStyle.paddingRight) + 1
            };
          });
        })()`,
      );
      for (const preview of settingsPreviewFit) {
        assert.equal(
          preview.mode,
          mode,
          `${preview.label} ${viewport}px: mode preview`,
        );
        assert.equal(
          preview.designWidth,
          preview.expectedWidth,
          `${preview.label} ${viewport}px ${mode}: lebar desain`,
        );
        assert.equal(
          preview.overflowX,
          "hidden",
          `${preview.label} ${viewport}px ${mode}: scrollbar horizontal`,
        );
        assert(
          preview.scale > 0 && preview.scale <= 1,
          `${preview.label} ${viewport}px ${mode}: skala tidak valid`,
        );
        assert(
          preview.visibleWidth <= preview.availableWidth + 1 &&
            !preview.clippedRight,
          `${preview.label} ${viewport}px ${mode}: preview terpotong (${JSON.stringify(preview)})`,
        );
        assert(
          Math.abs(preview.fittedHeight - preview.expectedHeight) <= 1,
          `${preview.label} ${viewport}px ${mode}: tinggi frame tidak mengikuti scale (${JSON.stringify(preview)})`,
        );
      }
      if (mode === "desktop") {
        const centeredHighlight = await evaluate(
          client,
          `(() => {
            const root = document.querySelector("#themePreview");
            const group = root.querySelector(".home-winner-group");
            const grid = group.querySelector(".champion-grid");
            const matrix = new DOMMatrixReadOnly(getComputedStyle(root).transform);
            const scale = matrix.a || 1;
            const groupRect = group.getBoundingClientRect();
            const gridRect = grid.getBoundingClientRect();
            return {
              gridWidth: gridRect.width / scale,
              leftGap: (gridRect.left - groupRect.left) / scale,
              rightGap: (groupRect.right - gridRect.right) / scale
            };
          })()`,
        );
        assert(
          centeredHighlight.gridWidth <= 721,
          `Highlight desktop ${viewport}px: grup card melebihi batas Template`,
        );
        assert(
          Math.abs(centeredHighlight.leftGap - centeredHighlight.rightGap) <= 1,
          `Highlight desktop ${viewport}px: card tidak berada di tengah (${JSON.stringify(centeredHighlight)})`,
        );
      }
    }
  }

  await navigate(
    client,
    `${origin}/apps/public-site/arsip/`,
    "#archivePublicRoot",
  );
  await evaluate(
    client,
    `(() => {
      const state = getArchiveAdminState();
      const competition = state.competitions["osn-2025"];
      competition.iconMode = "upload";
      competition.uploadedIcon =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='44' fill='%23fff'/%3E%3Cpath d='M30 62 50 22l20 40-20 18Z' fill='%231a400e'/%3E%3C/svg%3E";
      competition.iconAlt = "Maskot audit OSN 2025";
      saveArchiveAdminState(state);
    })()`,
  );

  for (const [mode, width] of [
    ["desktop", 1440],
    ["tablet", 768],
    ["mobile", 390],
  ]) {
    await setViewport(client, width);
    await navigate(
      client,
      `${origin}/apps/public-site/unduh/`,
      "#unduh .doc-card",
    );
    const templateDownload = await readDownloadSection(client, "#unduh");

    await setViewport(client, 1600, 1200);
    await navigate(
      client,
      `${origin}/apps/admin/editors/unduh/?embedded=1`,
      "#downloadPreview .doc-card",
    );
    await evaluate(
      client,
      `(async () => {
        const frame = document.querySelector("#downloadPreviewFrame");
        frame.className = "download-preview-frame download-preview-frame--${mode}";
        frame.dataset.previewMode = "${mode}";
        await document.fonts.ready;
        fitDownloadPreview();
        await new Promise(resolve => requestAnimationFrame(resolve));
        fitDownloadPreview();
        await new Promise(resolve => requestAnimationFrame(resolve));
        fitDownloadPreview();
        await new Promise(resolve => requestAnimationFrame(resolve));
      })()`,
    );
    const frameFit = await evaluate(
      client,
      `(() => {
        const frame = document.querySelector("#downloadPreviewFrame");
        const root = document.querySelector("#downloadPreview");
        const frameStyle = getComputedStyle(frame);
        const matrix = new DOMMatrixReadOnly(getComputedStyle(root).transform);
        const verticalPadding =
          parseFloat(frameStyle.paddingTop) + parseFloat(frameStyle.paddingBottom);
        return {
          overflowX: frameStyle.overflowX,
          scale: matrix.a || 1,
          fittedHeight: frame.clientHeight - verticalPadding,
          expectedHeight: root.offsetHeight * (matrix.a || 1)
        };
      })()`,
    );
    assert.equal(frameFit.overflowX, "hidden", `${mode}: preview Unduh scroll`);
    assert(
      frameFit.scale > 0 && frameFit.scale <= 1,
      `${mode}: skala preview Unduh tidak valid`,
    );
    assert(
      Math.abs(frameFit.fittedHeight - frameFit.expectedHeight) <= 1,
      `${mode}: tinggi preview Unduh tidak mengikuti skala (${JSON.stringify(frameFit)})`,
    );
    const previewDownload = await readDownloadSection(
      client,
      "#downloadPreview",
    );
    compareDownloadSection(templateDownload, previewDownload, mode);
  }

  for (const [mode, width] of [
    ["desktop", 1440],
    ["tablet", 768],
    ["mobile", 390],
  ]) {
    await setViewport(client, width);
    await navigate(
      client,
      `${origin}/apps/public-site/pemenang/`,
      "#pemenang .champion-card",
    );
    const templateWinner = await readWinnerSection(client, "#pemenang");

    await setViewport(client, 1600, 1200);
    await navigate(
      client,
      `${origin}/apps/admin/editors/pemenang/?embedded=1`,
      "#wmPreview .champion-card",
    );
    const winnerArchiveControl = await evaluate(
      client,
      `(() => {
        const input = document.querySelector("#wmArchiveLimit");
        input.value = "99";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        const mascot = document.querySelector(
          ".wm-archive-source__uploaded-icon",
        );
        const mascotRect = mascot?.getBoundingClientRect();
        return {
          max: input.max,
          value: input.value,
          note: document.querySelector(".wm-source-note")?.textContent || "",
          mascotWidth: mascotRect?.width || 0,
          mascotHeight: mascotRect?.height || 0
        };
      })()`,
    );
    assert.equal(winnerArchiveControl.max, "3");
    assert.equal(winnerArchiveControl.value, "3");
    assert.match(winnerArchiveControl.note, /3 Arsip publik/);
    assert.match(winnerArchiveControl.note, /3 memiliki pemenang aktif/);
    assert(winnerArchiveControl.mascotWidth >= 40);
    assert(winnerArchiveControl.mascotHeight >= 40);
    await evaluate(
      client,
      `(async () => {
        const frame = document.querySelector("#wmPreviewFrame");
        frame.className = "wm-preview-frame wm-preview-frame--${mode}";
        frame.dataset.previewMode = "${mode}";
        await document.fonts.ready;
        fitWinnerPreview();
        await new Promise(resolve => requestAnimationFrame(resolve));
        fitWinnerPreview();
        await new Promise(resolve => requestAnimationFrame(resolve));
      })()`,
    );
    const frameFit = await evaluate(
      client,
      `(() => {
        const frame = document.querySelector("#wmPreviewFrame");
        const root = document.querySelector("#wmPreview");
        const frameStyle = getComputedStyle(frame);
        const matrix = new DOMMatrixReadOnly(getComputedStyle(root).transform);
        const verticalPadding =
          parseFloat(frameStyle.paddingTop) + parseFloat(frameStyle.paddingBottom);
        return {
          overflowX: frameStyle.overflowX,
          scale: matrix.a || 1,
          fittedHeight: frame.clientHeight - verticalPadding,
          expectedHeight: root.offsetHeight * (matrix.a || 1)
        };
      })()`,
    );
    assert.equal(
      frameFit.overflowX,
      "hidden",
      `${mode}: preview Pemenang scroll`,
    );
    assert(
      frameFit.scale > 0 && frameFit.scale <= 1,
      `${mode}: skala preview Pemenang tidak valid`,
    );
    assert(
      Math.abs(frameFit.fittedHeight - frameFit.expectedHeight) <= 1,
      `${mode}: tinggi preview Pemenang tidak mengikuti skala (${JSON.stringify(frameFit)})`,
    );
    const previewWinner = await readWinnerSection(client, "#wmPreview");
    compareWinnerSection(templateWinner, previewWinner, mode);
  }

  for (const [mode, width] of [
    ["desktop", 1440],
    ["tablet", 768],
    ["mobile", 390],
  ]) {
    await setViewport(client, width);
    await navigate(
      client,
      `${origin}/apps/public-site/arsip/`,
      "#arsip .lomba-card",
    );
    const templateArchive = await readArchiveSurface(
      client,
      "#archivePublicRoot",
    );

    await setViewport(client, 1600, 1200);
    await navigate(
      client,
      `${origin}/apps/admin/editors/arsip/?embedded=1`,
      "#archivePreview #arsip .lomba-card",
    );
    const archiveManagerSources = await evaluate(
      client,
      `(() => {
        const items = [...document.querySelectorAll(".archive-manager-item")];
        return {
          count: items.length,
          automaticBadges: items.filter(item =>
            item.textContent.includes("Arsip otomatis")
          ).length
        };
      })()`,
    );
    assert(archiveManagerSources.count > 0);
    assert.equal(
      archiveManagerSources.automaticBadges,
      archiveManagerSources.count,
    );
    await evaluate(
      client,
      `(async () => {
        const frame = document.querySelector("#archivePreviewFrame");
        frame.className = "archive-preview-frame archive-preview-frame--${mode}";
        frame.dataset.previewMode = "${mode}";
        await document.fonts.ready;
        fitArchivePreview();
        await new Promise(resolve => requestAnimationFrame(resolve));
        fitArchivePreview();
        await new Promise(resolve => requestAnimationFrame(resolve));
      })()`,
    );
    const previewArchive = await readArchiveSurface(client, "#archivePreview");
    compareArchiveSurface(templateArchive, previewArchive, mode, "Arsip");

    await setViewport(client, width);
    await navigate(
      client,
      `${origin}/apps/public-site/arsip/detail/?event=osn-2025`,
      "#archiveDetailPublicRoot .champion-card",
    );
    const templateArchiveDetail = await readArchiveSurface(
      client,
      "#archiveDetailPublicRoot",
      true,
    );

    await setViewport(client, 1600, 1200);
    await navigate(
      client,
      `${origin}/apps/admin/editors/arsip/detail/?id=osn-2025&embedded=1`,
      "#archiveDetailPreview .champion-card",
    );
    await evaluate(
      client,
      `(async () => {
        const frame = document.querySelector("#archiveDetailPreviewFrame");
        frame.className = "archive-detail-preview-frame archive-detail-preview-frame--${mode}";
        frame.dataset.previewMode = "${mode}";
        await document.fonts.ready;
        fitArchiveDetailPreview();
        await new Promise(resolve => requestAnimationFrame(resolve));
        fitArchiveDetailPreview();
        await new Promise(resolve => requestAnimationFrame(resolve));
      })()`,
    );
    const previewArchiveDetail = await readArchiveSurface(
      client,
      "#archiveDetailPreview",
      true,
    );
    compareArchiveSurface(
      templateArchiveDetail,
      previewArchiveDetail,
      mode,
      "Detail Arsip",
    );
  }

  for (const [mode, width] of [
    ["desktop", 1440],
    ["tablet", 768],
    ["mobile", 390],
  ]) {
    await setViewport(client, width);
    await navigate(
      client,
      `${origin}/apps/public-site/faq/`,
      "#faqPublicRoot .accordion__item",
    );
    const templateFaq = await readFaqSurface(client, "#faqPublicRoot");
    const publicAccordion = await evaluate(
      client,
      `(() => {
        const trigger = document.querySelector("#faqPublicRoot .accordion__trigger");
        const content = document.querySelector("#faqPublicRoot .accordion__content");
        trigger.click();
        const opened = {
          expanded: trigger.getAttribute("aria-expanded"),
          open: trigger.closest(".accordion__item").classList.contains("accordion__item--open"),
          maxHeight: parseFloat(content.style.maxHeight)
        };
        trigger.click();
        return {
          opened,
          closedExpanded: trigger.getAttribute("aria-expanded"),
          closedHeight: content.style.maxHeight
        };
      })()`,
    );
    assert.deepEqual(
      publicAccordion,
      {
        opened: {
          expanded: "true",
          open: true,
          maxHeight: publicAccordion.opened.maxHeight,
        },
        closedExpanded: "false",
        closedHeight: "0px",
      },
      `${mode}: interaksi accordion FAQ publik tidak konsisten`,
    );
    assert(
      publicAccordion.opened.maxHeight > 0,
      `${mode}: isi accordion FAQ publik tidak terbuka`,
    );

    await setViewport(client, 1600, 1200);
    await navigate(
      client,
      `${origin}/apps/admin/editors/faq/?embedded=1`,
      "#faqPreview .accordion__item",
    );
    await evaluate(
      client,
      `(async () => {
        const frame = document.querySelector("#faqPreviewFrame");
        frame.className = "faq-preview-frame faq-preview-frame--${mode}";
        frame.dataset.previewMode = "${mode}";
        await document.fonts.ready;
        fitFaqPreview();
        await new Promise(resolve => requestAnimationFrame(resolve));
        fitFaqPreview();
        await new Promise(resolve => requestAnimationFrame(resolve));
      })()`,
    );
    const frameFit = await evaluate(
      client,
      `(() => {
        const frame = document.querySelector("#faqPreviewFrame");
        const root = document.querySelector("#faqPreview");
        const frameStyle = getComputedStyle(frame);
        const matrix = new DOMMatrixReadOnly(getComputedStyle(root).transform);
        const verticalPadding =
          parseFloat(frameStyle.paddingTop) + parseFloat(frameStyle.paddingBottom);
        return {
          overflowX: frameStyle.overflowX,
          scale: matrix.a || 1,
          fittedHeight: frame.clientHeight - verticalPadding,
          expectedHeight: root.offsetHeight * (matrix.a || 1)
        };
      })()`,
    );
    assert.equal(frameFit.overflowX, "hidden", `${mode}: preview FAQ scroll`);
    assert(
      frameFit.scale > 0 && frameFit.scale <= 1,
      `${mode}: skala preview FAQ tidak valid`,
    );
    assert(
      Math.abs(frameFit.fittedHeight - frameFit.expectedHeight) <= 1,
      `${mode}: tinggi preview FAQ tidak mengikuti skala (${JSON.stringify(frameFit)})`,
    );
    const previewFaq = await readFaqSurface(client, "#faqPreview");
    compareFaqSurface(templateFaq, previewFaq, mode);

    const previewAccordion = await evaluate(
      client,
      `(() => {
        const trigger = document.querySelector("#faqPreview .accordion__trigger");
        const content = document.querySelector("#faqPreview .accordion__content");
        trigger.click();
        return {
          expanded: trigger.getAttribute("aria-expanded"),
          open: trigger.closest(".accordion__item").classList.contains("accordion__item--open"),
          maxHeight: parseFloat(content.style.maxHeight)
        };
      })()`,
    );
    assert.equal(previewAccordion.expanded, "true");
    assert.equal(previewAccordion.open, true);
    assert(
      previewAccordion.maxHeight > 0,
      `${mode}: isi accordion preview FAQ tidak terbuka`,
    );
  }

  await evaluate(
    client,
    `localStorage.setItem("talenta_home_editor_v1", JSON.stringify({
      winnerHighlight: { active: true, background: "navy" }
    }))`,
  );
  await navigate(client, `${origin}/apps/public-site/`, ".hero");
  const homeThemeColors = await evaluate(
    client,
    `(() => {
      const style = selector => getComputedStyle(document.querySelector(selector));
      return {
        heroGradient: style(".hero").backgroundImage,
        pricingBackground: style(".pricing-section").backgroundColor,
        footerBackground: style(".footer").backgroundColor
      };
    })()`,
  );
  assert.match(homeThemeColors.heroGradient, /rgb\(26, 64, 14\)/);
  assert.match(homeThemeColors.heroGradient, /rgb\(58, 143, 31\)/);
  assert.match(homeThemeColors.heroGradient, /rgb\(93, 163, 71\)/);
  assert.equal(homeThemeColors.pricingBackground, "rgb(26, 64, 14)");
  assert.equal(homeThemeColors.footerBackground, "rgb(26, 64, 14)");

  const homeWinnerBadge = await evaluate(
    client,
    `(() => {
      const badge = document.querySelector(".section--winner-gradient .badge--gold");
      if (!badge) return null;
      const style = getComputedStyle(badge);
      return { color: style.color, background: style.backgroundColor };
    })()`,
  );
  assert.deepEqual(homeWinnerBadge, {
    color: "rgb(255, 255, 255)",
    background: "rgba(255, 255, 255, 0.15)",
  });

  const navigationCases = [
    ["/apps/public-site/", "Beranda"],
    ["/apps/public-site/unduh/", "Unduh"],
    ["/apps/public-site/pemenang/", "Pemenang"],
    ["/apps/public-site/arsip/", "Arsip"],
    ["/apps/public-site/arsip/detail/?event=osn-2025", "Arsip"],
    ["/apps/public-site/faq/", "FAQ"],
  ];
  for (const [path, label] of navigationCases) {
    await navigate(client, `${origin}${path}`, ".navbar__link");
    const activeNavigation = await evaluate(
      client,
      `(() => {
        const links = [...document.querySelectorAll('.navbar__link[aria-current="page"]')];
        return links.map(link => link.textContent.trim());
      })()`,
    );
    assert.deepEqual(activeNavigation, [label], `${path}: navigasi aktif`);
  }

  await navigate(
    client,
    `${origin}/apps/public-site/arsip/detail/?event=osn-2025`,
    ".lomba-banner",
  );
  const archiveBanner = await evaluate(
    client,
    `getComputedStyle(document.querySelector(".lomba-banner")).backgroundImage`,
  );
  assert.match(archiveBanner, /rgb\(26, 64, 14\)/);
  assert.match(archiveBanner, /rgb\(58, 143, 31\)/);

  await navigate(
    client,
    `${origin}/apps/admin/editors/pemenang/?embedded=1`,
    ".wm-winners-toolbar .badge--gold",
  );
  const adminWinnerBadge = await evaluate(
    client,
    `(() => {
      const style = getComputedStyle(
        document.querySelector(".wm-winners-toolbar .badge--gold")
      );
      return { color: style.color, background: style.backgroundColor };
    })()`,
  );
  assert.equal(adminWinnerBadge.color, "rgb(58, 143, 31)");
  assert.notEqual(adminWinnerBadge.background, "rgb(255, 255, 255)");
  assert.notEqual(adminWinnerBadge.background, "rgba(0, 0, 0, 0)");

  await navigate(
    client,
    `${origin}/apps/admin/editors/arsip/detail/?id=osn-2025&embedded=1`,
    "#archiveDetailPreview .champion-card",
  );
  const detailColors = await evaluate(
    client,
    `(() => {
      const root = document.querySelector("#archiveDetailPreview");
      const badge = root.querySelector(".winner-group__title .badge--gold");
      const icon = root.querySelector(".winner-group__title svg");
      const rank = root.querySelector(".champion-card__rank");
      return {
        badgeColor: getComputedStyle(badge).color,
        iconColor: getComputedStyle(icon).color,
        rankColor: getComputedStyle(rank).color
      };
    })()`,
  );
  assert.equal(detailColors.badgeColor, "rgb(58, 143, 31)");
  assert.equal(detailColors.iconColor, "rgb(58, 143, 31)");
  assert.equal(detailColors.rankColor, "rgb(58, 143, 31)");

  if (!process.env.TALENTA_SKIP_AUTH_DIALOGS) {
    await setViewport(client, 1440, 1000);
    await navigate(
      client,
      `${origin}/apps/admin/?page=settings`,
    "#routeResetButton",
  );
  const shellDialogAudit = await evaluate(
    client,
    `(async () => {
      const reset = document.querySelector("#routeResetButton");
      reset.focus();
      reset.click();
      await new Promise(resolve => requestAnimationFrame(resolve));
      const dialog = document.querySelector("#adminConfirmDialog");
      const cancel = dialog.querySelector("[data-dialog-cancel]");
      const confirm = dialog.querySelector("[data-dialog-confirm]");
      const result = {
        open: dialog.open,
        title: dialog.querySelector("#adminConfirmTitle").textContent,
        message: dialog.querySelector("#adminConfirmMessage").textContent,
        focusedCancel: document.activeElement === cancel,
        backdropBlur: getComputedStyle(dialog, "::backdrop").backdropFilter,
        confirmBackground: getComputedStyle(confirm).backgroundColor
      };
      cancel.click();
      await new Promise(resolve => setTimeout(resolve, 30));
      result.closed = !dialog.open;
      result.focusRestored = document.activeElement === reset;
      result.activeElement = {
        id: document.activeElement?.id || "",
        tag: document.activeElement?.tagName || ""
      };
      result.resetState = {
        connected: reset.isConnected,
        disabled: reset.disabled,
        hidden: reset.hidden
      };
      return result;
    })()`,
  );
  assert.equal(shellDialogAudit.open, true);
  assert.equal(shellDialogAudit.title, "Reset Pengaturan Global?");
  assert.match(shellDialogAudit.message, /Identitas, tema, navigasi/);
  assert.equal(shellDialogAudit.focusedCancel, true);
  assert.notEqual(shellDialogAudit.backdropBlur, "none");
  assert.equal(shellDialogAudit.confirmBackground, "rgb(180, 35, 24)");
  assert.equal(shellDialogAudit.closed, true);
  assert.equal(
    shellDialogAudit.focusRestored,
    true,
    JSON.stringify(shellDialogAudit),
  );

  await navigate(client, `${origin}/apps/admin/?page=faq`, "#adminEditorFrame");
  const embeddedDialogAudit = await evaluate(
    client,
    `(async () => {
      const frame = document.querySelector("#adminEditorFrame");
      for (let attempt = 0; attempt < 80; attempt += 1) {
        if (frame.contentDocument?.querySelector("[data-category-delete]")) break;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      const child = frame.contentDocument;
      const before = child.querySelectorAll("[data-category-id]").length;
      child.querySelector("[data-category-delete]").click();
      await new Promise(resolve => requestAnimationFrame(resolve));
      const dialog = document.querySelector("#adminConfirmDialog");
      const delegatedToShell = dialog.open;
      dialog.querySelector("[data-dialog-cancel]").click();
      await new Promise(resolve => requestAnimationFrame(resolve));
      const afterCancel = child.querySelectorAll("[data-category-id]").length;
      child.querySelector("[data-category-delete]").click();
      await new Promise(resolve => requestAnimationFrame(resolve));
      dialog.querySelector("[data-dialog-confirm]").click();
      await new Promise(resolve => requestAnimationFrame(resolve));
      const afterConfirm = child.querySelectorAll("[data-category-id]").length;
      return { before, delegatedToShell, afterCancel, afterConfirm };
    })()`,
  );
  assert.equal(embeddedDialogAudit.delegatedToShell, true);
  assert.equal(embeddedDialogAudit.afterCancel, embeddedDialogAudit.before);
  assert.equal(
    embeddedDialogAudit.afterConfirm,
    embeddedDialogAudit.before - 1,
  );

  await setViewport(client, 390, 844);
  const mobileDialogAudit = await evaluate(
    client,
    `(async () => {
      const resultPromise = adminConfirm({
        title: "Dialog mobile",
        message: "Validasi susunan tombol pada layar sempit.",
        confirmLabel: "Konfirmasi",
        variant: "danger"
      });
      await new Promise(resolve => requestAnimationFrame(resolve));
      const dialog = document.querySelector("#adminConfirmDialog");
      const actions = dialog.querySelector(".admin-confirm-dialog__actions");
      const buttons = [...actions.querySelectorAll("button")];
      const result = {
        open: dialog.open,
        direction: getComputedStyle(actions).flexDirection,
        firstWidth: buttons[0].getBoundingClientRect().width,
        secondWidth: buttons[1].getBoundingClientRect().width
      };
      dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
      result.resolved = await resultPromise;
      return result;
    })()`,
  );
  assert.equal(mobileDialogAudit.open, true);
  assert.equal(mobileDialogAudit.direction, "column-reverse");
  assert(
    Math.abs(mobileDialogAudit.firstWidth - mobileDialogAudit.secondWidth) <= 1,
  );
    assert.equal(mobileDialogAudit.resolved, false);
  }

  client.close();
  console.log(
    `PASS: ${auditTargets.length} target browser memakai tema global yang sama; batas editor dan seluruh preview konsisten${process.env.TALENTA_SKIP_AUTH_DIALOGS ? "; dialog auth diuji terpisah" : "; dialog shell, iframe, dan mobile lulus"}.`,
  );
} finally {
  edge.kill();
  const resolvedProfile = resolve(profilePath);
  assert(
    resolvedProfile.startsWith(resolve(tmpdir())) &&
      basename(resolvedProfile).startsWith("talenta-theme-audit-"),
    "Target pembersihan profil browser tidak aman",
  );
  await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  await rm(resolvedProfile, {
    recursive: true,
    force: true,
    maxRetries: 6,
    retryDelay: 250,
  });
}
