import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const origin = process.env.TALENTA_TEST_ORIGIN || "http://127.0.0.1:4173";
const edgePath =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const debugPort = 9344;
const profilePath = await mkdtemp(join(tmpdir(), "talenta-winner-layout-"));

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
    throw new Error(
      result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text ||
        "Evaluasi browser gagal",
    );
  return result.result.value;
}

async function setViewport(client, width, height = 1200) {
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

const fixtureExpression = (rootSelector) => `
  (async () => {
    const root = document.querySelector(${JSON.stringify(rootSelector)});
    const validDesign = ${JSON.stringify(`${origin}/apps/public-site/assets/images/garuda.png`)};
    const source = {
      manager: {
        categories: [{
          name: "Kategori Audit",
          icon: "trophy",
          winners: [
            {
              displayMode: "built_in",
              rank: "Juara 1",
              name: "Pemenang Audit",
              school: "Sekolah Audit",
              exam: "001",
              regency: "Kabupaten Audit",
              province: "Provinsi Audit",
              photo: validDesign
            },
            {
              displayMode: "custom",
              rank: "Juara 2",
              design: validDesign
            },
            {
              displayMode: "custom",
              rank: "Juara 3",
              design: ${JSON.stringify(`${origin}/missing-winner-design.png`)}
            }
          ]
        }],
        sk: null
      },
      page: {
        active: true,
        eyebrow: "AUDIT",
        title: "Daftar Pemenang",
        description: "Audit layout responsif.",
        alignment: "left",
        showSk: false,
        showPhoto: true,
        showSchool: true,
        showExam: true,
        showRegency: true,
        showProvince: true,
        archiveActive: false
      },
      archives: []
    };
    root.innerHTML = buildWinnerPageMarkup(source, {
      resolveAsset: value => value || ""
    });
    activateWinnerCardFallbacks(root);
    root.scrollIntoView({ block: "start" });
    const images = [...root.querySelectorAll("img")];
    await Promise.all(images.map(image => image.complete
      ? Promise.resolve()
      : Promise.race([
          new Promise(resolve => {
            image.addEventListener("load", resolve, { once: true });
            image.addEventListener("error", resolve, { once: true });
          }),
          new Promise(resolve => setTimeout(resolve, 2000))
        ])
    ));
    await new Promise(resolve => requestAnimationFrame(resolve));
  })()
`;

async function inspect(client, rootSelector) {
  return evaluate(
    client,
    `(() => {
      const root = document.querySelector(${JSON.stringify(rootSelector)});
      const container = root.querySelector(":scope > .container");
      const grid = root.querySelector(".champion-grid");
      const cards = [...grid.querySelectorAll(":scope > .champion-card")];
      const validCard = cards[1];
      const brokenCard = cards[2];
      const validImage = validCard.querySelector(".champion-card__design");
      const fallback = card => getComputedStyle(card.querySelector(".champion-card__fallback")).visibility;
      const rect = element => {
        const value = element.getBoundingClientRect();
        return {
          left: value.left,
          right: value.right,
          width: value.width,
          height: value.height
        };
      };
      const rows = new Set(cards.map(card => Math.round(card.getBoundingClientRect().top)));
      return {
        viewport: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        rootWidth: root.scrollWidth,
        rootClientWidth: root.clientWidth,
        container: rect(container),
        grid: rect(grid),
        columns: cards.length / rows.size,
        cards: cards.map(rect),
        customPadding: getComputedStyle(validCard).padding,
        customChildren: [...validCard.children].map(child => child.className),
        validReady: validCard.classList.contains("is-image-ready"),
        validFallback: fallback(validCard),
        brokenFallback: fallback(brokenCard),
        brokenHasImage: Boolean(brokenCard.querySelector(".champion-card__design")),
        image: validImage && {
          ...rect(validImage),
          objectFit: getComputedStyle(validImage).objectFit,
          objectPosition: getComputedStyle(validImage).objectPosition
        }
      };
    })()`,
  );
}

function assertLayout(
  layout,
  expectedColumns,
  label,
  requireDocumentFit = true,
) {
  if (requireDocumentFit)
    assert.equal(
      layout.documentWidth,
      layout.viewport,
      `${label}: halaman memiliki overflow horizontal`,
    );
  assert(
    layout.rootWidth <= layout.rootClientWidth + 1,
    `${label}: root Pemenang overflow horizontal`,
  );
  assert.equal(layout.columns, expectedColumns, `${label}: jumlah kolom`);
  layout.cards.forEach((card, index) =>
    assert(
      Math.abs(card.width - card.height) <= 1,
      `${label}: pemenang ${index + 1} tidak 1:1 (${card.width}x${card.height})`,
    ),
  );
  assert(
    layout.grid.left >= layout.container.left,
    `${label}: grid keluar kiri`,
  );
  assert(
    layout.grid.right <= layout.container.right + 1,
    `${label}: grid keluar kanan`,
  );
  if (expectedColumns === 3) {
    assert(
      layout.grid.left > layout.container.left,
      `${label}: inset responsif kiri tidak ada`,
    );
    assert(
      layout.grid.right < layout.container.right,
      `${label}: inset responsif kanan tidak ada`,
    );
  }
  assert.equal(layout.customPadding, "0px", `${label}: custom punya padding`);
  assert.deepEqual(
    layout.customChildren,
    ["champion-card__fallback", "champion-card__design"],
    `${label}: custom memuat overlay sistem`,
  );
  assert.equal(layout.validReady, true, `${label}: gambar valid tidak aktif`);
  assert.equal(
    layout.validFallback,
    "hidden",
    `${label}: fallback valid terlihat`,
  );
  assert.equal(
    layout.brokenFallback,
    "visible",
    `${label}: fallback gagal hilang`,
  );
  assert.equal(
    layout.brokenHasImage,
    false,
    `${label}: gambar gagal tidak dibuang`,
  );
  assert.equal(layout.image.objectFit, "cover", `${label}: crop bukan cover`);
  assert.equal(
    layout.image.objectPosition,
    "50% 50%",
    `${label}: crop bukan dari tengah`,
  );
  assert(
    Math.abs(layout.image.width - layout.cards[1].width) <= 2.1 &&
      Math.abs(layout.image.height - layout.cards[1].height) <= 2.1,
    `${label}: desain custom tidak memenuhi kartu (${JSON.stringify({ image: layout.image, card: layout.cards[1] })})`,
  );
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
    `${origin}/apps/public-site/pemenang/`,
  ],
  { stdio: "ignore", windowsHide: true },
);

