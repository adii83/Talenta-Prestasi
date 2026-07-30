import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const origin = "http://127.0.0.1:4173";
const edgePath =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const debugPort = 9338;
const profilePath = await mkdtemp(join(tmpdir(), "talenta-hero-parity-"));

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

async function setViewport(client, width, height = 1100) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
}

async function navigate(client, url, selector) {
  await client.send("Page.navigate", { url });
  await evaluate(
    client,
    `(async () => {
      const started = Date.now();
      while (Date.now() - started < 10000) {
        if (document.readyState === "complete" && document.querySelector(${JSON.stringify(selector)})) {
          await document.fonts.ready;
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error("Selector tidak siap: ${selector}");
    })()`,
  );
}

async function readHero(client, rootSelector) {
  return evaluate(
    client,
    `(() => {
      const root = document.querySelector(${JSON.stringify(rootSelector)});
      const definitions = {
        root: ":scope",
        layout: ".hero__layout",
        inner: ".hero__inner",
        eyebrow: ".t-eyebrow",
        title: ".t-h1",
        subtitle: ".hero__subtitle",
        badges: ".hero__badges",
        badge: ".hero__badge",
        buttons: ".hero__buttons",
        primaryButton: ".hero__buttons .btn--white",
        outlineButton: ".hero__buttons .btn--outline",
        desktopImage: ".hero__image--desktop",
        mobileImage: ".hero__image--mobile",
        image: ".hero__image img"
      };
      const properties = [
        "display", "flexDirection", "alignItems", "justifyContent", "gap",
        "width", "maxWidth", "paddingTop", "paddingRight", "paddingBottom",
        "paddingLeft", "marginTop", "marginRight", "marginBottom", "marginLeft",
        "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing",
        "textAlign", "textTransform", "color", "backgroundColor",
        "backgroundImage", "borderTopWidth", "borderTopColor", "borderRadius",
        "backdropFilter", "overflow"
      ];
      const matrix = new DOMMatrixReadOnly(getComputedStyle(root).transform);
      const rootScale = matrix.a || 1;
      return Object.fromEntries(
        Object.entries(definitions).map(([name, selector]) => {
          const element = selector === ":scope" ? root : root.querySelector(selector);
          if (!element) return [name, null];
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return [name, {
            tag: element.tagName,
            className: element.className,
            text: element.textContent.trim().replace(/\\s+/g, " "),
            rect: {
              width: Math.round((rect.width / rootScale) * 100) / 100,
              height: Math.round((rect.height / rootScale) * 100) / 100
            },
            style: Object.fromEntries(properties.map(property => [property, style[property]]))
          }];
        })
      );
    })()`,
  );
}

async function readWinner(client, rootSelector) {
  return evaluate(
    client,
    `(() => {
      const root = document.querySelector(${JSON.stringify(rootSelector)});
      const definitions = {
        root: ":scope",
        container: ".container",
        header: ".section__header",
        eyebrow: ".t-eyebrow",
        title: ".t-h2",
        description: ".section__header > p:not(.t-eyebrow)",
        group: ".home-winner-group",
        groupTitle: ".winner-group__title",
        badge: ".winner-group__title .badge--gold",
        grid: ".champion-grid",
        card: ".champion-card",
        photo: ".champion-card__photo",
        rank: ".champion-card__rank",
        name: ".champion-card__name",
        school: ".champion-card__school",
        meta: ".champion-card__meta"
      };
      const properties = [
        "display", "gridTemplateColumns", "alignItems", "justifyContent", "gap",
        "width", "maxWidth", "paddingTop", "paddingRight", "paddingBottom",
        "paddingLeft", "marginTop", "marginRight", "marginBottom", "marginLeft",
        "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing",
        "textAlign", "textTransform", "color", "backgroundColor",
        "backgroundImage", "borderTopWidth", "borderTopColor", "borderRadius",
        "overflow"
      ];
      const matrix = new DOMMatrixReadOnly(getComputedStyle(root).transform);
      const rootScale = matrix.a || 1;
      return Object.fromEntries(
        Object.entries(definitions).map(([name, selector]) => {
          const element = selector === ":scope" ? root : root.querySelector(selector);
          if (!element) return [name, null];
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return [name, {
            tag: element.tagName,
            text: element.textContent.trim().replace(/\\s+/g, " "),
            rect: {
              width: Math.round((rect.width / rootScale) * 100) / 100,
              height: Math.round((rect.height / rootScale) * 100) / 100
            },
            style: Object.fromEntries(properties.map(property => [property, style[property]]))
          }];
        })
      );
    })()`,
  );
}

async function readSchedule(client, rootSelector) {
  return evaluate(
    client,
    `(() => {
      const root = document.querySelector(${JSON.stringify(rootSelector)});
      const definitions = {
        root: ":scope",
        container: ".container",
        header: ".section__header",
        eyebrow: ".t-eyebrow",
        title: ".t-h2",
        description: ".section__header > p:not(.t-eyebrow)",
        grid: ".home-grid",
        card: ".schedule-card",
        icon: ".schedule-card__icon",
        label: ".schedule-card__label",
        date: ".schedule-card__date"
      };
      const properties = [
        "display", "gridTemplateColumns", "alignItems", "justifyContent", "gap",
        "width", "maxWidth", "paddingTop", "paddingRight", "paddingBottom",
        "paddingLeft", "marginTop", "marginRight", "marginBottom", "marginLeft",
        "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing",
        "textAlign", "textTransform", "color", "backgroundColor",
        "backgroundImage", "borderTopWidth", "borderTopColor", "borderRadius",
        "overflow"
      ];
      const matrix = new DOMMatrixReadOnly(getComputedStyle(root).transform);
      const rootScale = matrix.a || 1;
      return Object.fromEntries(
        Object.entries(definitions).map(([name, selector]) => {
          const element = selector === ":scope" ? root : root.querySelector(selector);
          if (!element) return [name, null];
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return [name, {
            tag: element.tagName,
            text: element.textContent.trim().replace(/\\s+/g, " "),
            rect: {
              width: Math.round((rect.width / rootScale) * 100) / 100,
              height: Math.round((rect.height / rootScale) * 100) / 100
            },
            style: Object.fromEntries(properties.map(property => [property, style[property]]))
          }];
        })
      );
    })()`,
  );
}

async function readPricing(client, rootSelector) {
  return evaluate(
    client,
    `(() => {
      const root = document.querySelector(${JSON.stringify(rootSelector)});
      const definitions = {
        root: ":scope",
        container: ".container",
        grid: ".home-pricing-grid",
        card: ".home-pricing-card",
        eyebrow: ".home-pricing-card > .t-eyebrow",
        amount: ".pricing__amount",
        unit: ".pricing__per",
        facilities: ".home-pricing-features",
        facility: ".home-pricing-features span",
        facilityIcon: ".home-pricing-features svg"
      };
      const properties = [
        "display", "gridTemplateColumns", "alignItems", "justifyContent", "gap",
        "width", "maxWidth", "height", "paddingTop", "paddingRight",
        "paddingBottom", "paddingLeft", "marginTop", "marginRight",
        "marginBottom", "marginLeft", "fontFamily", "fontSize", "fontWeight",
        "lineHeight", "letterSpacing", "textAlign", "textTransform", "color",
        "backgroundColor", "backgroundImage", "borderTopWidth",
        "borderTopColor", "borderRadius", "overflow"
      ];
      const matrix = new DOMMatrixReadOnly(getComputedStyle(root).transform);
      const rootScale = matrix.a || 1;
      return Object.fromEntries(
        Object.entries(definitions).map(([name, selector]) => {
          const element = selector === ":scope" ? root : root.querySelector(selector);
          if (!element) return [name, null];
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return [name, {
            tag: element.tagName,
            text: element.textContent.trim().replace(/\\s+/g, " "),
            rect: {
              width: Math.round((rect.width / rootScale) * 100) / 100,
              height: Math.round((rect.height / rootScale) * 100) / 100
            },
            style: Object.fromEntries(properties.map(property => [property, style[property]]))
          }];
        })
      );
    })()`,
  );
}