let client;
try {
  const targets = await waitForEndpoint(
    `http://127.0.0.1:${debugPort}/json/list`,
  );
  const page = targets.find((target) => target.type === "page");
  assert(page, "Target halaman Edge tidak ditemukan");
  client = new CdpClient(page.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");

  for (const [mode, width, columns] of [
    ["desktop", 1440, 3],
    ["tablet", 768, 3],
    ["mobile", 390, 1],
  ]) {
    await setViewport(client, width);
    await navigate(client, `${origin}/apps/public-site/pemenang/`, "#pemenang");
    await evaluate(client, fixtureExpression("#pemenang"));
    assertLayout(await inspect(client, "#pemenang"), columns, `Public ${mode}`);
  }

  await setViewport(client, 1600, 1400);
  await navigate(
    client,
    `${origin}/apps/admin/editors/pemenang/?embedded=1`,
    "#wmPreview",
  );
  for (const [mode, columns] of [
    ["desktop", 3],
    ["tablet", 3],
    ["mobile", 1],
  ]) {
    await evaluate(
      client,
      `(() => {
        const frame = document.querySelector("#wmPreviewFrame");
        frame.dataset.previewMode = ${JSON.stringify(mode)};
        frame.classList.remove("wm-preview-frame--tablet", "wm-preview-frame--mobile");
        if (${JSON.stringify(mode)} !== "desktop")
          frame.classList.add("wm-preview-frame--" + ${JSON.stringify(mode)});
      })()`,
    );
    await evaluate(client, fixtureExpression("#wmPreview"));
    await evaluate(
      client,
      `(async () => {
        fitWinnerPreview();
        await new Promise(resolve => requestAnimationFrame(resolve));
      })()`,
    );
    assertLayout(
      await inspect(client, "#wmPreview"),
      columns,
      `Preview Admin ${mode}`,
      false,
    );
  }

  const controlLayout = await evaluate(
    client,
    `(() => {
      const fixture = document.createElement("div");
      fixture.className = "wm-winner-card__form admin-form-grid";
      fixture.style.width = "620px";
      fixture.innerHTML = '<fieldset class="wm-display-mode-selector"><legend>Jenis tampilan</legend><div class="wm-display-mode-selector__options"><label><input type="radio" name="audit-mode" value="built_in"><span>Gunakan desain bawaan</span></label><label><input type="radio" name="audit-mode" value="custom"><span>Unggah desain sendiri</span></label></div></fieldset><div class="admin-field admin-field--wide"><label>Desain sendiri</label><label class="wm-custom-design-upload"><span class="wm-custom-design-upload__content"><i data-lucide="image-up"></i><strong>Unggah gambar</strong><span>JPG, PNG, atau WebP</span></span></label></div>';
      lucide.createIcons({ nodes: [fixture] });
      document.body.appendChild(fixture);
      const custom = fixture.querySelector('[value="custom"]');
      custom.click();
      const upload = fixture.querySelector(".wm-custom-design-upload");
      const content = fixture.querySelector(".wm-custom-design-upload__content");
      const field = upload.closest(".admin-field");
      const rect = upload.getBoundingClientRect();
      const fieldRect = field.getBoundingClientRect();
      const uploadStyle = getComputedStyle(upload);
      const contentStyle = getComputedStyle(content);
      const centers = [...content.children].map(child => {
        const childRect = child.getBoundingClientRect();
        return childRect.left + childRect.width / 2;
      });
      const result = {
        checked: custom.checked,
        squareDifference: Math.abs(rect.width - rect.height),
        documentWidth: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
        direction: contentStyle.flexDirection,
        alignment: contentStyle.alignItems,
        uploadJustification: uploadStyle.justifyContent,
        uploadCenter: rect.left + rect.width / 2,
        uploadMiddle: rect.top + rect.height / 2,
        uploadLeft: rect.left,
        fieldLeft: fieldRect.left,
        contentMiddle: (() => {
          const value = content.getBoundingClientRect();
          return value.top + value.height / 2;
        })(),
        centers
      };
      fixture.remove();
      return result;
    })()`,
  );
  assert.equal(controlLayout.checked, true, "Radio custom tidak dapat dipilih");
  assert(
    controlLayout.squareDifference <= 1,
    "Area upload desain Admin tidak 1:1",
  );
  assert.equal(
    controlLayout.documentWidth,
    controlLayout.viewport,
    "Editor Admin overflow horizontal",
  );
  assert.equal(
    controlLayout.direction,
    "column",
    "Isi upload tidak tersusun vertikal",
  );
  assert.equal(
    controlLayout.alignment,
    "center",
    "Isi upload tidak rata tengah",
  );
  assert.equal(
    controlLayout.uploadJustification,
    "center",
    "Isi upload tidak berada di tengah horizontal",
  );
  assert(
    Math.abs(controlLayout.uploadLeft - controlLayout.fieldLeft) <= 1,
    "Area upload harus tetap rata kiri seperti posisi awal",
  );
  assert(
    Math.abs(controlLayout.contentMiddle - controlLayout.uploadMiddle) <= 1,
    "Isi upload tidak berada di tengah vertikal",
  );
  controlLayout.centers.forEach((center, index) =>
    assert(
      Math.abs(center - controlLayout.uploadCenter) <= 1,
      `Elemen upload ${index + 1} tidak di tengah`,
    ),
  );

  const compression = await evaluate(
    client,
    `(async () => {
      const canvasFile = async (
        width,
        height,
        noisy,
        name,
        type = "image/png",
        quality,
      ) => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (noisy) {
          const image = context.createImageData(width, height);
          let seed = 123456789;
          for (let index = 0; index < image.data.length; index += 4) {
            seed = (1664525 * seed + 1013904223) >>> 0;
            image.data[index] = seed & 255;
            image.data[index + 1] = (seed >>> 8) & 255;
            image.data[index + 2] = (seed >>> 16) & 255;
            image.data[index + 3] = 255;
          }
          context.putImageData(image, 0, 0);
        } else {
          context.fillStyle = "#123456";
          context.fillRect(0, 0, width, height);
        }
        const blob = await new Promise(resolve =>
          canvas.toBlob(resolve, type, quality)
        );
        return new File([blob], name, { type: blob.type });
      };
      let source = await canvasFile(1080, 1080, true, "besar.jpg", "image/jpeg", 0.96);
      if (source.size > TalentaMedia.LIMITS.customDesign) {
        source = new File(
          [source.slice(0, TalentaMedia.LIMITS.customDesign)],
          source.name,
          { type: source.type }
        );
      }
      const compressed = await TalentaMedia.compressCustomDesign(source);
      const bitmap = await createImageBitmap(compressed);
      const small = await canvasFile(16, 16, false, "kecil.png");
      const retained = await TalentaMedia.compressCustomDesign(small);
      const efficientOriginal = await canvasFile(
        1080,
        1080,
        false,
        "efisien.webp",
        "image/webp",
        0.8,
      );
      const efficientResult = await TalentaMedia.compressCustomDesign(efficientOriginal);
      let oversizedError = "";
      try {
        await TalentaMedia.compressCustomDesign(
          new File(
            [source, new Uint8Array(TalentaMedia.LIMITS.customDesign + 1)],
            "terlalu-besar.jpg",
            { type: "image/jpeg" },
          ),
        );
      } catch (error) {
        oversizedError = error.message;
      }
      return {
        sourceLimit: TalentaMedia.LIMITS.customDesign,
        target: TalentaMedia.LIMITS.customDesignTarget,
        outputLimit: TalentaMedia.LIMITS.customDesignOutput,
        sourceSize: source.size,
        size: compressed.size,
        type: compressed.type,
        width: bitmap.width,
        height: bitmap.height,
        smallSourceSize: small.size,
        smallSize: retained.size,
        smallRetained: retained === small,
        efficientSourceSize: efficientOriginal.size,
        efficientSize: efficientResult.size,
        efficientRetained: efficientResult === efficientOriginal,
        oversizedError
      };
    })()`,
  );
  assert.equal(
    compression.sourceLimit,
    2 * 1024 * 1024,
    "Batas sumber desain bukan 2 MB",
  );
  assert.equal(
    compression.target,
    400 * 1024,
    "Target kompresi bukan 400 KB",
  );
  assert.equal(
    compression.outputLimit,
    500 * 1024,
    "Batas hasil kompresi bukan 500 KB",
  );
  assert(
    compression.sourceSize <= compression.sourceLimit &&
      compression.sourceSize > compression.outputLimit,
    `Fixture sumber tidak berada antara 500 KB dan 2 MB: ${compression.sourceSize}`,
  );
  assert(
    compression.size <= compression.target,
    `Hasil kompresi tidak mencapai target 400 KB: ${compression.size}`,
  );
  assert(
    compression.size <= compression.outputLimit,
    `Hasil kompresi melebihi 500 KB: ${compression.size}`,
  );
  assert.equal(compression.type, "image/webp", "Hasil kompresi bukan WebP");
  assert(
    compression.width <= 1080,
    `Lebar hasil melebihi 1080 px: ${compression.width}`,
  );
  assert.equal(
    compression.height,
    compression.width,
    "Rasio hasil kompresi berubah",
  );
  assert.equal(
    compression.smallRetained,
    true,
    `File kecil diperbesar (${compression.smallSourceSize} menjadi ${compression.smallSize})`,
  );
  assert.equal(
    compression.efficientRetained,
    true,
    `File asli efisien tidak dipertahankan (${compression.efficientSourceSize} menjadi ${compression.efficientSize})`,
  );
  assert.match(
    compression.oversizedError,
    /maksimum 2 MB/,
    "Sumber di atas 2 MB tidak ditolak",
  );

  console.log(
    "PASS: layout Pemenang 1/3/3, kartu 1:1, crop tengah, fallback gambar, sumber maksimal 2 MB, target kompresi 400 KB, hasil maksimal 500 KB, isi uploader terpusat dan kotak rata kiri, inset, preview Admin, dan overflow tervalidasi pada 390px, 768px, dan 1440px.",
  );
} finally {
  client?.close();
  edge.kill();
  await new Promise((resolveWait) => setTimeout(resolveWait, 300));
  await rm(profilePath, { recursive: true, force: true, maxRetries: 4 });
}