async function readBenefit(client, rootSelector) {
  return evaluate(
    client,
    `(() => {
      const root = document.querySelector(${JSON.stringify(rootSelector)});
      const definitions = {
        root: ":scope",
        container: ".container",
        header: ".section__header",
        eyebrow: ".t-eyebrow",
        title: ".t-h2",
        description: ".section__header > p:not(.t-eyebrow)",
        grid: ".home-grid",
        card: ".feature-card",
        icon: ".feature-card__icon",
        cardTitle: ".feature-card__title",
        cardDescription: ".feature-card__desc"
      };
      const properties = [
        "display", "gridTemplateColumns", "alignItems", "justifyContent", "gap",
        "width", "maxWidth", "height", "paddingTop", "paddingRight",
        "paddingBottom", "paddingLeft", "marginTop", "marginRight",
        "marginBottom", "marginLeft", "fontFamily", "fontSize", "fontWeight",
        "lineHeight", "letterSpacing", "textAlign", "textTransform", "color",
        "backgroundColor", "backgroundImage", "borderTopWidth",
        "borderTopColor", "borderRadius", "overflow", "boxShadow"
      ];
      const matrix = new DOMMatrixReadOnly(getComputedStyle(root).transform);
      const rootScale = matrix.a || 1;
      return Object.fromEntries(
        Object.entries(definitions).map(([name, selector]) => {
          const element = selector === ":scope" ? root : root.querySelector(selector);
          if (!element) return [name, null];
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return [name, {
            tag: element.tagName,
            text: element.textContent.trim().replace(/\\s+/g, " "),
            rect: {
              width: Math.round((rect.width / rootScale) * 100) / 100,
              height: Math.round((rect.height / rootScale) * 100) / 100
            },
            style: Object.fromEntries(properties.map(property => [property, style[property]]))
          }];
        })
      );
    })()`,
  );
}

async function readPartners(client, rootSelector) {
  return evaluate(
    client,
    `(() => {
      const root = document.querySelector(${JSON.stringify(rootSelector)});
      const definitions = {
        root: ":scope",
        container: ".home-partners",
        header: ".section__header",
        eyebrow: ".t-eyebrow",
        title: ".t-h2",
        logos: ".partner-logos",
        logo: ".partner-logo",
        image: ".partner-logo img"
      };
      const properties = [
        "display", "flexDirection", "flexWrap", "alignItems", "justifyContent",
        "gap", "width", "maxWidth", "height", "paddingTop", "paddingRight",
        "paddingBottom", "paddingLeft", "marginTop", "marginRight",
        "marginBottom", "marginLeft", "fontFamily", "fontSize", "fontWeight",
        "lineHeight", "letterSpacing", "textAlign", "textTransform", "color",
        "backgroundColor", "backgroundImage", "borderTopWidth",
        "borderTopColor", "borderRadius", "overflow", "objectFit"
      ];
      const matrix = new DOMMatrixReadOnly(getComputedStyle(root).transform);
      const rootScale = matrix.a || 1;
      return Object.fromEntries(
        Object.entries(definitions).map(([name, selector]) => {
          const element = selector === ":scope" ? root : root.querySelector(selector);
          if (!element) return [name, null];
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return [name, {
            tag: element.tagName,
            text: element.textContent.trim().replace(/\\s+/g, " "),
            rect: {
              width: Math.round((rect.width / rootScale) * 100) / 100,
              height: Math.round((rect.height / rootScale) * 100) / 100
            },
            style: Object.fromEntries(properties.map(property => [property, style[property]]))
          }];
        })
      );
    })()`,
  );
}

function compareHero(template, preview, mode) {
  const names = Object.keys(template);
  assert.deepEqual(Object.keys(preview), names, `${mode}: struktur elemen`);
  for (const name of names) {
    assert(template[name], `${mode}: elemen Template ${name} tidak ditemukan`);
    assert(preview[name], `${mode}: elemen preview ${name} tidak ditemukan`);
    assert.equal(preview[name].tag, template[name].tag, `${mode}/${name}: tag`);
    assert.equal(
      preview[name].text,
      template[name].text,
      `${mode}/${name}: konten`,
    );
    const templateStyle = { ...template[name].style };
    const previewStyle = { ...preview[name].style };
    if (name === "root") {
      delete templateStyle.width;
      delete previewStyle.width;
    }
    if (name === "layout") {
      delete templateStyle.marginLeft;
      delete templateStyle.marginRight;
      delete previewStyle.marginLeft;
      delete previewStyle.marginRight;
    }
    assert.deepEqual(
      previewStyle,
      templateStyle,
      `${mode}/${name}: computed style`,
    );
    for (const dimension of ["width", "height"]) {
      if (name === "root" && dimension === "width") continue;
      const difference = Math.abs(
        preview[name].rect[dimension] - template[name].rect[dimension],
      );
      assert(
        difference <= 0.5,
        `${mode}/${name}: ${dimension} berbeda ${difference}px`,
      );
    }
  }
}

function compareSection(template, preview, mode, label) {
  const names = Object.keys(template);
  assert.deepEqual(Object.keys(preview), names, `${mode}: struktur ${label}`);
  for (const name of names) {
    assert(template[name], `${mode}: elemen Template ${label} ${name} hilang`);
    assert(preview[name], `${mode}: elemen preview ${label} ${name} hilang`);
    assert.equal(preview[name].tag, template[name].tag, `${mode}/${name}: tag`);
    assert.equal(
      preview[name].text,
      template[name].text,
      `${mode}/${name}: konten`,
    );
    const templateStyle = { ...template[name].style };
    const previewStyle = { ...preview[name].style };
    if (name === "root") {
      delete templateStyle.width;
      delete previewStyle.width;
      for (const property of ["backgroundColor", "color", "borderTopColor"]) {
        delete templateStyle[property];
        delete previewStyle[property];
      }
    }
    if (name === "container" || name === "grid") {
      delete templateStyle.marginLeft;
      delete templateStyle.marginRight;
      delete previewStyle.marginLeft;
      delete previewStyle.marginRight;
    }
    assert.deepEqual(
      previewStyle,
      templateStyle,
      `${mode}/${name}: computed style ${label}`,
    );
    for (const dimension of ["width", "height"]) {
      if (name === "root" && dimension === "width") continue;
      const difference = Math.abs(
        preview[name].rect[dimension] - template[name].rect[dimension],
      );
      assert(
        difference <= 0.5,
        `${mode}/${name}: ${dimension} ${label} berbeda ${difference}px`,
      );
    }
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
    `${origin}/apps/template/`,
  ],
  { stdio: "ignore", windowsHide: true },
);

try {
  const targets = await waitForEndpoint(
    `http://127.0.0.1:${debugPort}/json/list`,
  );
  const pageTarget = targets.find((target) => target.type === "page");
  assert(pageTarget, "Target halaman Edge tidak ditemukan");
  const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");

  await setViewport(client, 1440);
  await navigate(client, `${origin}/apps/template/`, "html");
  await evaluate(
    client,
    `(() => {
      localStorage.setItem("talenta_event_settings_v1", JSON.stringify({
        version: 3,
        theme: { primaryColor: "#3a8f1f", accentColor: "#dbeafe" }
      }));
      localStorage.setItem("talenta_home_editor_v1", JSON.stringify({
        hero: {
          active: true,
          eyebrow: "PENDAFTARAN DIBUKA",
          title: "Olimpiade Sains Nusantara 2026",
          description: "Ajang talenta akademik bergengsi untuk siswa SD, SMP, dan SMA se-Indonesia. Asah kemampuan, raih prestasi, dan jadilah yang terbaik di tingkat nasional.",
          image: "../../../template/assets/images/garuda.png",
          imageAlt: "Garuda Logo",
          badges: [
            { label: "SD / MI", active: true },
            { label: "SMP / MTs", active: true },
            { label: "SMA / MA / SMK", active: true }
          ],
          buttons: [
            { label: "Daftar Sekarang", url: "#", style: "primary", active: true, iconMode: "library", libraryIcon: "arrow-right" },
            { label: "Unduh Juknis", url: "#", style: "outline", active: true, iconMode: "library", libraryIcon: "download" }
          ]
        },
        winnerHighlight: {
          active: true,
          eyebrow: "PENGUMUMAN",
          title: "Selamat Kepada Para Pemenang!",
          description: "Berikut adalah pemenang ajang talenta nasional tahun ini.",
          background: "navy",
          alignment: "center"
        }
      }));
    })()`,
  );

  const cases = [
    ["desktop", 1440],
    ["tablet", 768],
    ["mobile", 390],
  ];

  for (const [mode, width] of cases) {
    await setViewport(client, width);
    await navigate(client, `${origin}/apps/template/`, "#hero .hero__badge");
    await evaluate(
      client,
      `(async () => {
        document.querySelector("#mitra").scrollIntoView();
        const images = [...document.querySelectorAll("#mitra img")];
        images.forEach(image => image.loading = "eager");
        await Promise.all(images.map(image =>
          image.complete
            ? Promise.resolve()
            : Promise.race([
                new Promise(resolve => {
                  image.addEventListener("load", resolve, { once: true });
                  image.addEventListener("error", resolve, { once: true });
                }),
                new Promise(resolve => setTimeout(resolve, 2000))
              ])
        ));
      })()`,
    );
    const templateHero = await readHero(client, "#hero");
    const templateWinner = await readWinner(client, "#pemenang-highlight");
    const templateSchedule = await readSchedule(client, "#jadwal");
    const templatePricing = await readPricing(client, "#biaya");
    const templateBenefit = await readBenefit(client, "#benefit");
    const templatePartners = await readPartners(client, "#mitra");

    await setViewport(client, 1600, 1200);
    await navigate(
      client,
      `${origin}/apps/admin/editors/beranda/?embedded=1`,
      "#homePreview .hero__badge",
    );
    const pricingEditorAudit = await evaluate(
      client,
      `(() => {
        const editor = document.querySelector("#pricing-editor");
        const text = editor.textContent;
        return {
          hasActionEditor: Boolean(document.querySelector("#pricingActionEditor")),
          hasPackageIconControl: Boolean(
            document.querySelector("#pricingPackageEditor .icon-control")
          ),
          hasOptionalHeading: Boolean(
            document.querySelector("#pricingTitle, #pricingDescription")
          ),
          forbiddenLabels: [
            "Judul opsional",
            "Deskripsi opsional",
            "Harga lama",
            "Label promo",
            "Catatan paket",
            "Tombol aksi opsional"
          ].filter(label => text.includes(label))
        };
      })()`,
    );
    assert.deepEqual(
      pricingEditorAudit,
      {
        hasActionEditor: false,
        hasPackageIconControl: false,
        hasOptionalHeading: false,
        forbiddenLabels: [],
      },
      `${mode}: editor Biaya masih memuat kontrol yang dihapus`,
    );
    const simplifiedEditorAudit = await evaluate(
      client,
      `(() => {
        const benefit = document.querySelector("#benefit-editor").textContent;
        const partner = document.querySelector("#partner-editor").textContent;
        return {
          benefitForbidden: [
            "Label kecil opsional",
            "Kartu unggulan"
          ].filter(label => benefit.includes(label)),
          partnerForbidden: [
            "Deskripsi opsional",
            "Label opsional",
            "Kategori",
            "Tampilkan kategori mitra"
          ].filter(label => partner.includes(label)),
          removedIds: [
            "partnerDescription",
            "partnerShowCategories"
          ].filter(id => document.getElementById(id))
        };
      })()`,
    );
    assert.deepEqual(
      simplifiedEditorAudit,
      {
        benefitForbidden: [],
        partnerForbidden: [],
        removedIds: [],
      },
      `${mode}: editor Benefit/Mitra masih memuat kontrol yang dihapus`,
    );
    await evaluate(
      client,
      `(async () => {
        const frame = document.querySelector("#homePreviewFrame");
        frame.className = "home-preview-frame home-preview-frame--${mode}";
        frame.dataset.previewMode = "${mode}";
        await new Promise(resolve => requestAnimationFrame(resolve));
        await Promise.all(
          [...document.querySelectorAll("#homePreview img")].map(image =>
            image.decode?.().catch(() => undefined)
          )
        );
        fitHeroPreview();
        fitScaledPreview("winnerPreviewFrame");
        fitScaledPreview("schedulePreviewFrame");
        fitScaledPreview("pricingPreviewFrame");
        fitScaledPreview("benefitPreviewFrame");
        fitScaledPreview("partnerPreviewFrame");
        await new Promise(resolve => requestAnimationFrame(resolve));
        fitHeroPreview();
        fitScaledPreview("winnerPreviewFrame");
        fitScaledPreview("schedulePreviewFrame");
        fitScaledPreview("pricingPreviewFrame");
        fitScaledPreview("benefitPreviewFrame");
        fitScaledPreview("partnerPreviewFrame");
        await new Promise(resolve => requestAnimationFrame(resolve));
      })()`,
    );
    const frameFit = await evaluate(
      client,
      `(() => {
        const frame = document.querySelector("#homePreviewFrame");
        const root = document.querySelector("#homePreview");
        const frameStyle = getComputedStyle(frame);
        const matrix = new DOMMatrixReadOnly(getComputedStyle(root).transform);
        const verticalPadding =
          parseFloat(frameStyle.paddingTop) + parseFloat(frameStyle.paddingBottom);
        return {
          overflowX: frameStyle.overflowX,
          scale: matrix.a || 1,
          inlineHeight: frame.style.height,
          frameWidth: frame.clientWidth,
          rootWidth: root.offsetWidth,
          rootHeight: root.offsetHeight,
          mode: frame.dataset.previewMode,
          fittedHeight: frame.clientHeight - verticalPadding,
          expectedHeight: root.offsetHeight * (matrix.a || 1)
        };
      })()`,
    );
    assert.equal(frameFit.overflowX, "hidden", `${mode}: scrollbar horizontal`);
    assert(
      frameFit.scale > 0 && frameFit.scale <= 1,
      `${mode}: skala preview tidak valid`,
    );
    assert(
      Math.abs(frameFit.fittedHeight - frameFit.expectedHeight) <= 1,
      `${mode}: tinggi frame ${frameFit.fittedHeight}px tidak mengikuti hasil skala ${frameFit.expectedHeight}px (${JSON.stringify(frameFit)})`,
    );
    const previewHero = await readHero(client, "#homePreview");
    compareHero(templateHero, previewHero, mode);
    const winnerFrameFit = await evaluate(
      client,
      `(() => {
        const frame = document.querySelector("#winnerPreviewFrame");
        const root = document.querySelector("#winnerPreview");
        frame.className = "winner-preview-frame winner-preview-frame--${mode}";
        frame.dataset.previewMode = "${mode}";
        fitScaledPreview("winnerPreviewFrame");
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
    await evaluate(
      client,
      `(async () => {
        fitScaledPreview("winnerPreviewFrame");
        await new Promise(resolve => requestAnimationFrame(resolve));
      })()`,
    );
    assert.equal(
      winnerFrameFit.overflowX,
      "hidden",
      `${mode}: scrollbar horizontal Highlight`,
    );
    assert(
      winnerFrameFit.scale > 0 && winnerFrameFit.scale <= 1,
      `${mode}: skala Highlight tidak valid`,
    );
    assert(
      Math.abs(winnerFrameFit.fittedHeight - winnerFrameFit.expectedHeight) <=
        1,
      `${mode}: tinggi frame Highlight tidak mengikuti skala`,
    );
    const previewWinner = await readWinner(client, "#winnerPreview");
    compareSection(templateWinner, previewWinner, mode, "Highlight");
    const scheduleFrameFit = await evaluate(
      client,
      `(() => {
        const frame = document.querySelector("#schedulePreviewFrame");
        const root = document.querySelector("#schedulePreview");
        frame.className = "schedule-preview-frame schedule-preview-frame--${mode}";
        frame.dataset.previewMode = "${mode}";
        fitScaledPreview("schedulePreviewFrame");
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
      scheduleFrameFit.overflowX,
      "hidden",
      `${mode}: scrollbar horizontal Jadwal`,
    );
    assert(
      scheduleFrameFit.scale > 0 && scheduleFrameFit.scale <= 1,
      `${mode}: skala Jadwal tidak valid`,
    );
    assert(
      Math.abs(
        scheduleFrameFit.fittedHeight - scheduleFrameFit.expectedHeight,
      ) <= 1,
      `${mode}: tinggi frame Jadwal tidak mengikuti skala`,
    );
    const previewSchedule = await readSchedule(client, "#schedulePreview");
    compareSection(templateSchedule, previewSchedule, mode, "Jadwal");
    const pricingFrameFit = await evaluate(
      client,
      `(() => {
        const frame = document.querySelector("#pricingPreviewFrame");
        const root = document.querySelector("#pricingPreview");
        frame.className = "pricing-preview-frame pricing-preview-frame--${mode}";
        frame.dataset.previewMode = "${mode}";
        fitScaledPreview("pricingPreviewFrame");
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
      pricingFrameFit.overflowX,
      "hidden",
      `${mode}: scrollbar horizontal Biaya`,
    );
    assert(
      pricingFrameFit.scale > 0 && pricingFrameFit.scale <= 1,
      `${mode}: skala Biaya tidak valid`,
    );
    assert(
      Math.abs(pricingFrameFit.fittedHeight - pricingFrameFit.expectedHeight) <=
        1,
      `${mode}: tinggi frame Biaya tidak mengikuti skala`,
    );
    const previewPricing = await readPricing(client, "#pricingPreview");
    compareSection(templatePricing, previewPricing, mode, "Biaya");
    const benefitFrameFit = await evaluate(
      client,
      `(() => {
        const frame = document.querySelector("#benefitPreviewFrame");
        const root = document.querySelector("#benefitPreview");
        frame.className = "benefit-preview-frame benefit-preview-frame--${mode}";
        frame.dataset.previewMode = "${mode}";
        fitScaledPreview("benefitPreviewFrame");
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
      benefitFrameFit.overflowX,
      "hidden",
      `${mode}: scrollbar horizontal Benefit`,
    );
    assert(
      benefitFrameFit.scale > 0 && benefitFrameFit.scale <= 1,
      `${mode}: skala Benefit tidak valid`,
    );
    assert(
      Math.abs(benefitFrameFit.fittedHeight - benefitFrameFit.expectedHeight) <=
        1,
      `${mode}: tinggi frame Benefit tidak mengikuti skala`,
    );
    const previewBenefit = await readBenefit(client, "#benefitPreview");
    compareSection(templateBenefit, previewBenefit, mode, "Benefit");
    if (mode === "mobile") {
      assert.equal(
        templateBenefit.grid.style.gridTemplateColumns.split(" ").length,
        2,
        "mobile: Template Benefit harus dua kolom",
      );
      assert.equal(
        previewBenefit.grid.style.gridTemplateColumns.split(" ").length,
        2,
        "mobile: preview Benefit harus dua kolom",
      );
    }
    const partnerFrameFit = await evaluate(
      client,
      `(() => {
        const frame = document.querySelector("#partnerPreviewFrame");
        const root = document.querySelector("#partnerPreview");
        frame.className = "partner-preview-frame partner-preview-frame--${mode}";
        frame.dataset.previewMode = "${mode}";
        fitScaledPreview("partnerPreviewFrame");
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
      partnerFrameFit.overflowX,
      "hidden",
      `${mode}: scrollbar horizontal Mitra`,
    );
    assert(
      partnerFrameFit.scale > 0 && partnerFrameFit.scale <= 1,
      `${mode}: skala Mitra tidak valid`,
    );
    assert(
      Math.abs(partnerFrameFit.fittedHeight - partnerFrameFit.expectedHeight) <=
        1,
      `${mode}: tinggi frame Mitra tidak mengikuti skala`,
    );
    const previewPartners = await readPartners(client, "#partnerPreview");
    compareSection(templatePartners, previewPartners, mode, "Mitra");
  }

  client.close();
  console.log(
    "PASS: seluruh section Beranda identik dengan Template pada desktop 1440px, tablet 768px, dan mobile 390px.",
  );
} finally {
  edge.kill();
  const resolvedProfile = resolve(profilePath);
  assert(
    resolvedProfile.startsWith(resolve(tmpdir())) &&
      basename(resolvedProfile).startsWith("talenta-hero-parity-"),
    "Target pembersihan profil browser tidak aman",
  );
  await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  await rm(resolvedProfile, {
    recursive: true,
    force: true,
    maxRetries: 8,
    retryDelay: 250,
  });
}
